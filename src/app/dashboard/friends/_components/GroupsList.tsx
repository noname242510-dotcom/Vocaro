'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where } from 'firebase/firestore';
import type { Group } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Loader2 } from 'lucide-react';
import { CreateGroupDialog } from './CreateGroupDialog';

export function GroupsList({ key: _key }: { key: string }) {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const userGroupsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'groups'),
      where('memberIds', 'array-contains', user.uid)
    );
  }, [user, firestore]);

  const { data: groups, isLoading } = useCollection<Group>(userGroupsQuery);

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Gruppe erstellen
          </Button>
        </div>

        {isLoading && <div className="text-center py-10"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}
        
        {!isLoading && (!groups || groups.length === 0) && (
          <div className="text-center py-10 border-2 border-dashed rounded-2xl">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Keine Gruppen gefunden</h3>
            <p className="mt-1 text-sm text-muted-foreground">Du bist noch in keiner Gruppe. Erstelle eine neue!</p>
          </div>
        )}

        {!isLoading && groups && groups.length > 0 && (
          <div className="space-y-3">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/dashboard/groups/${group.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-secondary rounded-full">
                    <Users className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{group.name}</p>
                    <p className="text-sm text-muted-foreground">{group.memberCount ?? 0} Mitglieder</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <CreateGroupDialog isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </>
  );
}
