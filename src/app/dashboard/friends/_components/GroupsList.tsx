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
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4" />
            Social Feed
          </h3>
          <Button variant="link" className="text-primary font-semibold underline" onClick={() => setIsCreateOpen(true)}>
            See all friends
          </Button>
        </div>

        {isLoading && <div className="text-center py-20"><Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" /></div>}

        {!isLoading && (!groups || groups.length === 0) && (
          <div className="text-center py-20 bg-card border border-dashed rounded-[2rem]">
            <Users className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <h3 className="mt-6 text-2xl font-bold font-headline">Keine Gruppen gefunden</h3>
            <p className="mt-2 text-muted-foreground text-lg max-w-sm mx-auto">Du bist noch in keiner Gruppe. Erstelle eine neue und lerne gemeinsam!</p>
            <Button onClick={() => setIsCreateOpen(true)} className="mt-8 rounded-2xl h-12 px-8">
              Gruppe erstellen
            </Button>

          </div>
        )}

        {!isLoading && groups && groups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="group relative bg-card border-none shadow-xl shadow-primary/5 rounded-3xl p-8 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col min-h-[280px]"
                onClick={() => router.push(`/dashboard/groups/${group.id}`)}
              >
                <div className="absolute top-0 right-0 p-4">
                  <div className="bg-secondary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">New</div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <Users className="h-6 w-6" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold font-headline tracking-tight group-hover:text-primary transition-colors">{group.name}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">Lerne gemeinsam mit anderen Mitgliedern in dieser spezialisierten Gruppe.</p>
                  </div>
                </div>

                <div className="pt-8 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground">{group.memberCount ?? 0} Mitglieder</span>
                  </div>
                  <div className="flex items-center gap-1 text-primary font-bold text-sm">
                    Beitreten <Plus className="h-4 w-4" />

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
