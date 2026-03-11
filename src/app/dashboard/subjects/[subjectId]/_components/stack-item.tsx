
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
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/stack w-full h-fit self-start">
        <Card className="rounded-[2.5rem] border-none bg-white shadow-xl shadow-primary/5 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10">
          <div className="p-8 flex items-center justify-between gap-6">
            <div className="flex items-center gap-6 flex-1 min-w-0">
              <Checkbox
                className="w-8 h-8 rounded-xl border-2 border-primary/10 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all scale-110"
                checked={allVisibleInStackSelected}
                onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
              />
              <CollapsibleTrigger asChild>
                <div className="cursor-pointer flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-creative text-2xl font-black truncate text-foreground group-hover/stack:text-primary transition-colors">{stack.name}</h3>
                    <div className="bg-secondary/50 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {vocabulary.length || 0}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Zuletzt geübt: Vor 2 Tagen</p>
                </div>
              </CollapsibleTrigger>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-secondary/50 group-hover/stack:opacity-100 opacity-60 transition-all">
                    <MoreHorizontal className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-[1.5rem] p-2 shadow-2xl border-none">
                  <DropdownMenuItem onClick={() => onAddVocab(stack)} className="rounded-xl px-4 py-3 font-bold gap-3 cursor-pointer">
                    <Plus className="h-4 w-4" /> Vokabel hinzufügen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setNewStackName(stack.name); setIsRenameDialogOpen(true) }} className="rounded-xl px-4 py-3 font-bold gap-3 cursor-pointer">
                    <Pen className="h-4 w-4" /> Umbenennen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="rounded-xl px-4 py-3 font-bold gap-3 text-destructive focus:text-destructive cursor-pointer">
                    <Trash2 className="h-4 w-4" /> Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-all">
                  <ChevronDown className={cn('h-6 w-6 transition-transform duration-500', isOpen && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent className="animate-in slide-in-from-top-4 duration-500">
            <div className="px-8 pb-8 space-y-3">
              <div className="h-px bg-border/50 mb-6" />
              {vocabulary && vocabulary.length > 0 ? (
                vocabulary.map((item) => (
                  <div
                    key={item.id}
                    className="group/item flex items-center gap-6 p-6 rounded-[2rem] hover:bg-primary/5 transition-all border border-transparent hover:border-primary/5 relative"
                  >
                    <Checkbox
                      id={`vocab-${item.id}`}
                      className="w-6 h-6 rounded-lg border-2"
                      checked={!!item.isSelected}
                      onCheckedChange={(checked) => onSelectionChange(item.id, Boolean(checked))}
                    />
                    <label htmlFor={`vocab-${item.id}`} className="flex-1 grid grid-cols-2 items-center gap-8 cursor-pointer">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xl block text-foreground leading-tight">{displayTermFirst ? item.term : item.definition}</span>
                        {item.phonetic && <span className="text-xs font-medium text-muted-foreground/60 tracking-wider">[{item.phonetic}]</span>}
                      </div>
                      <span className="text-muted-foreground font-semibold text-lg">{displayTermFirst ? item.definition : item.term}</span>
                    </label>
                    <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      {item.relatedWord && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2">
                              <Languages className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4 rounded-2xl shadow-2xl border-none">
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Synonym / Verwandt</p>
                            <p className="text-base font-bold">
                              <span className="text-primary">{item.relatedWord.language}:</span> {item.relatedWord.word}
                            </p>
                          </PopoverContent>
                        </Popover>
                      )}
                      <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2" onClick={() => onEditVocab(item)}>
                        <Pen className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-muted-foreground space-y-4">
                  <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto">
                    <Book className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="font-bold">Keine Vokabeln in diesem Stapel.</p>
                  <Button variant="outline" onClick={() => onAddVocab(stack)} className="rounded-xl border-2 font-bold">
                    Jetzt hinzufügen
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-10">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold font-headline">Stapel umbenennen</DialogTitle>
            <DialogDescription className="text-lg mt-2">
              Wie soll dein Vokabelstapel ab jetzt heißen?
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 space-y-4">
            <Label htmlFor="stack-name" className="font-bold text-xs uppercase tracking-widest opacity-60">Stapelname</Label>
            <Input
              id="stack-name"
              value={newStackName}
              onChange={(e) => setNewStackName(e.target.value)}
              className="h-14 rounded-2xl border-2 text-lg px-6"
              onKeyDown={(e) => e.key === 'Enter' && handleRenameStack()}
            />
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)} className="h-14 rounded-2xl border-2 font-bold text-lg">Abbrechen</Button>
            <Button onClick={handleRenameStack} className="h-14 rounded-2xl font-bold text-lg px-10">Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] p-10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-bold font-headline">Stapel löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-lg mt-4">
              Bist du sicher? Alle Vokabeln in &quot;{stack.name}&quot; werden unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-4 mt-8">
            <AlertDialogCancel className="h-14 rounded-2xl border-2 font-bold text-lg">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStack} disabled={isDeleting} className="h-14 rounded-2xl bg-destructive hover:bg-destructive/90 font-bold text-lg">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

