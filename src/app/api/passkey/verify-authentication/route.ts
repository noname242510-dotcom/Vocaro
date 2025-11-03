
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { VerifiedAuthenticationResponse, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { firestoreAdmin, authAdmin } from '@/lib/firebase-admin';
import type { Authenticator } from '@/lib/types';

const RP_ID = process.env.NODE_ENV === 'development' ? 'localhost' : (new URL(process.env.NEXT_PUBLIC_BASE_URL!)).hostname;

export async function POST(request: NextRequest) {
    const body: AuthenticationResponseJSON & { challengeId: string } = await request.json();
    const { challengeId } = body;

    // 1. Get the challenge from Firestore
    if (!challengeId) {
        return NextResponse.json({ error: 'ChallengeID fehlt.' }, { status: 400 });
    }
    const challengeRef = firestoreAdmin.collection('passkeyChallenges').doc(challengeId);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists || (challengeDoc.data()!.expires < Date.now())) {
        return NextResponse.json({ error: 'Challenge nicht gefunden oder abgelaufen.' }, { status: 400 });
    }
    const { challenge } = challengeDoc.data()!;
    
    // This is the username stored in the passkey itself.
    const userHandle = body.response.userHandle;
    if (!userHandle) {
        return NextResponse.json({ error: 'userHandle im Passkey nicht gefunden.' }, { status: 400 });
    }
    const email = `${userHandle}@vocaro.app`;

    // 2. Get the user from Firebase Auth
    let userRecord;
    try {
        userRecord = await authAdmin.getUserByEmail(email);
    } catch (error) {
        return NextResponse.json({ error: `Benutzer '${userHandle}' nicht gefunden.` }, { status: 404 });
    }
    const userId = userRecord.uid;

    // 3. Get the specific authenticator used for this login
    // The `id` from the response body is the credentialID (in base64url format)
    const authenticatorDoc = await firestoreAdmin
        .collection('users').doc(userId)
        .collection('authenticators').doc(body.id).get();

    if (!authenticatorDoc.exists) {
        return NextResponse.json({ error: 'Passkey nicht für diesen Benutzer registriert.' }, { status: 404 });
    }
    const authenticator = authenticatorDoc.data() as Authenticator;
    
    // 4. Verify the authentication response
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
        // 5. If successful, update the counter and create a custom token
        await authenticatorDoc.ref.update({
            counter: authenticationInfo.newCounter,
        });

        // Delete the used challenge
        await challengeDoc.ref.delete();

        const customToken = await authAdmin.createCustomToken(userId);

        return NextResponse.json({ verified: true, customToken });
    }

    // If verification failed for any other reason
    return NextResponse.json({ verified: false, error: 'Die Passkey-Verifizierung ist fehlgeschlagen.' }, { status: 400 });
}
