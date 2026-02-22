import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, firestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        const authorization = request.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        const user = await authAdmin.getUser(uid);

        const publicProfileRef = firestoreAdmin.collection('publicProfiles').doc(uid);
        
        // Use set with merge:true to avoid overwriting if it somehow already exists
        await publicProfileRef.set({
            displayName: user.displayName || 'Unnamed User',
            displayName_lowercase: user.displayName?.toLowerCase() || 'unnamed user',
            photoURL: user.photoURL || null,
            createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return NextResponse.json({ success: true, message: 'Public profile created/updated.' });

    } catch (error: any) {
        console.error('Error creating public profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
