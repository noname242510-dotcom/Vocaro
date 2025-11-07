
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { VerifiedAuthenticationResponse, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { firestoreAdmin, authAdmin } from '@/lib/firebase-admin';
import type { Authenticator } from '@/lib/types';

const RP_ID = process.env.NODE_ENV === 'development' ? 'localhost' : 'vocaro-vocab.vercel.app';
const ORIGIN = process.env.NODE_ENV === 'development' ? `http://${RP_ID}:9002` : `https://${RP_ID}`;

export async function POST(request: NextRequest) {
    const body: AuthenticationResponseJSON & { challengeId: string } = await request.json();
    const { challengeId } = body;

    // 1. Hole die Challenge aus Firestore
    if (!challengeId) {
        return NextResponse.json({ error: 'ChallengeID fehlt.' }, { status: 400 });
    }
    const challengeRef = firestoreAdmin.collection('passkeyChallenges').doc(challengeId);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists || (challengeDoc.data()!.expires < Date.now())) {
        await challengeDoc.ref.delete().catch(() => {});
        return NextResponse.json({ error: 'Challenge nicht gefunden oder abgelaufen.' }, { status: 400 });
    }
    const { challenge } = challengeDoc.data()!;
    
    // Der `userHandle` aus dem Passkey ist unser gespeicherter Benutzername
    const userHandle = body.response.userHandle;
    if (!userHandle) {
        return NextResponse.json({ error: 'userHandle im Passkey nicht gefunden. Kann Benutzer nicht identifizieren.' }, { status: 400 });
    }
    const email = `${userHandle}@vocaro.app`;

    // 2. Hole den Benutzer aus Firebase Auth
    let userRecord;
    try {
        userRecord = await authAdmin.getUserByEmail(email);
    } catch (error) {
        return NextResponse.json({ error: `Benutzer '${userHandle}' nicht gefunden.` }, { status: 404 });
    }
    const userId = userRecord.uid;

    // 3. Hole den spezifischen Authenticator, der für diesen Login verwendet wurde
    // Die `id` aus dem Request-Body ist die credentialID im base64url-Format
    const authenticatorDoc = await firestoreAdmin
        .collection('users').doc(userId)
        .collection('authenticators').doc(body.id).get();

    if (!authenticatorDoc.exists) {
        return NextResponse.json({ error: 'Dieser Passkey ist nicht für den Benutzer registriert.' }, { status: 404 });
    }
    const authenticator = authenticatorDoc.data() as Authenticator;
    
    // 4. Verifiziere die Authentifizierungs-Antwort
    let verification: VerifiedAuthenticationResponse;
    try {
        verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: challenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            authenticator: {
                credentialID: Buffer.from(authenticator.credentialID, 'base64'),
                credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, 'base64'),
                counter: authenticator.counter,
                transports: authenticator.transports,
            },
            requireUserVerification: true,
        });
    } catch (error: any) {
        console.error("verifyAuthenticationResponse error:", error);
        return NextResponse.json({ error: `Verifizierung fehlgeschlagen: ${error.message}` }, { status: 400 });
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
        // 5. Update den Zähler des Authenticators
        await authenticatorDoc.ref.update({
            counter: authenticationInfo.newCounter,
        });
        
        // Lösche die verbrauchte Challenge
        await challengeDoc.ref.delete();

        // 6. Erstelle Custom Token für den Login
        const customToken = await authAdmin.createCustomToken(userId);

        return NextResponse.json({ verified: true, customToken });
    }

    return NextResponse.json({ verified: false, error: 'Unbekannter Verifizierungsfehler.' }, { status: 400 });
}
