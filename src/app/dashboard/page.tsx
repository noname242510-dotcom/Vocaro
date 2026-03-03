'use client';

import Link from 'next/link';
import { Plus, Zap, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Subject } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { SubjectCard, type SubjectWithCounts } from './_components/subject-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const [subjectsWithCounts, setSubjectsWithCounts] = useState<SubjectWithCounts[]>([]);
  const [isCounting, setIsCounting] = useState(true);
  const [updateToken, setUpdateToken] = useState(0);

  const subjectsCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects');
  }, [firestore, user]);

  const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsCollectionRef);

  useEffect(() => {
    if (areSubjectsLoading) {
      setIsCounting(true);
      return;
    }

    if (!subjects || !firestore || !user) {
      setIsCounting(false);
      setSubjectsWithCounts([]);
      return;
    }

    if (subjects.length === 0) {
      setIsCounting(false);
      setSubjectsWithCounts([]);
      return;
    }

    setIsCounting(true);
    const fetchCounts = async () => {
      const countsPromises = subjects.map(async (subject) => {
        const stacksRef = collection(firestore, 'users', user.uid, 'subjects', subject.id, 'stacks');
        const verbsRef = collection(firestore, 'users', user.uid, 'subjects', subject.id, 'verbs');

        const [stacksSnapshot, verbsSnapshot] = await Promise.all([
          getDocs(stacksRef),
          getDocs(verbsRef),
        ]);

        const verbCount = verbsSnapshot.size;

        let vocabCount = 0;
        for (const stackDoc of stacksSnapshot.docs) {
          const vocabRef = collection(stackDoc.ref, 'vocabulary');
          const vocabSnapshot = await getDocs(vocabRef);
          vocabCount += vocabSnapshot.size;
        }

        return {
          ...subject,
          vocabCount,
          verbCount,
        };
      });

      const resolvedSubjects = await Promise.all(countsPromises);
      setSubjectsWithCounts(resolvedSubjects);
      setIsCounting(false);
    };

    fetchCounts();
  }, [subjects, areSubjectsLoading, firestore, user, updateToken]);

  const forceRefetch = () => setUpdateToken(t => t + 1);

  const getEmojiForSubject = (subjectName: string) => {
    const name = subjectName.toLowerCase();
    if (name.includes('deutsch')) return '🇩🇪';
    if (name.includes('englisch')) return '🇬🇧';
    if (name.includes('französisch')) return '🇫🇷';
    if (name.includes('spanisch')) return '🇪🇸';
    if (name.includes('portugiesisch')) return '🇵🇹';
    if (name.includes('italienisch')) return '🇮🇹';
    if (name.includes('russich')) return '🇷🇺';
    if (name.includes('griechiesch')) return '🇬🇷';
    if (name.includes('japanisch')) return '🇯🇵';
    if (name.includes('latein')) return '🏛️';
    if (name.includes('mathe')) return '🔢';
    return '🌐';
  };

  const handleCreateSubject = async () => {
    if (newSubjectName.trim() && subjectsCollectionRef) {
      await addDoc(subjectsCollectionRef, {
        name: newSubjectName.trim(),
        emoji: getEmojiForSubject(newSubjectName),
      });
      setNewSubjectName('');
      setIsCreateDialogOpen(false);
    }
  };

  const isLoading = areSubjectsLoading || isCounting;
  const totalVocab = subjectsWithCounts.reduce((acc, s) => acc + s.vocabCount, 0);

  return (
    <div className="space-y-10 pb-20">
      {/* Welcome Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-primary/5 p-8 md:p-12 border border-primary/10">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight mb-4">
            Hallo, {user?.displayName?.split(' ')[0] || 'Lernende(r)'}! 👋
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            Du hast heute schon <span className="text-primary font-bold">12</span> Vokabeln gelernt. Dein Ziel sind 20. Fast geschafft!
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              className="rounded-2xl px-8 h-12 shadow-lg shadow-primary/20"
              onClick={async () => {
                if (subjectsWithCounts.length > 0) {
                  const firstSubject = subjectsWithCounts[0];
                  // Ideally, we'd pick a subject that needs review, but for now we pick the first one
                  sessionStorage.setItem('learn-session-subject', firstSubject.id);

                  // Fetch all vocab IDs for this subject
                  const vocabIds: string[] = [];
                  const stacksRef = collection(firestore!, 'users', user!.uid, 'subjects', firstSubject.id, 'stacks');
                  const stacksSnap = await getDocs(stacksRef);
                  for (const stackDoc of stacksSnap.docs) {
                    const vSnap = await getDocs(collection(stackDoc.ref, 'vocabulary'));
                    vSnap.forEach(d => vocabIds.push(d.id));
                  }

                  if (vocabIds.length > 0) {
                    sessionStorage.setItem('learn-session-vocab', JSON.stringify(vocabIds));
                    router.push('/dashboard/learn');
                  } else {
                    toast({ title: "Keine Vokabeln", description: "Dieses Fach hat noch keine Vokabeln zum Lernen." });
                  }
                } else {
                  setIsCreateDialogOpen(true);
                }
              }}
            >
              <Zap className="mr-2 h-5 w-5 fill-current" />
              Jetzt lernen
            </Button>
            <Button size="lg" variant="outline" className="rounded-2xl px-8 h-12 border-2" asChild>
              <Link href="/dashboard/community">
                <Users className="mr-2 h-5 w-5" />
                Community
              </Link>
            </Button>
          </div>
        </div>
        {/* Abstract shapes for premium feel */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
      </section>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-[2rem] p-6 border-none bg-secondary/30 backdrop-blur-sm">
          <p className="text-sm font-medium text-muted-foreground mb-1">Gesamt-Vokabeln</p>
          <p className="text-3xl font-bold font-headline">{isLoading ? '...' : totalVocab}</p>
        </Card>
        <Card className="rounded-[2rem] p-6 border-none bg-secondary/30 backdrop-blur-sm">
          <p className="text-sm font-medium text-muted-foreground mb-1">Lern-Streak</p>
          <p className="text-3xl font-bold font-headline">5 Tage</p>
        </Card>
        <Card className="rounded-[2rem] p-6 border-none bg-secondary/30 backdrop-blur-sm">
          <p className="text-sm font-medium text-muted-foreground mb-1">Meister-Level</p>
          <p className="text-3xl font-bold font-headline">Gold</p>
        </Card>
        <Card className="rounded-[2rem] p-6 border-none bg-secondary/30 backdrop-blur-sm">
          <p className="text-sm font-medium text-muted-foreground mb-1">Rang</p>
          <p className="text-3xl font-bold font-headline">#42</p>
        </Card>
      </div>

      {/* Subjects Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-bold font-headline">Deine Fächer</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5 rounded-xl">
                <Plus className="h-5 w-5 mr-1" />
                Neu hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] sm:max-w-[425px]" aria-describedby="dialog-description">
              <DialogHeader>
                <DialogTitle className="text-2xl">Neues Fach erstellen</DialogTitle>
                <DialogDescription id="dialog-description">
                  Gib einen Namen für dein neues Fach ein.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold px-1">Fachname</Label>
                  <Input
                    id="name"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="h-12 rounded-xl text-lg px-4"
                    placeholder="z.B. Spanisch"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateSubject} size="lg" className="w-full rounded-2xl h-12">Erstellen</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && subjectsWithCounts.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="min-h-[180px] p-8 flex flex-col justify-center items-center text-center rounded-[2.5rem] border-none bg-secondary/20 shadow-none">
                <Skeleton className="h-14 w-14 rounded-2xl mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))
          ) : (
            <>
              {subjectsWithCounts.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onAction={forceRefetch}
                />
              ))}
            </>
          )}
        </div>
      </section>

      <footer className="w-full text-center text-sm text-muted-foreground p-12 mt-12 border-t">
        <p className="font-medium">© 2026 Vocaro</p>
        <p className="mt-2 text-xs opacity-70">
          Entwickelt mit ♥ für moderne Sprachlernende. <br className="md:hidden" />
          <Link href="/privacy" className="hover:text-primary underline-offset-4">Datenschutz</Link> · <Link href="/terms" className="hover:text-primary underline-offset-4">AGB</Link>
        </p>
      </footer>
    </div>
  );
}
