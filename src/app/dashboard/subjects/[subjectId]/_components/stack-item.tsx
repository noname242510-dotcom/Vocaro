
'use client';

import { useState, useEffect } from 'react';
import { collection, doc, writeBatch, getDocs, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { Stack, VocabularyItem } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Pen, Trash2, Loader2, Plus, MoreHorizontal, Languages } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSettings } from '@/contexts/settings-context';


interface StackItemProps {
  stack: Stack;
  subjectId: string;
  vocabulary: VocabularyItem[];
  onSelectionChange: (vocabId: string, isSelected: boolean) => void;
  onDelete: () => void;
  onRename: () => void;
  onAddVocab: (stack: Stack) => void;
  onEditVocab: (vocab: VocabularyItem) => void;
}

export function StackItem({ stack, subjectId, vocabulary, onSelectionChange, onDelete, onRename, onAddVocab, onEditVocab }: StackItemProps) {
  const { firestore, user } = useFirebase();
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newStackName, setNewStackName] = useState(stack.name);
  const [displayTermFirst, setDisplayTermFirst] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    if (settings) {
      setDisplayTermFirst(settings.vocabOverviewDirection !== 'definition');
    }
  }, [settings]);

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
      toast({ title: 'Erfolg', description: 'Stapel wurde umbenannt.' });
      setIsRenameDialogOpen(false);
      onRename();
    } catch (error) {
      console.error("Error renaming stack: ", error);
      toast({ variant: 'destructive', title: 'Fehler beim Umbenennen', description: 'Der Stapel konnte nicht umbenannt werden.' });
    }
  };


  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-none rounded-2xl bg-secondary/30 backdrop-blur-sm overflow-hidden transition-all duration-300">
        <div className="w-full p-5 flex items-center justify-between group">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                className="w-5 h-5 rounded-md border-2 border-primary/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                checked={allVisibleInStackSelected}
                onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
              />
            </div>
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer flex-1 flex items-center gap-3 min-w-0">
                <h3 className="font-headline text-xl font-bold truncate">{stack.name}</h3>
                <Badge variant="secondary" className="bg-background/50 rounded-lg font-bold">
                  {vocabulary.length || 0}
                </Badge>
              </div>
            </CollapsibleTrigger>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-background/50">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-2xl">
                  <DropdownMenuItem onClick={() => onAddVocab(stack)} className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Hinzufügen</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setNewStackName(stack.name);
                    setIsRenameDialogOpen(true)
                  }} className="rounded-xl">
                    <Pen className="mr-2 h-4 w-4" />
                    <span>Umbenennen</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive rounded-xl">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Löschen</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop Buttons */}
            <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-background/50" onClick={() => onAddVocab(stack)}>
                <Plus className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-background/50" onClick={() => {
                setNewStackName(stack.name);
                setIsRenameDialogOpen(true)
              }}>
                <Pen className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-background/50 text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-background/50">
                <ChevronDown className={cn('h-6 w-6 transition-transform duration-300', isOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-3">
            {vocabulary && vocabulary.length > 0 ? (
              vocabulary.map((item) => (
                <Card
                  key={item.id}
                  className="flex items-center gap-4 p-4 rounded-2xl hover:bg-background/80 transition-colors shadow-sm border-none bg-background/50"
                >
                  <Checkbox
                    id={`vocab-${item.id}`}
                    className="w-5 h-5 rounded-md"
                    checked={!!item.isSelected}
                    onCheckedChange={(checked) => onSelectionChange(item.id, Boolean(checked))}
                  />
                  <label htmlFor={`vocab-${item.id}`} className="flex-1 grid grid-cols-2 items-center gap-6 cursor-pointer">
                    <span className="font-bold text-lg break-words hyphens-auto">{displayTermFirst ? item.term : item.definition}</span>
                    <span className="text-muted-foreground font-medium break-words hyphens-auto">{displayTermFirst ? item.definition : item.term}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {item.relatedWord && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-secondary">
                            <Languages className="h-5 w-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3 rounded-2xl shadow-xl">
                          <div className="text-sm font-medium">
                            <span className="text-primary font-bold">{item.relatedWord.language}:</span> {item.relatedWord.word}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-secondary" onClick={() => onEditVocab(item)}>
                      <Pen className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <p className="p-8 text-center text-muted-foreground text-sm bg-background/30 rounded-2xl italic">Keine Vokabeln in diesem Stapel.</p>
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

