
import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { firestoreAdmin, authAdmin } from '@/lib/firebase-admin';
import type { Authenticator } from '@/lib/types';


const RP_ID = process.env.NODE_ENV === 'development' ? 'localhost' : (new URL(process.env.NEXT_PUBLIC_BASE_URL!)).hostname;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
        return NextResponse.json({ error: 'Benutzername fehlt' }, { status: 400 });
    }
    const email = `${username}@vocaro.app`;

    let userRecord;
    try {
        userRecord = await authAdmin.getUserByEmail(email);
    } catch (error) {
        return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    const userId = userRecord.uid;

    const authenticatorsSnapshot = await firestoreAdmin
        .collection('users').doc(userId)
        .collection('authenticators').get();

    const userAuthenticators: Authenticator[] = authenticatorsSnapshot.docs.map(doc => doc.data() as Authenticator);

    const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials: userAuthenticators.map(auth => ({
            id: Buffer.from(auth.credentialID, 'base64'),
            type: 'public-key',
            transports: auth.transports,
        })),
        userVerification: 'preferred',
    });
    
    // Speichere die Challenge temporär
    const challengeRef = firestoreAdmin.collection('passkeyChallenges').doc(userId);
    await challengeRef.set({ 
        challenge: options.challenge,
        username: username,
        expires: Date.now() + 5 * 60 * 1000 // 5 Minuten
    });


    return NextResponse.json(options);
}
