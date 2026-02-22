import { NextRequest, NextResponse } from 'next/server';
import { authAdmin } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.length < 3) {
        return NextResponse.json({ error: 'Query must be at least 3 characters long' }, { status: 400 });
    }
    
    try {
        // This is a basic implementation. For larger scale, you'd want a dedicated search service.
        const userRecords = await authAdmin.listUsers(1000);
        
        const matchingUsers = userRecords.users
            .filter(user => user.displayName && user.displayName.toLowerCase().includes(query.toLowerCase()))
            .map(user => ({
                id: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
            }));

        return NextResponse.json(matchingUsers, { status: 200 });

    } catch (error) {
        console.error('Error searching users:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
