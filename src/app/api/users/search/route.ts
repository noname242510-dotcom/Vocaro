import { NextRequest, NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('query');

    if (!searchQuery || searchQuery.trim().length < 1) {
        return NextResponse.json({ error: 'Query must be at least 1 character long' }, { status: 400 });
    }
    
    try {
        const lowerCaseQuery = searchQuery.toLowerCase();
        
        // Use Firestore for scalable and efficient searching
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
        console.error('Error searching users:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
