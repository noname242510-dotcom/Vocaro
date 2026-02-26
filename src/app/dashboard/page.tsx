'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
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

export default function DashboardPage() {
  const { firestore, user } = useFirebase();
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

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)]">
      <div className="flex-grow">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading && subjectsWithCounts.length === 0 ? (
            Array.from({ length: subjects?.length || 4 }).map((_, i) => (
              <Card key={i} className="min-h-[180px] p-6 flex flex-col justify-center items-center text-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-6 w-3/4 mt-4" />
                  <div className="flex items-center justify-center gap-2 mt-2 w-full">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
              </Card>
            ))
          ) : (
            subjectsWithCounts.map((subject) => (
              <SubjectCard 
                key={subject.id} 
                subject={subject} 
                onAction={forceRefetch}
              />
            ))
          )}
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Card className="flex items-center justify-center border-dashed hover:border-primary hover:shadow-lg transition-all duration-300 min-h-[180px] cursor-pointer">
                <div className="rounded-full h-auto p-6 text-muted-foreground hover:text-primary flex flex-col items-center gap-2 text-center">
                  <Plus className="h-8 w-8" />
                  <span className="text-sm font-medium">Neues Fach</span>
                </div>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neues Fach erstellen</DialogTitle>
                <DialogDescription>
                  Gib einen Namen für dein neues Fach ein.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="col-span-3"
                    placeholder="z.B. Spanisch"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateSubject}>Erstellen</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <footer className="w-full text-center text-xs text-muted-foreground p-6 mt-auto">
        <p>© 2026 Vocaro. Entwickelt mit ♥ und KI-Unterstützung für moderne Sprachlernende.</p>
        <p>
          <Link href="/privacy" className="underline">Datenschutz</Link> · <Link href="/terms" className="underline">AGB</Link>
        </p>
      </footer>
    </div>
  );
}
