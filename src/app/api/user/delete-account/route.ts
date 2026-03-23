export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, firestoreAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const authorization = request.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        
        const { password } = await request.json(); 

        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const user = await authAdmin.getUser(uid);
        const email = user.email;

        const hasPasswordProvider = user.providerData.some(p => p.providerId === 'password');

        if (hasPasswordProvider) {
            if (!password) {
                return NextResponse.json({ error: 'Passwort ist zur Bestätigung erforderlich.' }, { status: 400 });
            }
            if (!email) {
                return NextResponse.json({ error: 'Benutzer-E-Mail nicht gefunden, Authentifizierung nicht möglich.' }, { status: 400 });
            }
            
            const { initializeApp, getApps, deleteApp } = await import('firebase/app');
            const { getAuth: getClientAuth, signInWithEmailAndPassword } = await import('firebase/auth');

            const tempAppName = `temp-delete-app-${uid}`;
            let tempApp;
            const existingApp = getApps().find(app => app.name === tempAppName);
            if (existingApp) {
                tempApp = existingApp;
            } else {
                tempApp = initializeApp({
                    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                }, tempAppName);
            }
            const tempAuth = getClientAuth(tempApp);

            try {
                await signInWithEmailAndPassword(tempAuth, email, password);
            } catch (error: any) {
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    return NextResponse.json({ error: 'Das aktuelle Passwort ist nicht korrekt.' }, { status: 403 });
                }
                throw error;
            } finally {
                if(getApps().some(app => app.name === tempAppName)) {
                    deleteApp(tempApp).catch(console.error);
                }
            }
        }
        
        // Lösche den Benutzer aus Firebase Authentication
        await authAdmin.deleteUser(uid);
        
        // Lösche die Benutzerdaten aus Firestore
        const userDocRef = firestoreAdmin.collection('users').doc(uid);
        // This will recursively delete all subcollections.
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
