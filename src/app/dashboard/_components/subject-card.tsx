
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Edit, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Stack, Subject, Verb } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';

interface SubjectCardProps {
  subject: Subject;
  onSubjectDeleted: () => void;
  onSubjectRenamed: () => void;
}

export function SubjectCard({ subject, onSubjectDeleted, onSubjectRenamed }: SubjectCardProps) {
  const { firestore, user } = useFirebase();
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renamedSubjectName, setRenamedSubjectName] = useState(subject.name);
  const [totalVocabCount, setTotalVocabCount] = useState(0);

  const stacksCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects', subject.id, 'stacks');
  }, [firestore, user, subject.id]);

  const verbsCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects', subject.id, 'verbs');
  }, [firestore, user, subject.id]);

  const { data: stacks } = useCollection<Stack>(stacksCollectionRef);
  const { data: verbs } = useCollection<Verb>(verbsCollectionRef);

  useEffect(() => {
    if (stacks && firestore && user) {
      const fetchAllVocabCounts = async () => {
        let count = 0;
        for (const stack of stacks) {
          const vocabCollectionRef = collection(firestore, 'users', user.uid, 'subjects', subject.id, 'stacks', stack.id, 'vocabulary');
          const vocabSnapshot = await getDocs(vocabCollectionRef);
          count += vocabSnapshot.size;
        }
        setTotalVocabCount(count);
      };
      fetchAllVocabCounts();
    } else if (stacks === null || stacks?.length === 0) {
      setTotalVocabCount(0);
    }
  }, [stacks, firestore, user, subject.id]);


  const handleDeleteSubject = async () => {
    if (subjectToDelete && user && firestore) {
      const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectToDelete.id);
      
      const batch = writeBatch(firestore);
      batch.delete(subjectDocRef);

      if (stacks) {
        for (const stack of stacks) {
            const stackDocRef = doc(stacksCollectionRef!, stack.id);
            const vocabSnapshot = await getDocs(collection(stackDocRef, 'vocabulary'));
            vocabSnapshot.forEach(vocabDoc => batch.delete(vocabDoc.ref));
            batch.delete(stackDocRef);
        }
      }

      await batch.commit();
      onSubjectDeleted();
      setSubjectToDelete(null);
    }
  };

  const handleRenameSubject = async () => {
    if (renamedSubjectName.trim() && user && firestore) {
      const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', subject.id);
      const newEmoji = getEmojiForSubject(renamedSubjectName);
      await updateDoc(subjectDocRef, {
        name: renamedSubjectName.trim(),
        emoji: newEmoji,
      });
      setIsRenameDialogOpen(false);
      onSubjectRenamed();
    }
  };
  
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

  return (
    <>
      <Card className="group relative hover:shadow-lg transition-shadow duration-300 flex flex-col justify-center items-center text-center p-6">
        <CardHeader className="p-0">
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">{subject.emoji}</span>
            <div>
              <CardTitle className="font-headline hover:underline">
                <Link href={`/dashboard/subjects/${subject.id}`}>{subject.name}</Link>
              </CardTitle>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-muted-foreground text-sm">{totalVocabCount} Vokabeln</span>
                <span className="text-muted-foreground text-sm font-black">·</span>
                <span className="text-muted-foreground text-sm">{verbs?.length ?? 0} Verben</span>
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => {
                setRenamedSubjectName(subject.name);
                setIsRenameDialogOpen(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSubjectToDelete(subject);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird das Fach und alle zugehörigen Stapel und Vokabeln dauerhaft gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSubjectToDelete(null)}>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSubject}>Löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-auto absolute bottom-4 right-4">
          <Link href={`/dashboard/subjects/${subject.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fach umbenennen</DialogTitle>
            <DialogDescription>
              Gib einen neuen Namen für das Fach &quot;{subject?.name}&quot; ein.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rename-name" className="text-right">
                Name
              </Label>
              <Input
                id="rename-name"
                value={renamedSubjectName}
                onChange={(e) => setRenamedSubjectName(e.target.value)}
                className="col-span-3"
                onKeyDown={(e) => e.key === 'Enter' && handleRenameSubject()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Abbrechen</Button>
            <Button type="submit" onClick={handleRenameSubject}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
