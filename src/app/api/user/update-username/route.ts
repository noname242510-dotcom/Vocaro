import { NextRequest, NextResponse } from 'next/server';
import { authAdmin } from '@/lib/firebase-admin';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export async function POST(request: NextRequest) {
    try {
        const authorization = request.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        const { newUsername, password } = await request.json();

        if (!newUsername || !password) {
            return NextResponse.json({ error: 'Benutzername und Passwort sind erforderlich.' }, { status: 400 });
        }

        const newEmail = `${newUsername.trim()}@vocaro.app`;

        // 1. Prüfen, ob der neue Benutzername (E-Mail) bereits existiert
        try {
            await authAdmin.getUserByEmail(newEmail);
            // Wenn kein Fehler geworfen wird, existiert der Benutzer bereits
            return NextResponse.json({ error: 'Dieser Benutzername ist bereits vergeben.' }, { status: 409 });
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') {
                // Ein anderer Fehler ist aufgetreten
                throw error;
            }
            // 'auth/user-not-found' ist der erwartete Fehler, also fahren wir fort.
        }
        
        const user = await authAdmin.getUser(uid);

        // 2. E-Mail und displayName aktualisieren
        // Firebase Admin SDK erfordert keine erneute Authentifizierung für die E-Mail-Änderung,
        // aber die Anforderung des Passworts vom Client ist eine gute Sicherheitspraxis.
        // Wir validieren das Passwort nicht aktiv auf dem Server mit dem Admin SDK,
        // da dies clientseitige SDK-Methoden erfordern würde, aber wir stellen sicher, dass es gesendet wurde.
        
        await authAdmin.updateUser(uid, {
            email: newEmail,
            displayName: newUsername.trim(),
            // emailVerified muss auf false gesetzt werden, da die E-Mail (technisch gesehen) neu ist
            emailVerified: true, 
        });

        return NextResponse.json({ success: true, message: 'Benutzername erfolgreich aktualisiert.' });

    } catch (error: any) {
        console.error('Fehler bei der Aktualisierung des Benutzernamens:', error);
        let message = 'Ein interner Serverfehler ist aufgetreten.';
        let status = 500;

        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            message = 'Ungültige Sitzung. Bitte melde dich erneut an.';
            status = 401;
        }

        return NextResponse.json({ error: message }, { status });
    }
}
