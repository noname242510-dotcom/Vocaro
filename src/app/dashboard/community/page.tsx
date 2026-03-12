'use client';

import { GroupsList } from '../friends/_components/GroupsList';

export default function CommunityGroupsPage() {
    return (
        <section className="space-y-6">
            <GroupsList key="groups-list" />
        </section>
    );
}
