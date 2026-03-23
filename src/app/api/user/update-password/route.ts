
export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { authAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase/auth';

// This is a simplified reauthentication. For production, you'd use a more robust
// method, potentially involving signInWithEmailAndPassword on the client and
// passing the ID token. For this context, we'll check the password on the server
// in a more direct, albeit less common, way for admin operations.

export async function POST(request: NextRequest) {
    try {
        const authorization = request.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        
        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
             return NextResponse.json({ error: 'Aktuelles und neues Passwort sind erforderlich.' }, { status: 400 });
        }

        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const user = await authAdmin.getUser(uid);
        const email = user.email;

        if (!email) {
             return NextResponse.json({ error: 'Benutzer-E-Mail nicht gefunden, Authentifizierung nicht möglich.' }, { status: 400 });
        }
       
        // This is a workaround to verify the current password on the server side.
        // The standard way is to re-authenticate on the client and send the new token.
        // Since we are building an API, we will use the client-sdks on the backend to validate.
        const { initializeApp, getApps, deleteApp } = await import('firebase/app');
        const { getAuth: getClientAuth, signInWithEmailAndPassword } = await import('firebase/auth');

        // We need to initialize a temporary client app to use signInWithEmailAndPassword
        const tempAppName = `temp-auth-app-${uid}`;
        
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
            await signInWithEmailAndPassword(tempAuth, email, currentPassword);
        } catch (error: any) {
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                return NextResponse.json({ error: 'Das aktuelle Passwort ist nicht korrekt.' }, { status: 403 });
            }
            // Other sign-in errors
            throw error;
        } finally {
             // Clean up the temporary app
            if(getApps().some(app => app.name === tempAppName)) {
                deleteApp(tempApp).catch(console.error);
            }
        }

        // If sign-in is successful, proceed to update the password with the Admin SDK
        await authAdmin.updateUser(uid, {
            password: newPassword,
        });

        return NextResponse.json({ success: true, message: 'Passwort erfolgreich aktualisiert.' });

    } catch (error: any) {
        console.error('Fehler bei der Passwortaktualisierung:', error);
        let message = 'Ein interner Serverfehler ist aufgetreten.';
        let status = 500;

        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            message = 'Ungültige Sitzung. Bitte melde dich erneut an.';
            status = 401;
        } else if (error.code === 'auth/weak-password') {
            message = 'Das neue Passwort ist zu schwach. Es muss mindestens 6 Zeichen lang sein.';
            status = 400;
        }

        return NextResponse.json({ error: message }, { status });
    }
}
