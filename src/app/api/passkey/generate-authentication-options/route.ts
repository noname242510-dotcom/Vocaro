
import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { firestoreAdmin, authAdmin } from '@/lib/firebase-admin';
import type { Authenticator } from '@/lib/types';


const RP_ID = process.env.NODE_ENV === 'development' ? 'localhost' : (new URL(process.env.NEXT_PUBLIC_BASE_URL!)).hostname;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    let userAuthenticators: Authenticator[] = [];

    // Wenn ein Benutzername angegeben wird, suchen wir nach den Schlüsseln dieses Benutzers.
    // Dies ist der "nicht-auffindbare" Flow.
    if (username) {
        let userRecord;
        try {
            const email = `${username}@vocaro.app`;
            userRecord = await authAdmin.getUserByEmail(email);
        } catch (error) {
            // Wenn der Benutzer nicht gefunden wird, fahren wir fort und erlauben
            // dem Gerät, auffindbare Anmeldeinformationen vorzuschlagen.
            userRecord = null;
        }

        if (userRecord) {
            const userId = userRecord.uid;
            const authenticatorsSnapshot = await firestoreAdmin
                .collection('users').doc(userId)
                .collection('authenticators').get();

            if (!authenticatorsSnapshot.empty) {
                userAuthenticators = authenticatorsSnapshot.docs.map(doc => doc.data() as Authenticator);
            }
        }
    }
    
    // `allowCredentials` ist leer, wenn kein Benutzername angegeben wurde.
    // Dies aktiviert den "auffindbaren" Anmelde-Flow.
    const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials: userAuthenticators.map(auth => ({
            id: Buffer.from(auth.credentialID, 'base64'),
            type: 'public-key',
            transports: auth.transports,
        })),
        userVerification: 'preferred',
    });
    
    // Die Challenge muss für die Verifizierung immer gespeichert werden.
    // Wir verwenden eine temporäre ID, da wir den Benutzer noch nicht kennen.
    const challengeId = `auth_challenge_${Date.now()}`;
    const challengeRef = firestoreAdmin.collection('passkeyChallenges').doc(challengeId);
    await challengeRef.set({ 
        challenge: options.challenge,
        // Wir speichern den Benutzernamen, falls er angegeben wurde, um ihn später zuordnen zu können.
        username: username || null,
        expires: Date.now() + 5 * 60 * 1000 // 5 Minuten
    });

    // Wir müssen die ChallengeID an das Frontend zurückgeben, damit es sie bei der Verifizierung mitsenden kann.
    return NextResponse.json({ ...options, challengeId });
}
