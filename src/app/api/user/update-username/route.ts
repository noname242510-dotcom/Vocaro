import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, firestoreAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const authorization = request.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        const { newUsername } = await request.json();

        if (!newUsername) {
            return NextResponse.json({ error: 'Benutzername ist erforderlich.' }, { status: 400 });
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
        
        // 2. E-Mail und displayName in Auth aktualisieren
        await authAdmin.updateUser(uid, {
            email: newEmail,
            displayName: newUsername.trim(),
            emailVerified: true, 
        });

        // 3. displayName im publicProfile Dokument aktualisieren
        const publicProfileRef = firestoreAdmin.collection('publicProfiles').doc(uid);
        await publicProfileRef.update({
            displayName: newUsername.trim(),
            displayName_lowercase: newUsername.trim().toLowerCase()
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
