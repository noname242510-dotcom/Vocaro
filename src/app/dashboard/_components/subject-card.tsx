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
      <Card className="group relative hover:shadow-lg transition-shadow duration-300 flex flex-col justify-center items-center text-center p-6 min-h-[180px]">
        <CardHeader className="p-0">
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">{subject.emoji}</span>
            <div>
              <CardTitle className="font-headline hover:underline">
                <Link href={`/dashboard/subjects/${subject.id}`}>{subject.name}</Link>
              </CardTitle>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-muted-foreground text-sm">{subject.vocabCount} Vokabeln</span>
                <span className="text-muted-foreground text-sm font-black">·</span>
                <span className="text-muted-foreground text-sm">{subject.verbCount} Verben</span>
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
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
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird das Fach und alle zugehörigen Inhalte dauerhaft gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSubject}>Löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-auto absolute bottom-4 right-4">
          <Link href={`/dashboard/subjects/${subject.id}`} className="md:opacity-0 group-hover:opacity-100 transition-opacity">
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
