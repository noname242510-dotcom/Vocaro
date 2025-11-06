

'use client';

import { useState, useEffect } from 'react';
import { collection, doc, writeBatch, getDocs, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { Stack, VocabularyItem } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Pen, Trash2, Loader2, Plus, MoreHorizontal } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


interface StackItemProps {
  stack: Stack;
  subjectId: string;
  vocabulary: VocabularyItem[];
  onSelectionChange: (vocabId: string, isSelected: boolean) => void;
  onDelete: () => void;
  onRename: () => void;
  onAddVocab: (stack: Stack) => void;
}

export function StackItem({ stack, subjectId, vocabulary, onSelectionChange, onDelete, onRename, onAddVocab }: StackItemProps) {
  const { firestore, user } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newStackName, setNewStackName] = useState(stack.name);
  const [isTermFirst, setIsTermFirst] = useState(true);
  
  const { toast } = useToast();
  
  useEffect(() => {
    // query-direction-overview: false = German word first, true = foreign term first
    const setting = localStorage.getItem('query-direction-overview') === 'true';
    setIsTermFirst(setting);
  }, []);

  const allVisibleInStackSelected = vocabulary.length > 0 && vocabulary.every(v => v.isSelected);

  const handleSelectAll = (checked: boolean) => {
    vocabulary?.forEach(v => {
        onSelectionChange(v.id, checked);
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

  const handleRenameStack = async () => {
    if (!firestore || !user || !newStackName.trim()) {
        toast({ variant: 'destructive', title: 'Fehler', description: 'Der Stapelname darf nicht leer sein.' });
        return;
    }
    const stackDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stack.id);
    try {
        await updateDoc(stackDocRef, { name: newStackName });
        toast({ title: 'Erfolg', description: 'Stapel wurde umbenannt.'});
        setIsRenameDialogOpen(false);
        onRename();
    } catch (error) {
        console.error("Error renaming stack: ", error);
        toast({ variant: 'destructive', title: 'Fehler beim Umbenennen', description: 'Der Stapel konnte nicht umbenannt werden.' });
    }
  };


  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-2xl bg-card">
        <div className="w-full p-4 flex items-center justify-between group">
           <div className="flex items-center gap-4 flex-1">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                    checked={allVisibleInStackSelected}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                />
              </div>
              <CollapsibleTrigger asChild>
                <div className="cursor-pointer flex-1 flex items-center gap-2">
                    <h3 className="font-headline text-lg">{stack.name}</h3>
                    <Badge variant="secondary">
                        {vocabulary.length || 0}
                        <span className="hidden sm:inline">&nbsp;Vokabeln</span>
                    </Badge>
                </div>
              </CollapsibleTrigger>
          </div>
          <div className="flex items-center gap-1">
            
            {/* Desktop Buttons */}
            <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onAddVocab(stack)}>
                    <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => {
                  setNewStackName(stack.name);
                  setIsRenameDialogOpen(true)
                }}>
                    <Pen className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Mobile Dropdown */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onAddVocab(stack)}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Hinzufügen</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setNewStackName(stack.name);
                    setIsRenameDialogOpen(true)
                  }}>
                    <Pen className="mr-2 h-4 w-4" />
                    <span>Umbenennen</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Löschen</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

             <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <ChevronDown className={cn('h-5 w-5 transition-transform duration-300', isOpen && 'rotate-180')} />
                </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {vocabulary && vocabulary.length > 0 ? (
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
                  <label htmlFor={`vocab-${item.id}`} className="flex-1 grid grid-cols-2 items-center gap-4 cursor-pointer">
                    <span className="font-medium break-words hyphens-auto">{isTermFirst ? item.term : item.definition}</span>
                    <span className="text-muted-foreground break-words hyphens-auto">{isTermFirst ? item.definition : item.term}</span>
                  </label>
                </Card>
              ))
            ) : (
              <p className="p-4 text-center text-muted-foreground text-sm">Keine Vokabeln in diesem Stapel.</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stapel umbenennen</DialogTitle>
            <DialogDescription>
              Gib einen neuen Namen für den Stapel ein.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stack-name" className="text-right">
                Name
              </Label>
              <Input
                id="stack-name"
                value={newStackName}
                onChange={(e) => setNewStackName(e.target.value)}
                className="col-span-3"
                onKeyDown={(e) => e.key === 'Enter' && handleRenameStack()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleRenameStack}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
    </>
  );
}

// Add isSelected to VocabularyItem for local state management
declare module '@/lib/types' {
    interface VocabularyItem {
        isSelected?: boolean;
    }
}
