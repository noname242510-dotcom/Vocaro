
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { VerifiedAuthenticationResponse, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { firestoreAdmin, authAdmin } from '@/lib/firebase-admin';
import type { Authenticator } from '@/lib/types';

const RP_ID = process.env.NODE_ENV === 'development' ? 'localhost' : (new URL(process.env.NEXT_PUBLIC_BASE_URL!)).hostname;
const ORIGIN = process.env.NEXT_PUBLIC_BASE_URL || `https://${RP_ID}`;

export async function POST(request: NextRequest) {
    const body: AuthenticationResponseJSON & { username: string, challengeId?: string } = await request.json();
    const { username, challengeId } = body;
    const email = `${username}@vocaro.app`;

    let userRecord;
    try {
        userRecord = await authAdmin.getUserByEmail(email);
    } catch (error) {
        return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }
    const userId = userRecord.uid;

    // 1. Hole die gespeicherte Challenge
    // Wenn keine challengeId übergeben wird, versuchen wir, die letzte Challenge des Benutzers zu finden.
    // Dies ist ein Fallback und sollte in Produktion robuster sein.
    const challengeQuery = challengeId 
        ? firestoreAdmin.collection('passkeyChallenges').doc(challengeId)
        : firestoreAdmin.collection('passkeyChallenges').where('username', '==', username).orderBy('expires', 'desc').limit(1);

    const challengeSnapshot = await challengeQuery.get();
    
    let challengeDoc: FirebaseFirestore.DocumentSnapshot | undefined;
    if ('docs' in challengeSnapshot) { // QuerySnapshot
        if (challengeSnapshot.empty) {
            return NextResponse.json({ error: 'Challenge nicht gefunden oder abgelaufen.' }, { status: 400 });
        }
        challengeDoc = challengeSnapshot.docs[0];
    } else { // DocumentSnapshot
        challengeDoc = challengeSnapshot as FirebaseFirestore.DocumentSnapshot;
    }


    if (!challengeDoc || !challengeDoc.exists) {
        return NextResponse.json({ error: 'Challenge nicht gefunden oder abgelaufen.' }, { status: 400 });
    }
    const { challenge } = challengeDoc.data()!;

    // 2. Hole den passenden Authenticator des Benutzers aus Firestore
    const authenticatorDoc = await firestoreAdmin
        .collection('users').doc(userId)
        .collection('authenticators').doc(body.id).get();

    if (!authenticatorDoc.exists) {
        return NextResponse.json({ error: 'Passkey nicht für diesen Benutzer registriert.' }, { status: 404 });
    }
    const authenticator = authenticatorDoc.data() as Authenticator;
    
    // 3. Verifiziere die Antwort
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
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { verified, authenticationInfo } = verification;
    
    if (verified) {
        // 4. Update den Counter in Firestore
        await authenticatorDoc.ref.update({
            counter: authenticationInfo.newCounter,
        });

        // Lösche die Challenge
        await challengeDoc.ref.delete();

        // 5. Erstelle Custom Token
        const customToken = await authAdmin.createCustomToken(userId);

        return NextResponse.json({ verified: true, customToken });
    }

    return NextResponse.json({ verified: false }, { status: 400 });
}
