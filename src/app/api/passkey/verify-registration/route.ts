
import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { VerifiedRegistrationResponse, RegistrationResponseJSON } from '@simplewebauthn/server';
import { authAdmin, firestoreAdmin } from '@/lib/firebase-admin';
import type { Authenticator } from '@/lib/types';

const RP_ID = 'vocaro-vocab.vercel.app';
const ORIGIN = `https://${RP_ID}`;

export async function POST(request: NextRequest) {
    const body: RegistrationResponseJSON & { username: string } = await request.json();
    const { username } = body;
    const email = `${username}@vocaro.app`;
    
    // 1. Hole die gespeicherte Challenge
    // Wir müssen die ID finden, die wir in generate-options verwendet haben.
    const challengesQuery = firestoreAdmin.collection('passkeyChallenges').where('username', '==', username);
    const challengesSnapshot = await challengesQuery.get();

    if (challengesSnapshot.empty) {
        return NextResponse.json({ error: 'Challenge nicht gefunden oder abgelaufen.' }, { status: 400 });
    }

    const challengeDoc = challengesSnapshot.docs[0];
    const { challenge } = challengeDoc.data()!;

    // 2. Verifiziere die Antwort
    let verification: VerifiedRegistrationResponse;
    try {
        verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge: challenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            requireUserVerification: true,
        });
    } catch (error: any) {
        console.error("verifyRegistrationResponse error:", error);
        return NextResponse.json({ error: `Verifizierung fehlgeschlagen: ${error.message}` }, { status: 400 });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
        const { credentialPublicKey, credentialID, counter } = registrationInfo;

        // 3. Erstelle oder hole Firebase User
        let userRecord;
        try {
            userRecord = await authAdmin.getUserByEmail(email);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                userRecord = await authAdmin.createUser({
                    email,
                    displayName: username,
                });
            } else {
                console.error('Fehler beim Abrufen/Erstellen des Firebase-Benutzers:', error);
                return NextResponse.json({ error: 'Benutzer konnte nicht verarbeitet werden.' }, { status: 500 });
            }
        }
        
        const userId = userRecord.uid;

        // 4. Speichere den neuen Authenticator in Firestore
        const newAuthenticator: Authenticator = {
            credentialID: Buffer.from(credentialID).toString('base64'),
            credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
            counter,
            transports: body.response.transports || [],
        };
        
        // Der Dokumentenname ist die credentialID, um Duplikate zu vermeiden
        await firestoreAdmin
            .collection('users').doc(userId)
            .collection('authenticators').doc(newAuthenticator.credentialID)
            .set(newAuthenticator);
        
        // Lösche die verbrauchte Challenge
        await challengeDoc.ref.delete();
        
        // 5. Erstelle Custom Token für den Login
        const customToken = await authAdmin.createCustomToken(userId);

        return NextResponse.json({ verified: true, customToken });
    }

    return NextResponse.json({ verified: false, error: 'Unbekannter Verifizierungsfehler.' }, { status: 400 });
}
