
import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { firestoreAdmin, authAdmin } from '@/lib/firebase-admin';
import type { Authenticator } from '@/lib/types';


export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const username = searchParams.get('username');

    // Dynamically determine the relying party ID and origin
    const url = new URL(request.url);
    const rpID = url.hostname;
    const origin = url.origin;

    let userAuthenticators: Authenticator[] = [];

    // Wenn ein Benutzername angegeben ist, holen wir seine gespeicherten Passkeys
    if (username) {
        try {
            const email = `${username}@vocaro.app`;
            const userRecord = await authAdmin.getUserByEmail(email);
            const authenticatorsSnapshot = await firestoreAdmin
                .collection('users').doc(userRecord.uid)
                .collection('authenticators').get();

            if (!authenticatorsSnapshot.empty) {
                userAuthenticators = authenticatorsSnapshot.docs.map(doc => doc.data() as Authenticator);
            }
        } catch (error) {
            // Wenn der Benutzer nicht existiert, fahren wir ohne `allowCredentials` fort,
            // um die Erkennung von "discoverable credentials" (gespeicherte Passkeys) zu ermöglichen.
        }
    }
    
    const options = await generateAuthenticationOptions({
        rpID: rpID,
        // Wenn keine Passkeys für den Benutzer gefunden wurden (oder kein Benutzername angegeben wurde),
        // bleibt dieses Array leer, was den "discoverable" Flow aktiviert.
        allowCredentials: userAuthenticators.map(auth => ({
            id: Buffer.from(auth.credentialID, 'base64'),
            type: 'public-key',
            transports: auth.transports,
        })),
        userVerification: 'preferred',
    });
    
    // Die Challenge muss immer für die Verifizierung gespeichert werden.
    const challengeId = `auth_challenge_${Date.now()}`;
    const challengeRef = firestoreAdmin.collection('passkeyChallenges').doc(challengeId);
    await challengeRef.set({ 
        challenge: options.challenge,
        // Wir speichern keinen Benutzernamen, da wir ihn beim "discoverable" Flow noch nicht kennen.
        expires: Date.now() + 5 * 60 * 1000 // 5 Minuten Gültigkeit
    });

    return NextResponse.json({ ...options, challengeId });
}
