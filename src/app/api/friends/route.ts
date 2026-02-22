import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, firestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
    const authorization = request.headers.get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
        const idToken = authorization.split('Bearer ')[1];
        try {
            const decodedToken = await authAdmin.verifyIdToken(idToken);
            return decodedToken.uid;
        } catch (error) {
            return null;
        }
    }
    return null;
}

// GET /api/friends?status=[pending|accepted]
export async function GET(request: NextRequest) {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    if (!status || (status !== 'pending' && status !== 'accepted')) {
        return NextResponse.json({ error: 'Invalid status parameter' }, { status: 400 });
    }

    try {
        const friendsRef = firestoreAdmin.collection('users').doc(userId).collection('friends');
        let query = friendsRef.where('status', '==', status);

        if (status === 'pending') {
            query = query.where('recipientId', '==', userId);
        }

        const snapshot = await query.get();
        if (snapshot.empty) {
            return NextResponse.json([], { status: 200 });
        }

        const friendIds = snapshot.docs.map(doc => doc.id);

        const userRecords = await authAdmin.getUsers(friendIds.map(id => ({ uid: id })));
        
        const friendsData = userRecords.users.map(userRecord => ({
            id: userRecord.uid,
            displayName: userRecord.displayName || 'Unnamed User',
            photoURL: userRecord.photoURL,
            ...snapshot.docs.find(doc => doc.id === userRecord.uid)?.data()
        }));

        return NextResponse.json(friendsData, { status: 200 });

    } catch (error) {
        console.error('Error fetching friends:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


// POST /api/friends - Send a friend request
export async function POST(request: NextRequest) {
    const requesterId = await getUserIdFromToken(request);
    if (!requesterId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientId } = await request.json();

    if (!recipientId || requesterId === recipientId) {
        return NextResponse.json({ error: 'Invalid recipient ID' }, { status: 400 });
    }

    try {
        const batch = firestoreAdmin.batch();
        const timestamp = FieldValue.serverTimestamp();

        // Doc for requester
        const requesterRef = firestoreAdmin.doc(`users/${requesterId}/friends/${recipientId}`);
        batch.set(requesterRef, { requesterId, recipientId, status: 'pending', createdAt: timestamp });

        // Doc for recipient
        const recipientRef = firestoreAdmin.doc(`users/${recipientId}/friends/${requesterId}`);
        batch.set(recipientRef, { requesterId, recipientId, status: 'pending', createdAt: timestamp });

        await batch.commit();

        return NextResponse.json({ success: true, message: 'Friend request sent.' }, { status: 201 });

    } catch (error) {
        console.error('Error sending friend request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT /api/friends - Accept/Decline a friend request
export async function PUT(request: NextRequest) {
    const recipientId = await getUserIdFromToken(request); // The user taking action
    if (!recipientId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { requesterId, status } = await request.json();
    
    if (!requesterId || !status || (status !== 'accepted' && status !== 'declined')) {
        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    try {
        const batch = firestoreAdmin.batch();
        
        const requesterFriendDocRef = firestoreAdmin.doc(`users/${requesterId}/friends/${recipientId}`);
        const recipientFriendDocRef = firestoreAdmin.doc(`users/${recipientId}/friends/${requesterId}`);
        
        if (status === 'accepted') {
            batch.update(requesterFriendDocRef, { status: 'accepted' });
            batch.update(recipientFriendDocRef, { status: 'accepted' });
        } else { // 'declined'
            batch.delete(requesterFriendDocRef);
            batch.delete(recipientFriendDocRef);
        }
        
        await batch.commit();

        return NextResponse.json({ success: true, message: `Request ${status}.` }, { status: 200 });
    } catch (error) {
        console.error('Error updating friend request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


// DELETE /api/friends?friendId=... - Remove a friend or cancel a request
export async function DELETE(request: NextRequest) {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const friendId = searchParams.get('friendId');

    if (!friendId) {
        return NextResponse.json({ error: 'Missing friendId parameter' }, { status: 400 });
    }

    try {
        const batch = firestoreAdmin.batch();

        const userFriendDocRef = firestoreAdmin.doc(`users/${userId}/friends/${friendId}`);
        const otherUserFriendDocRef = firestoreAdmin.doc(`users/${friendId}/friends/${userId}`);

        batch.delete(userFriendDocRef);
        batch.delete(otherUserFriendDocRef);

        await batch.commit();
        
        return NextResponse.json({ success: true, message: 'Friendship removed.' }, { status: 200 });

    } catch (error) {
        console.error('Error removing friend:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
