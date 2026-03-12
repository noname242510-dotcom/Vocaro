'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2 } from 'lucide-react';
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
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

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
      } catch (error) {
        toast({ variant: 'destructive', title: "Fehler", description: "Das Fach konnte nicht umbenannt werden." });
      } finally {
        setIsRenameDialogOpen(false);
      }
    }
  };

  const handleCardClick = () => {
    router.push(`/dashboard/subjects/${subject.id}`);
  };

  return (
    <>
      <Card
        className="group relative bg-card border-none shadow-xl shadow-primary/5 rounded-[2.5rem] p-10 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col min-h-[280px]"
        onClick={handleCardClick}
      >
        {/* Info Area */}
        <div className="flex-1 space-y-6">
          <div className="w-16 h-16 bg-secondary/30 rounded-3xl flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-500 ease-out">
            {subject.emoji}
          </div>

          <div className="space-y-3">
            <h3 className="text-3xl font-bold font-headline tracking-tighter group-hover:text-primary transition-colors duration-300">
              {subject.name}
            </h3>
          </div>
        </div>

        {/* Stats */}
        <div className="pt-10 mt-6 border-t flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-black font-headline tracking-tight">{subject.vocabCount}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-60">Vokabeln</span>
            </div>
            <div className="w-px h-8 bg-border/50"></div>
            <div className="flex flex-col">
              <span className="text-sm font-black font-headline tracking-tight">{subject.verbCount}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-60">Verben</span>
            </div>
          </div>
        </div>

        {/* Edit/Delete Overlay */}
        <div className="absolute top-6 right-6 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[10px] group-hover:translate-x-0">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-2xl bg-card border-2 hover:bg-card hover:border-primary hover:text-primary shadow-xl"
            onClick={(e) => {
              e.stopPropagation();
              setRenamedSubjectName(subject.name);
              setIsRenameDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-2xl bg-card border-2 hover:bg-card hover:border-destructive hover:text-destructive shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10" aria-describedby="delete-subject-description">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-3xl font-bold font-headline">Bist du sicher?</AlertDialogTitle>
                <AlertDialogDescription id="delete-subject-description" className="text-lg mt-4">
                  Diese Aktion kann nicht rückgängig gemacht werden. Das Fach &quot;{subject.name}&quot; wird dauerhaft gelöscht.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-4 mt-8">
                <AlertDialogCancel className="rounded-2xl h-14 text-lg font-bold border-2">Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSubject} className="rounded-2xl h-14 text-lg font-bold bg-destructive hover:bg-destructive/90">Löschen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent aria-describedby="rename-subject-description">
          <DialogHeader>
            <DialogTitle>Fach umbenennen</DialogTitle>
            <DialogDescription id="rename-subject-description">
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
