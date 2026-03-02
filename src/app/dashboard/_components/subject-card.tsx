'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useFirebase } from '@/firebase/provider';
import { collection, deleteDoc, doc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export interface SubjectWithCounts extends Subject {
  vocabCount: number;
  verbCount: number;
}

interface SubjectCardProps {
  subject: SubjectWithCounts;
  onAction: () => void;
}

export function SubjectCard({ subject, onAction }: SubjectCardProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renamedSubjectName, setRenamedSubjectName] = useState(subject.name);

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

  const handleDeleteSubject = async () => {
    if (user && firestore) {
      const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', subject.id);

      try {
        const batch = writeBatch(firestore);

        // Delete subcollections
        const stacksRef = collection(subjectDocRef, 'stacks');
        const stacksSnapshot = await getDocs(stacksRef);
        for (const stackDoc of stacksSnapshot.docs) {
          const vocabSnapshot = await getDocs(collection(stackDoc.ref, 'vocabulary'));
          vocabSnapshot.forEach(vocabDoc => batch.delete(vocabDoc.ref));
          batch.delete(stackDoc.ref);
        }

        const verbsRef = collection(subjectDocRef, 'verbs');
        const verbsSnapshot = await getDocs(verbsRef);
        verbsSnapshot.forEach(verbDoc => batch.delete(verbDoc.ref));

        batch.delete(subjectDocRef);

        await batch.commit();
        toast({ title: "Erfolg", description: `Fach "${subject.name}" wurde gelöscht.` });
        // No longer need to call onAction, Firestore real-time updates handle it.
      } catch (error) {
        console.error("Error deleting subject:", error);
        toast({ variant: 'destructive', title: "Fehler", description: "Das Fach konnte nicht gelöscht werden." });
      } finally {
        setIsDeleteDialogOpen(false);
      }
    }
  };

  const handleRenameSubject = async () => {
    if (renamedSubjectName.trim() && user && firestore) {
      const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', subject.id);
      const newEmoji = getEmojiForSubject(renamedSubjectName);
      try {
        await updateDoc(subjectDocRef, {
          name: renamedSubjectName.trim(),
          emoji: newEmoji,
        });
        toast({ title: "Erfolg", description: "Fach umbenannt." });
        // No longer need to call onAction, Firestore real-time updates handle it.
      } catch (error) {
        toast({ variant: 'destructive', title: "Fehler", description: "Das Fach konnte nicht umbenannt werden." });
      } finally {
        setIsRenameDialogOpen(false);
      }
    }
  };

  return (
    <>
      <Card className="group relative hover:shadow-xl transition-all duration-300 flex flex-col justify-center items-center text-center p-8 min-h-[220px] rounded-[2.5rem] border-none bg-card shadow-sm hover:-translate-y-1">
        <CardHeader className="p-0 w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-secondary/50 rounded-[2rem] p-6 group-hover:bg-primary/10 transition-colors">
              <span className="text-5xl">{subject.emoji}</span>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold font-headline">
                <Link href={`/dashboard/subjects/${subject.id}`} className="hover:text-primary transition-colors">
                  {subject.name}
                </Link>
              </CardTitle>
              <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium">
                <span className="text-sm px-3 py-1 bg-secondary rounded-full">{subject.vocabCount} Vokabeln</span>
                <span className="text-sm px-3 py-1 bg-secondary rounded-full">{subject.verbCount} Verben</span>
              </div>
            </div>
          </div>
          <div className="absolute top-6 right-6 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
              onClick={() => {
                setRenamedSubjectName(subject.name);
                setIsRenameDialogOpen(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2.5rem]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl">Bist du sicher?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Das Fach &quot;{subject.name}&quot; wird dauerhaft gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="rounded-2xl h-12">Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSubject} className="rounded-2xl h-12 bg-destructive hover:bg-destructive/90">Löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-6 w-full">
          <Link href={`/dashboard/subjects/${subject.id}`} className="w-full">
            <Button variant="secondary" className="w-full rounded-2xl h-12 font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all">
              Lernen
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
