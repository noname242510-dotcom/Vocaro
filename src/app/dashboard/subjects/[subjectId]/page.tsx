'use client';

import { useState, useMemo, ChangeEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MoreVertical,
  Plus,
  Upload,
  Pen,
  Trash2,
  BookCopy,
  Zap,
  Clock,
  ArrowLeft,
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
import { doc, collection, addDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { StackItem } from './_components/stack-item';


export default function SubjectDetailPage({ params }: { params: { subjectId: string } }) {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const [selectedVocab, setSelectedVocab] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [newStackName, setNewStackName] = useState('');
  const [manualTerm, setManualTerm] = useState('');
  const [manualDefinition, setManualDefinition] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [generatedVocab, setGeneratedVocab] = useState<VocabularyItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOcrDialogOpen, setIsOcrDialogOpen] = useState(false);
  const { toast } = useToast();

  const subjectDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'subjects', params.subjectId);
  }, [firestore, user, params.subjectId]);

  const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

  const stacksCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects', params.subjectId, 'stacks');
  }, [firestore, user, params.subjectId]);

  const { data: stacks, isLoading: areStacksLoading } = useCollection<Stack>(stacksCollectionRef);


  useEffect(() => {
    if (extractedText && !isGenerating) {
      handleGenerateVocabulary();
    }
  }, [extractedText]);

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

  const handleExtractVocabulary = async () => {
    if (!previewImage) {
      toast({
        variant: "destructive",
        title: "Kein Bild ausgewählt",
        description: "Bitte wählen Sie zuerst ein Bild aus.",
      });
      return;
    }

    setIsExtracting(true);
    setGeneratedVocab([]);
    try {
      // This flow now just does OCR
      const result = await suggestVocabularyFromImageContext({ imageDataUri: previewImage });
      setExtractedText(result.suggestedVocabulary.join('\n'));
      toast({
        title: "Text extrahiert!",
        description: `Text wurde erfolgreich aus dem Bild gelesen.`,
      });
    } catch (error) {
      console.error("Error extracting vocabulary:", error);
      toast({
        variant: "destructive",
        title: "Fehler bei der Extraktion",
        description: "Der Text konnte nicht extrahiert werden. Bitte versuchen Sie es erneut.",
      });
      setIsExtracting(false); // Only set to false on error, success leads to generation
    }
  };

  const handleGenerateVocabulary = async () => {
    if (!extractedText) return;

    setIsGenerating(true);
    try {
      const result = await generateVocabularyFromExtractedText({ extractedText });
      const vocabWithTempIds = result.vocabulary.map(v => ({ ...v, id: crypto.randomUUID() }));
      setGeneratedVocab(vocabWithTempIds as VocabularyItem[]);
      toast({
        title: "Vokabeln generiert!",
        description: `${result.vocabulary.length} Begriffe gefunden.`,
      });
    } catch (error) {
      console.error("Error generating vocabulary:", error);
      toast({
        variant: "destructive",
        title: "Fehler bei der Vokabelgenerierung",
        description: "Die Vokabeln konnten nicht generiert werden.",
      });
    } finally {
      setIsExtracting(false);
      setIsGenerating(false);
    }
  };

  const handleAddManualVocabulary = async () => {
    if (!manualTerm || !manualDefinition || !newStackName || !user || !firestore) {
        toast({ variant: 'destructive', title: 'Fehlende Informationen', description: 'Bitte füllen Sie Stapelname, Begriff und Definition aus.' });
        return;
    }
    setIsAddingManually(true);
    try {
        const stackRef = await addDoc(stacksCollectionRef!, {
            name: newStackName,
            createdAt: serverTimestamp(),
            vocabCount: 1,
            subjectId: params.subjectId,
        });

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
        setNewStackName('');
        setIsOcrDialogOpen(false);

    } catch (error) {
        console.error("Error adding manual vocabulary:", error);
        toast({ variant: 'destructive', title: 'Fehler', description: 'Konnte Vokabel nicht hinzufügen.' });
    } finally {
        setIsAddingManually(false);
    }
  };

  const handleSaveOcrVocabulary = async () => {
    if (!newStackName || generatedVocab.length === 0 || !user || !firestore) {
      toast({ variant: 'destructive', title: 'Fehlende Informationen', description: 'Bitte geben Sie einen Stapelnamen an und extrahieren Sie Vokabeln.' });
      return;
    }
    setIsGenerating(true); // Reuse loading state
    try {
      // Create new stack document
      const stackRef = await addDoc(stacksCollectionRef!, {
        name: newStackName,
        createdAt: serverTimestamp(),
        vocabCount: generatedVocab.length,
        subjectId: params.subjectId,
      });

      // Batch write all vocabulary items
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
      // Reset state
      setNewStackName('');
      setPreviewImage(null);
      setExtractedText(null);
      setGeneratedVocab([]);
      setIsOcrDialogOpen(false);

    } catch (error) {
      console.error("Error saving OCR vocabulary:", error);
      toast({ variant: 'destructive', title: 'Fehler beim Speichern', description: 'Die Vokabeln konnten nicht gespeichert werden.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartLearning = () => {
    if (selectedVocab.length > 0) {
      // We need a way to pass selected vocab to the learn page.
      // The learn page is generic and doesn't belong to a single stack.
      // We will use sessionStorage to pass the vocab IDs.
      sessionStorage.setItem('learn-session-vocab', JSON.stringify(selectedVocab));
      sessionStorage.setItem('learn-session-subject', params.subjectId);
      router.push(`/dashboard/learn`);
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
      <div className="sticky top-24 md:top-20 z-30 p-2 flex items-center justify-between mb-6 w-full max-w-4xl mx-auto group glass-effect">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <span className="text-3xl md:text-4xl">{subject.emoji}</span>
          <h1 className="text-xl md:text-2xl font-bold font-headline truncate">{subject.name}</h1>
          <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Pen className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="secondary" className="rounded-full relative">
                <Clock className="mr-2 h-4 w-4" />
                Wiederholen
                <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">0</Badge>
            </Button>
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
            subjectId={params.subjectId}
            onSelectionChange={(vocabId, isSelected) => {
              setSelectedVocab(prev => 
                isSelected ? [...prev, vocabId] : prev.filter(id => id !== vocabId)
              )
            }}
          />
        ))}
        </div>
      )}


      {/* Floating Action Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md mx-auto z-50">
         <div className="glass-effect p-2 rounded-full flex items-center justify-between gap-2">
            <Button 
                variant="ghost" 
                size="icon" 
                className={`transition-opacity duration-300 rounded-full ${isAnyVocabSelected ? 'opacity-100' : 'opacity-0'}`}
                disabled={!isAnyVocabSelected}
            >
                <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
            
            <Button 
                className="flex-1 rounded-full text-base" 
                disabled={!isAnyVocabSelected}
                onClick={handleStartLearning}
            >
                <Zap className="mr-2 h-5 w-5" /> 
                Lernen ({selectedVocab.length})
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
                      Füge Begriffe manuell hinzu oder lade ein Bild hoch, um Text mit OCR zu extrahieren.
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="manual">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual"><Pen className="mr-2 h-4 w-4" />Manuell</TabsTrigger>
                      <TabsTrigger value="ocr"><Upload className="mr-2 h-4 w-4" />OCR aus Bild</TabsTrigger>
                    </TabsList>
                    <TabsContent value="manual" className="pt-4">
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="stack-name">Stapelname</Label>
                            <Input id="stack-name" placeholder="z.B. Kapitel 1" value={newStackName} onChange={e => setNewStackName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="term">Begriff</Label>
                          <Input id="term" placeholder="z.B., Hola" value={manualTerm} onChange={e => setManualTerm(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="definition">Definition</Label>
                          <Textarea id="definition" placeholder="z.B., Hallo" value={manualDefinition} onChange={e => setManualDefinition(e.target.value)} />
                        </div>
                         <div className="grid gap-2">
                          <Label htmlFor="notes">Hinweise (optional)</Label>
                          <Textarea id="notes" placeholder="z.B., Begrüßung" value={manualNotes} onChange={e => setManualNotes(e.target.value)} />
                        </div>
                        <Button onClick={handleAddManualVocabulary} disabled={isAddingManually}>
                            {isAddingManually && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Begriff hinzufügen
                        </Button>
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
                          <Input id="picture" type="file" onChange={handleFileChange} accept="image/*" disabled={isExtracting || isGenerating} />
                        </div>
                        {(isExtracting || isGenerating) && (
                            <div className="flex flex-col items-center justify-center h-64 rounded-md border border-dashed bg-muted/40">
                                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                                <p className="mt-4 text-muted-foreground">{isGenerating ? 'Generiere Vokabeln...' : 'Extrahiere Text...'}</p>
                            </div>
                        )}

                        {generatedVocab.length > 0 && !isExtracting && !isGenerating && (
                            <>
                            <div className="space-y-2 max-h-64 overflow-y-auto rounded-md border p-4">
                                {generatedVocab.map((item) => (
                                    <div key={item.id} className="grid grid-cols-2 gap-4 text-sm">
                                        <p className="font-medium">{item.term}</p>
                                        <p className="text-muted-foreground">{item.definition}</p>
                                    </div>
                                ))}
                            </div>
                             <Button onClick={handleSaveOcrVocabulary} disabled={isGenerating}>
                                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Vokabeln Speichern
                            </Button>
                            </>
                        )}
                        
                        {generatedVocab.length === 0 && !isExtracting && !isGenerating && (
                             <Button onClick={handleExtractVocabulary} disabled={!previewImage}>
                              <Upload className="mr-2 h-4 w-4" />
                              Vokabeln extrahieren
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

    