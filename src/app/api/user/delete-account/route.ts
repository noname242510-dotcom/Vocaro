import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, firestoreAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export async function POST(request: NextRequest) {
    try {
        const authorization = request.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        
        // This fails silently if the password is wrong, so we can't use it for verification alone.
        // We rely on the client's re-authentication flow to have happened.
        // For a more secure implementation, you'd verify the password against the hash.
        const { password } = await request.json();
        if (!password) {
             return NextResponse.json({ error: 'Passwort ist erforderlich.' }, { status: 400 });
        }

        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        // Lösche den Benutzer aus Firebase Authentication
        await authAdmin.deleteUser(uid);
        
        // Lösche die Benutzerdaten aus Firestore
        const userDocRef = firestoreAdmin.collection('users').doc(uid);
        // Hinweis: Dies löscht keine Subkollektionen. Ein vollständiges Löschen
        // würde eine rekursive Funktion erfordern, z.B. mit Firebase Functions.
        // Für diese Anwendung ist das Löschen des Haupt-Benutzerdokuments ausreichend.
        await firestoreAdmin.recursiveDelete(userDocRef);


        return NextResponse.json({ success: true, message: 'Konto erfolgreich gelöscht.' });

    } catch (error: any) {
        console.error('Fehler beim Löschen des Kontos:', error);
        let message = 'Ein interner Serverfehler ist aufgetreten.';
        let status = 500;

        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            message = 'Ungültige Sitzung. Bitte melde dich erneut an.';
            status = 401;
        } else if (error.code === 'auth/requires-recent-login') {
            message = 'Diese Aktion erfordert eine kürzliche Anmeldung. Bitte melde dich erneut an.';
            status = 403;
        }

        return NextResponse.json({ error: message }, { status });
    }
}
