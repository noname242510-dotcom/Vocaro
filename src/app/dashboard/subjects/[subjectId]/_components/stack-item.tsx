'use client';

import { useState } from 'react';
import { collection, doc, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Stack, VocabularyItem } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Pen, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


interface StackItemProps {
  stack: Stack;
  subjectId: string;
  onSelectionChange: (vocabId: string, isSelected: boolean) => void;
  onDelete: () => void;
}

export function StackItem({ stack, subjectId, onSelectionChange, onDelete }: StackItemProps) {
  const { firestore, user } = useFirebase();
  const [isOpen, setIsOpen] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();


  const vocabCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stack.id, 'vocabulary');
  }, [firestore, user, subjectId, stack.id]);

  const { data: vocabulary, isLoading } = useCollection<VocabularyItem>(vocabCollectionRef);

  const allVisibleInStackSelected = vocabulary ? vocabulary.every(v => v.isSelected) : false;

  const handleSelectAll = (checked: boolean) => {
    vocabulary?.forEach(v => {
        onSelectionChange(v.id, checked);
        v.isSelected = checked;
    });
  }

  const handleDeleteStack = async () => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Fehler', description: 'Nicht authentifiziert.' });
        return;
    }
    setIsDeleting(true);
    try {
        const stackDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stack.id);
        const vocabSnapshot = await getDocs(collection(stackDocRef, 'vocabulary'));
        
        const batch = writeBatch(firestore);
        
        vocabSnapshot.forEach((vocabDoc) => {
            batch.delete(vocabDoc.ref);
        });
        
        batch.delete(stackDocRef);
        
        await batch.commit();

        toast({ title: 'Erfolg', description: `Stapel "${stack.name}" wurde gelöscht.` });
        onDelete(); // Notify parent to refresh stacks
    } catch (error) {
        console.error("Error deleting stack: ", error);
        toast({ variant: 'destructive', title: 'Fehler beim Löschen', description: 'Der Stapel konnte nicht gelöscht werden.' });
    } finally {
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-2xl">
        <div className="w-full p-4 flex items-center justify-between group">
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-4 cursor-pointer">
               <div onClick={(e) => e.stopPropagation()}>
                 <Checkbox 
                    checked={allVisibleInStackSelected}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  />
               </div>
              <h3 className="font-headline text-lg">{stack.name}</h3>
              <Badge variant="secondary">{stack.vocabCount || 0} Begriffe</Badge>
            </div>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100">
              <Pen className="h-4 w-4" />
            </Button>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                  <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  >
                      <Trash2 className="h-4 w-4" />
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bist du absolut sicher?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird der Stapel und alle zugehörigen Vokabeln dauerhaft gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteStack} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Löschen"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
             <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <ChevronDown className={cn('h-5 w-5 transition-transform duration-300', isOpen && 'rotate-180')} />
                </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {isLoading && <p className="p-2 text-muted-foreground text-sm">Lade Vokabeln...</p>}
            {!isLoading && vocabulary && vocabulary.length > 0 ? (
              vocabulary.map((item) => (
                <Card 
                  key={item.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 shadow-none border"
                >
                  <Checkbox 
                      id={`vocab-${item.id}`}
                      checked={!!item.isSelected}
                      onCheckedChange={(checked) => onSelectionChange(item.id, Boolean(checked))}
                  />
                  <label htmlFor={`vocab-${item.id}`} className="flex-1 grid grid-cols-2 gap-4 cursor-pointer">
                    <span className="font-medium">{item.term}</span>
                    <span className="text-muted-foreground">{item.definition}</span>
                  </label>
                </Card>
              ))
            ) : (
              !isLoading && <p className="p-4 text-center text-muted-foreground text-sm">Keine Vokabeln in diesem Stapel.</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

// Add isSelected to VocabularyItem for local state management
declare module '@/lib/types' {
    interface VocabularyItem {
        isSelected?: boolean;
    }
}
