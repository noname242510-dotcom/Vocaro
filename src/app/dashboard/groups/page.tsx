'use client';

import { useState } from 'react';
import { GroupsList } from '../friends/_components/GroupsList';

export default function GroupsPage() {
    const [key, setKey] = useState(0); // Used to force re-renders on components

    const refreshData = () => {
        setKey(prevKey => prevKey + 1);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center my-4 md:my-8">
                <div className="flex-1"></div>
                <div className="text-center flex-1">
                    <h1 className="text-3xl lg:text-4xl font-bold font-headline">Meine Gruppen</h1>
                    <p className="text-sm text-muted-foreground mt-1">Lerne gemeinsam mit anderen.</p>
                </div>
                <div className="flex-1 flex justify-end">
                    {/* Notifications removed as friends are added directly */}
                </div>
            </div>
            <div className="mt-6">
                <GroupsList key={`groups-${key}`} />
            </div>
        </div>
    );
}
