'use client';

import { useState, useMemo, ChangeEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  MoreVertical,
  Plus,
  Upload,
  Pen,
  Trash2,
  BookCopy,
  Zap,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Circle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { Stack, Subject, VocabularyItem } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { suggestVocabularyFromImageContext } from '@/ai/flows/suggest-vocabulary-from-image-context';
import { generateVocabularyFromExtractedText } from '@/ai/flows/generate-vocabulary-from-extracted-text';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, writeBatch, serverTimestamp, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { StackItem } from './_components/stack-item';
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
import { cn } from '@/lib/utils';


export default function SubjectDetailPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const params = useParams();
  const subjectId = params.subjectId as string;

  const [allVocabulary, setAllVocabulary] = useState<Record<string, VocabularyItem[]>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [manualTerm, setManualTerm] = useState('');
  const [manualDefinition, setManualDefinition] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [isOcrDialogOpen, setIsOcrDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteVocabDialogOpen, setIsDeleteVocabDialogOpen] = useState(false);
  const [renamedSubjectName, setRenamedSubjectName] = useState('');
  const { toast } = useToast();

  const subjectDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'subjects', subjectId);
  }, [firestore, user, subjectId]);

  const { data: subject, isLoading: isSubjectLoading, forceUpdate: forceSubjectUpdate } = useDoc<Subject>(subjectDocRef);

  const stacksCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks');
  }, [firestore, user, subjectId]);

  const { data: stacks, isLoading: areStacksLoading, forceUpdate } = useCollection<Stack>(stacksCollectionRef);

  useEffect(() => {
    if (subject) {
      setRenamedSubjectName(subject.name);
    }
  }, [subject]);

  const fetchAllVocab = async () => {
    if (stacks && firestore && user) {
      const vocabData: Record<string, VocabularyItem[]> = {};
      const currentSelection = new Set(selectedVocab);
      for (const stack of stacks) {
        const vocabCollectionRef = collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stack.id, 'vocabulary');
        const vocabSnapshot = await getDocs(vocabCollectionRef);
        vocabData[stack.id] = vocabSnapshot.docs.map(d => ({ ...d.data(), id: d.id, isSelected: currentSelection.has(d.id) } as VocabularyItem));
      }
      setAllVocabulary(vocabData);
    }
  };

  useEffect(() => {
    fetchAllVocab();
  }, [stacks, firestore, user, subjectId]);


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

  const handleRenameSubject = async () => {
    if (renamedSubjectName.trim() && user && firestore && subjectDocRef) {
      const newEmoji = getEmojiForSubject(renamedSubjectName);
      await updateDoc(subjectDocRef, {
        name: renamedSubjectName.trim(),
        emoji: newEmoji,
      });
      setIsRenameDialogOpen(false);
      forceSubjectUpdate();
      toast({ title: 'Erfolg', description: 'Fach umbenannt.' });
    }
  };

  const handleDeleteSubject = async () => {
    if (!user || !firestore || !subjectDocRef || !stacksCollectionRef) return;
    
    try {
      const batch = writeBatch(firestore);
      
      if (stacks) {
        for (const stack of stacks) {
          const stackDocRef = doc(stacksCollectionRef, stack.id);
          const vocabSnapshot = await getDocs(collection(stackDocRef, 'vocabulary'));
          vocabSnapshot.forEach(vocabDoc => batch.delete(vocabDoc.ref));
          batch.delete(stackDocRef);
        }
      }
      
      batch.delete(subjectDocRef);

      await batch.commit();
      
      toast({ title: 'Erfolg', description: `Fach "${subject?.name}" wurde gelöscht.` });
      router.push('/dashboard');

    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({ variant: 'destructive', title: 'Fehler beim Löschen', description: 'Das Fach konnte nicht gelöscht werden.' });
    }
    setIsDeleteDialogOpen(false);
  };


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(null);
    }
  };

  const handleExtractAndSaveVocabulary = async () => {
    if (!previewImage) {
      toast({
        variant: "destructive",
        title: "Kein Bild ausgewählt",
        description: "Bitte wählen Sie zuerst ein Bild aus.",
      });
      return;
    }
     if (!newStackName) {
      toast({
        variant: "destructive",
        title: "Kein Stapelname",
        description: "Bitte geben Sie einen Namen für den neuen Stapel an.",
      });
      return;
    }

    setIsProcessingOcr(true);

    try {
      const ocrResult = await suggestVocabularyFromImageContext({ imageDataUri: previewImage });
      const extractedText = ocrResult.suggestedVocabulary.join('\n');
      
      if (!extractedText.trim()) {
        throw new Error("Im Bild wurde kein Text gefunden.");
      }

      const generationResult = await generateVocabularyFromExtractedText({ extractedText });
      const generatedVocab = generationResult.vocabulary;

      if (generatedVocab.length === 0) {
        throw new Error("Aus dem extrahierten Text konnten keine Vokabeln generiert werden.");
      }
      
      if (!user || !firestore || !stacksCollectionRef) {
         throw new Error("Benutzer nicht authentifiziert.");
      }

      const stackRef = await addDoc(stacksCollectionRef, {
        name: newStackName,
        createdAt: serverTimestamp(),
        vocabCount: generatedVocab.length,
        subjectId: subjectId,
      });

      const batch = writeBatch(firestore);
      const vocabCollectionRef = collection(stackRef, 'vocabulary');
      generatedVocab.forEach((vocabItem) => {
        const newVocabRef = doc(vocabCollectionRef);
        batch.set(newVocabRef, {
          term: vocabItem.term,
          definition: vocabItem.definition,
          notes: vocabItem.notes || '',
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();

      toast({ title: 'Erfolg!', description: `${generatedVocab.length} Vokabeln im neuen Stapel "${newStackName}" gespeichert.` });
      
      setNewStackName('');
      setPreviewImage(null);
      setIsOcrDialogOpen(false);
      forceUpdate();
      fetchAllVocab();

    } catch (error: any) {
      console.error("Error during OCR and save process:", error);
      toast({
        variant: "destructive",
        title: "Fehler beim Verarbeiten",
        description: error.message || "Der Vorgang konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
      });
    } finally {
      setIsProcessingOcr(false);
    }
  };


  const handleAddManualVocabulary = async (closeOnFinish = true) => {
    if (!manualTerm || !manualDefinition || !newStackName || !user || !firestore || !stacksCollectionRef) {
        toast({ variant: 'destructive', title: 'Fehlende Informationen', description: 'Bitte füllen Sie Stapelname, Begriff und Definition aus.' });
        return;
    }
    setIsAddingManually(true);
    try {
        let stackRef;
        const existingStacks = stacks?.filter(s => s.name === newStackName);

        if (existingStacks && existingStacks.length > 0) {
            stackRef = doc(stacksCollectionRef, existingStacks[0].id);
            await updateDoc(stackRef, {
                vocabCount: (existingStacks[0].vocabCount || 0) + 1
            });
        } else {
            stackRef = await addDoc(stacksCollectionRef, {
                name: newStackName,
                createdAt: serverTimestamp(),
                vocabCount: 1,
                subjectId: subjectId,
            });
        }


        await addDoc(collection(stackRef, 'vocabulary'), {
            term: manualTerm,
            definition: manualDefinition,
            notes: manualNotes,
            createdAt: serverTimestamp(),
        });
        
        toast({ title: 'Erfolg', description: 'Vokabel hinzugefügt.' });
        setManualTerm('');
        setManualDefinition('');
        setManualNotes('');
        if (closeOnFinish) {
          setNewStackName('');
          setIsOcrDialogOpen(false);
        }
        forceUpdate();
        fetchAllVocab();

    } catch (error) {
        console.error("Error adding manual vocabulary:", error);
        toast({ variant: 'destructive', title: 'Fehler', description: 'Konnte Vokabel nicht hinzufügen.' });
    } finally {
        setIsAddingManually(false);
    }
  };
  
  const handleAddMoreVocabulary = () => {
    handleAddManualVocabulary(false);
  }
  
  const handleSelectionChange = (vocabId: string, isSelected: boolean) => {
    setAllVocabulary(currentVocab => {
        const newVocab = { ...currentVocab };
        for (const stackId in newVocab) {
            newVocab[stackId] = newVocab[stackId].map(v => 
                v.id === vocabId ? { ...v, isSelected } : v
            );
        }
        return newVocab;
    });
  };

  const selectedVocab = useMemo(() => {
    return Object.values(allVocabulary).flat().filter(v => v.isSelected).map(v => v.id);
  }, [allVocabulary]);


  const handleStartLearning = () => {
    if (selectedVocab.length > 0) {
      sessionStorage.setItem('learn-session-vocab', JSON.stringify(selectedVocab));
      sessionStorage.setItem('learn-session-subject', subjectId);
      router.push(`/dashboard/learn`);
    }
  };
  
  const handleDeleteSelectedVocabulary = async () => {
    if (!user || !firestore || !stacks || selectedVocab.length === 0) {
      return;
    }
  
    const batch = writeBatch(firestore);
    let deletedCount = 0;
  
    const vocabToStackMap: Record<string, string> = {};
    Object.entries(allVocabulary).forEach(([stackId, vocabs]) => {
      vocabs.forEach(v => {
        vocabToStackMap[v.id] = stackId;
      });
    });
  
    selectedVocab.forEach(vocabId => {
      const stackId = vocabToStackMap[vocabId];
      if (stackId) {
        const vocabDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stackId, 'vocabulary', vocabId);
        batch.delete(vocabDocRef);
        deletedCount++;
      }
    });
  
    try {
      await batch.commit();
      toast({
        title: 'Erfolg',
        description: `${deletedCount} Vokabel(n) wurden gelöscht.`,
      });
      // Deselect all and refetch
      setAllVocabulary(prev => {
        const deselected = { ...prev };
        for (const stackId in deselected) {
          deselected[stackId] = deselected[stackId].map(v => ({ ...v, isSelected: false }));
        }
        return deselected;
      });
      forceUpdate(); // Re-fetch stacks which will trigger vocab re-fetch
      fetchAllVocab();
    } catch (error) {
      console.error("Error deleting selected vocabulary:", error);
      toast({
        variant: 'destructive',
        title: 'Fehler beim Löschen',
        description: 'Die ausgewählten Vokabeln konnten nicht gelöscht werden.',
      });
    } finally {
      setIsDeleteVocabDialogOpen(false);
    }
  };


  if (isSubjectLoading || areStacksLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  if (!subject) {
    return (
      <div className="text-center">
        <h2 className="text-xl">Fach nicht gefunden</h2>
        <Button asChild variant="link">
            <Link href="/dashboard">Zurück zum Dashboard</Link>
        </Button>
      </div>
    );
  }

  const isAnyVocabSelected = selectedVocab.length > 0;

  return (
    <div className="pb-24">
      {/* Sticky Header */}
      <div className="sticky top-24 md:top-20 z-30 p-2 flex items-center justify-between mb-6 w-full max-w-4xl mx-auto group glass-effect shadow-md">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <span className="text-3xl md:text-4xl">{subject.emoji}</span>
          <h1 className="text-xl md:text-2xl font-bold font-headline truncate">{subject.name}</h1>
          <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Pen className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Fach umbenennen</DialogTitle>
                  <DialogDescription>
                    Geben Sie einen neuen Namen für das Fach &quot;{subject?.name}&quot; ein.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="rename-name" className="text-right">Name</Label>
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
                  <Button onClick={handleRenameSubject}>Speichern</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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
                    Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird das Fach und alle zugehörigen Stapel und Vokabeln dauerhaft gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSubject}>Löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="flex items-center gap-2">
            
        </div>
      </div>

      {(stacks?.length ?? 0) === 0 ? (
        <div className="text-center mt-20 text-muted-foreground">
            <BookCopy className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold">Noch keine Stapel</h3>
            <p className="text-sm">Füge Vokabeln hinzu, um deinen ersten Stapel zu erstellen.</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl mx-auto">
        {stacks?.map((stack) => (
          <StackItem 
            key={stack.id} 
            stack={stack}
            subjectId={subjectId}
            vocabulary={allVocabulary[stack.id] || []}
            onDelete={() => { forceUpdate(); fetchAllVocab(); }}
            onRename={() => { forceUpdate(); fetchAllVocab(); }}
            onSelectionChange={handleSelectionChange}
          />
        ))}
        </div>
      )}


      {/* Floating Action Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto mx-auto z-40">
         <div className="p-2 flex items-center justify-between gap-2">
            <AlertDialog open={isDeleteVocabDialogOpen} onOpenChange={setIsDeleteVocabDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="transition-opacity duration-300 rounded-full"
                    disabled={!isAnyVocabSelected}
                >
                    <Trash2 className={cn("h-5 w-5", !isAnyVocabSelected && "text-muted-foreground")} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Es werden {selectedVocab.length} Vokabel(n) dauerhaft gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelectedVocabulary}>Löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button 
                className="rounded-full text-base px-8" 
                disabled={!isAnyVocabSelected}
                onClick={handleStartLearning}
            >
                Lernen
                <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <Dialog open={isOcrDialogOpen} onOpenChange={setIsOcrDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-11 w-11 rounded-full">
                        <Plus className="h-6 w-6" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                  <DialogHeader>
                    <DialogTitle>Neue Vokabeln hinzufügen</DialogTitle>
                    <DialogDescription>
                      Füge Begriffe manuell hinzu oder lade ein Bild hoch, um Text zu extrahieren.
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="manual">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual"><Pen className="mr-2 h-4 w-4" />Manuell</TabsTrigger>
                      <TabsTrigger value="ocr"><Upload className="mr-2 h-4 w-4" />aus Bild</TabsTrigger>
                    </TabsList>
                    <TabsContent value="manual" className="pt-4">
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="stack-name">Stapelname</Label>
                            <Input id="stack-name" placeholder="z.B. Kapitel 1" value={newStackName} onChange={e => setNewStackName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="term">Fremdwort</Label>
                          <Input id="term" placeholder="z.B., Hola" value={manualTerm} onChange={e => setManualTerm(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="definition">Deutsches Wort</Label>
                          <Input id="definition" placeholder="z.B., Hallo" value={manualDefinition} onChange={e => setManualDefinition(e.target.value)} />
                        </div>
                         <div className="grid gap-2">
                          <Label htmlFor="notes">Hinweise (optional)</Label>
                          <Textarea id="notes" placeholder="z.B., Begrüßung" value={manualNotes} onChange={e => setManualNotes(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-2">
                           <Button variant="outline" onClick={handleAddMoreVocabulary} disabled={isAddingManually}>
                            {isAddingManually && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Weitere Begriffe hinzufügen
                          </Button>
                          <Button onClick={() => handleAddManualVocabulary(true)} disabled={isAddingManually}>
                              {isAddingManually && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Begriff hinzufügen
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="ocr" className="pt-4">
                      <div className="grid gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="stack-name-ocr">Stapelname</Label>
                            <Input id="stack-name-ocr" placeholder="z.B. Aus meinem Notizbuch" value={newStackName} onChange={e => setNewStackName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="picture">Bild</Label>
                          <Input id="picture" type="file" onChange={handleFileChange} accept="image/*" disabled={isProcessingOcr} multiple />
                        </div>

                        {isProcessingOcr ? (
                            <Button disabled>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verarbeite und speichere...
                            </Button>
                        ) : (
                             <Button onClick={handleExtractAndSaveVocabulary} disabled={!previewImage || !newStackName}>
                              <Upload className="mr-2 h-4 w-4" />
                              Extrahieren und Speichern
                            </Button>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
            </Dialog>
         </div>
      </div>
    </div>
  );
}
