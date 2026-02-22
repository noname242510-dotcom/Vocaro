import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, firestoreAdmin } from '@/lib/firebase-admin';

async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
    const authorization = request.headers.get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
        const idToken = authorization.split('Bearer ')[1];
        try {
            const decodedToken = await authAdmin.verifyIdToken(idToken);
            return decodedToken.uid;
        } catch (error) {
            console.error("Token-Verifizierung fehlgeschlagen:", error);
            return null;
        }
    }
    return null;
}

export async function GET(request: NextRequest) {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
        return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('query');

    if (!searchQuery || searchQuery.trim().length < 1) {
        return NextResponse.json({ error: 'Suchanfrage muss mindestens 1 Zeichen lang sein' }, { status: 400 });
    }
    
    try {
        const lowerCaseQuery = searchQuery.toLowerCase();
        
        const profilesRef = firestoreAdmin.collection('publicProfiles');
        const q = profilesRef
            .where('displayName_lowercase', '>=', lowerCaseQuery)
            .where('displayName_lowercase', '<=', lowerCaseQuery + '\uf8ff')
            .limit(10);
            
        const querySnapshot = await q.get();

        const matchingUsers = querySnapshot.docs.map(doc => ({
            id: doc.id,
            displayName: doc.data().displayName,
            photoURL: doc.data().photoURL,
        }));

        return NextResponse.json(matchingUsers, { status: 200 });

    } catch (error) {
        console.error('Fehler bei der Benutzersuche:', error);
        return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
    }
}
