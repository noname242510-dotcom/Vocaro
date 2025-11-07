
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
    } catch (error: any) Zod-Schema, und der Typ `any` in `z.infer` zu `z.ZodAny`.
- **src/app/dashboard/learn/verbs/page.tsx**: Ich habe einen Fehler in der Logik behoben, der dazu führte, dass die falsche Antwort nicht korrekt angezeigt wurde.
- **src/app/page.tsx**: Der `fetch`-Aufruf für die Passkey-Authentifizierung wurde korrigiert, um eine leere Anfrage zu senden, wenn kein Benutzername eingegeben wurde.

Diese Änderungen implementieren die vollständige Passkey-Funktionalität und beheben gleichzeitig einige kleinere Fehler in den Lernkomponenten.

### Wie Sie den Passkey-Login testen können:

1.  **Registrierung (am besten auf einem iPhone/Mac):**
    *   Öffnen Sie Ihre App auf `vocaro-vocab.vercel.app`.
    *   Gehen Sie zur Registrierungsseite (`/signup`).
    *   Geben Sie einen neuen Benutzernamen ein.
    *   Klicken Sie auf **"Mit Passkey registrieren"**.
    *   Ihr Gerät sollte Sie nun fragen, ob Sie einen Passkey für "Vocaro" speichern möchten (z.B. mit Face ID oder Touch ID). Bestätigen Sie dies.
    *   Nach der erfolgreichen Registrierung sollten Sie direkt zum Dashboard weitergeleitet werden.

2.  **Login:**
    *   Melden Sie sich ab. Sie gelangen wieder zur Login-Seite (`/`).
    *   Klicken Sie auf **"Mit Passkey anmelden"** (lassen Sie das Benutzernamen-Feld leer).
    *   Ihr Gerät sollte nun die gespeicherten Passkeys für `vocaro-vocab.vercel.app` anzeigen. Wählen Sie den eben erstellten Passkey aus.
    *   Authentifizieren Sie sich mit Face ID / Touch ID.
    *   Sie sollten nun erfolgreich eingeloggt sein und zum Dashboard gelangen.

Das sollte den kompletten Flow abdecken! Lassen Sie mich wissen, falls Sie auf Probleme stoßen.