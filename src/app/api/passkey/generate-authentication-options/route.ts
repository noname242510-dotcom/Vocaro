
import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { firestoreAdmin, authAdmin } from '@/lib/firebase-admin';
import type { Authenticator } from '@/lib/types';


const RP_ID = process.env.NODE_ENV === 'development' ? 'localhost' : (new URL(process.env.NEXT_PUBLIC_BASE_URL!)).hostname;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    let userAuthenticators: Authenticator[] = [];
    let userIdForChallenge: string | null = null;

    if (username) {
        let userRecord;
        try {
            const email = `${username}@vocaro.app`;
            userRecord = await authAdmin.getUserByEmail(email);
        } catch (error) {
            // If the user doesn't exist, we can still proceed and allow discoverable credentials
            userRecord = null;
        }

        if (userRecord) {
            userIdForChallenge = userRecord.uid;
            const authenticatorsSnapshot = await firestoreAdmin
                .collection('users').doc(userRecord.uid)
                .collection('authenticators').get();

            if (!authenticatorsSnapshot.empty) {
                userAuthenticators = authenticatorsSnapshot.docs.map(doc => doc.data() as Authenticator);
            }
        }
    }
    
    // `allowCredentials` will be empty if no username was provided, which is what enables
    // the "discoverable" login flow.
    const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials: userAuthenticators.map(auth => ({
            id: Buffer.from(auth.credentialID, 'base64'),
            type: 'public-key',
            transports: auth.transports,
        })),
        userVerification: 'preferred',
    });
    
    // The challenge must always be stored for verification.
    // We use a temporary ID since we may not know the user yet.
    const challengeId = `auth_challenge_${Date.now()}`;
    const challengeRef = firestoreAdmin.collection('passkeyChallenges').doc(challengeId);
    await challengeRef.set({ 
        challenge: options.challenge,
        userId: userIdForChallenge, // May be null, that's okay
        expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // We must return the challengeId to the frontend so it can be sent back for verification.
    return NextResponse.json({ ...options, challengeId });
}
