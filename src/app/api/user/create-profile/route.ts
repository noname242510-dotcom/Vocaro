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
        
        const { displayName } = await request.json();
        const user = await authAdmin.getUser(uid);

        // Prioritize displayName from client, fallback to auth user object
        const finalDisplayName = displayName || user.displayName || 'Unnamed User';

        const publicProfileRef = firestoreAdmin.collection('publicProfiles').doc(uid);
        
        await publicProfileRef.set({
            displayName: finalDisplayName,
            displayName_lowercase: finalDisplayName.toLowerCase(),
            photoURL: user.photoURL || null,
            createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // Also update the auth user's display name if it differs, to keep it in sync
        if (user.displayName !== finalDisplayName) {
            await authAdmin.updateUser(uid, { displayName: finalDisplayName });
        }

        return NextResponse.json({ success: true, message: 'Public profile created/updated.' });

    } catch (error: any) {
        console.error('Error creating public profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
