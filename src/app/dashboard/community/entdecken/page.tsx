'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserSearch } from '../../friends/_components/UserSearch';

export default function CommunityDiscoverPage() {
    const [key, setKey] = useState(0);
    const refreshData = () => setKey(k => k + 1);
    
    return (
        <Card className="border-none shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden">
            <CardHeader className="p-10 pb-4">
                <CardTitle className="text-3xl font-bold">Benutzer finden</CardTitle>
                <CardDescription className="text-lg">Suche nach anderen Lernenden über ihren Namen.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0">
                <UserSearch onFriendAction={refreshData} />
            </CardContent>
        </Card>
    );
}
