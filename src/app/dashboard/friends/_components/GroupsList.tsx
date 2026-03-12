'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where } from 'firebase/firestore';
import type { Group } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Loader2, ArrowRight } from 'lucide-react';
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
        <div className="flex justify-end items-center">
          <Button variant="link" className="text-primary font-semibold" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Gruppe erstellen
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
                className="group relative bg-card border-none shadow-xl shadow-primary/5 rounded-3xl p-8 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
                onClick={() => router.push(`/dashboard/groups/${group.id}`)}
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold font-headline tracking-tight group-hover:text-primary transition-colors">{group.name}</h3>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground">{group.memberCount ?? 0} Mitglieder</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary/30 group-hover:bg-primary group-hover:text-white transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
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
