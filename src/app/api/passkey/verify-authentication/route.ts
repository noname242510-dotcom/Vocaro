
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { VerifiedAuthenticationResponse, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { firestoreAdmin, authAdmin } from '@/lib/firebase-admin';
import type { Authenticator } from '@/lib/types';

const RP_ID = process.env.NODE_ENV === 'development' ? 'localhost' : (new URL(process.env.NEXT_PUBLIC_BASE_URL!)).hostname;

export async function POST(request: NextRequest) {
    const body: AuthenticationResponseJSON & { username: string, challengeId: string } = await request.json();
    const { username, challengeId } = body;
    const email = `${username}@vocaro.app`;

    if (!challengeId) {
        return NextResponse.json({ error: 'ChallengeID fehlt in der Anfrage.' }, { status: 400 });
    }

    let userRecord;
    try {
        userRecord = await authAdmin.getUserByEmail(email);
    } catch (error) {
        return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }
    const userId = userRecord.uid;

    const challengeRef = firestoreAdmin.collection('passkeyChallenges').doc(challengeId);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists || (challengeDoc.data()!.expires < Date.now())) {
        return NextResponse.json({ error: 'Challenge nicht gefunden oder abgelaufen.' }, { status: 400 });
    }
    const { challenge } = challengeDoc.data()!;

    // userHandle aus der Antwort ist der Benutzername, der im Passkey gespeichert ist.
    // Wir verwenden diesen, um den richtigen Authenticator zu finden.
    const authenticatorDoc = await firestoreAdmin
        .collection('users').doc(userId)
        .collection('authenticators').doc(body.id).get();

    if (!authenticatorDoc.exists) {
        return NextResponse.json({ error: 'Passkey nicht für diesen Benutzer registriert.' }, { status: 404 });
    }
    const authenticator = authenticatorDoc.data() as Authenticator;
    
    const expectedOrigin = process.env.NEXT_PUBLIC_BASE_URL || `https://${request.headers.get('host')}`;

    let verification: VerifiedAuthenticationResponse;
    try {
        verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: challenge,
            expectedOrigin: expectedOrigin,
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
        return NextResponse.json({ verified: false, error: `Verifizierung fehlgeschlagen: ${error.message}` }, { status: 400 });
    }

    const { verified, authenticationInfo } = verification;
    
    if (verified) {
        await authenticatorDoc.ref.update({
            counter: authenticationInfo.newCounter,
        });

        await challengeDoc.ref.delete();

        const customToken = await authAdmin.createCustomToken(userId);

        return NextResponse.json({ verified: true, customToken });
    }

    return NextResponse.json({ verified: false, error: 'Die Passkey-Verifizierung ist fehlgeschlagen.' }, { status: 400 });
}
