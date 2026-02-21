'use client';

import Link from 'next/link';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Subject } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { SubjectCard } from './_components/subject-card';

export default function DashboardPage() {
  const { firestore, user } = useFirebase();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  
  const subjectsCollection = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects');
  }, [firestore, user]);

  const { data: subjects, isLoading, forceUpdate } = useCollection<Subject>(subjectsCollection);

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
    if (newSubjectName.trim() && subjectsCollection) {
      const newSubject = {
        name: newSubjectName.trim(),
        emoji: getEmojiForSubject(newSubjectName),
        stackCount: 0,
        vocabCount: 0,
      };
      await addDoc(subjectsCollection, newSubject);
      setNewSubjectName('');
      setIsCreateDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)]">
      <div className="flex-grow">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {subjects && subjects.map((subject) => (
            <SubjectCard 
              key={subject.id} 
              subject={subject} 
              onSubjectDeleted={forceUpdate}
              onSubjectRenamed={forceUpdate}
            />
          ))}
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
