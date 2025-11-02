
import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { VerifiedRegistrationResponse, RegistrationResponseJSON } from '@simplewebauthn/server';
import { authAdmin, firestoreAdmin } from '@/lib/firebase-admin';
import type { Authenticator } from '@/lib/types';


const RP_ID = process.env.NODE_ENV === 'development' ? 'localhost' : (new URL(process.env.NEXT_PUBLIC_BASE_URL!)).hostname;
const ORIGIN = process.env.NEXT_PUBLIC_BASE_URL || `https://${RP_ID}`;

export async function POST(request: NextRequest) {
    const body: RegistrationResponseJSON & { username: string } = await request.json();
    const { username } = body;
    const email = `${username}@vocaro.app`;
    const tempUserId = `user_${username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;


    // 1. Hole die gespeicherte Challenge
    const challengeRef = firestoreAdmin.collection('passkeyChallenges').doc(tempUserId);
    const challengeDoc = await challengeRef.get();
    
    if (!challengeDoc.exists) {
        return NextResponse.json({ error: 'Challenge nicht gefunden oder abgelaufen.' }, { status: 400 });
    }
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
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
        const { credentialPublicKey, credentialID, counter } = registrationInfo;

        // 3. Erstelle Firebase User
        let userRecord;
        try {
            userRecord = await authAdmin.createUser({
                email,
                displayName: username,
                // Kein Passwort, da Login via Passkey
            });
        } catch (error: any) {
            if (error.code === 'auth/email-already-exists') {
                 // Wenn der Benutzer bereits existiert (z.B. durch Passwort-Registrierung), hole den bestehenden Benutzer
                userRecord = await authAdmin.getUserByEmail(email);
            } else {
                 console.error('Fehler beim Erstellen des Firebase-Benutzers:', error);
                return NextResponse.json({ error: 'Benutzer konnte nicht erstellt werden.' }, { status: 500 });
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
        
        await firestoreAdmin
            .collection('users').doc(userId)
            .collection('authenticators').doc(newAuthenticator.credentialID)
            .set(newAuthenticator);
        
        // Lösche die Challenge
        await challengeRef.delete();
        
        // 5. Erstelle Custom Token
        const customToken = await authAdmin.createCustomToken(userId);

        return NextResponse.json({ verified: true, customToken });
    }

    return NextResponse.json({ verified: false }, { status: 400 });
}
