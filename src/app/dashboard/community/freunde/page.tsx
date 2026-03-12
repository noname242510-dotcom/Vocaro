'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { FriendsList } from '../../friends/_components/FriendsList';

export default function CommunityFriendsPage() {
    const [key, setKey] = useState(0);
    const refreshData = () => setKey(k => k + 1);

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="bg-card p-2 rounded-lg border shadow-sm">
                    <Users className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold font-headline tracking-tight">Meine Freunde</h2>
            </div>
            <FriendsList key={`friends-${key}`} onFriendAction={refreshData} />
        </section>
    );
}
