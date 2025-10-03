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


export default function SubjectDetailPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const params = useParams();
  const subjectId = params.subjectId as string;

  const [selectedVocab, setSelectedVocab] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [manualTerm, setManualTerm] = useState('');
  const [manualDefinition, setManualDefinition] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [isOcrDialogOpen, setIsOcrDialogOpen] = useState(false);
  const { toast } = useToast();

  const subjectDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'subjects', subjectId);
  }, [firestore, user, subjectId]);

  const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

  const stacksCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks');
  }, [firestore, user, subjectId]);

  const { data: stacks, isLoading: areStacksLoading, forceUpdate } = useCollection<Stack>(stacksCollectionRef);

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
      // 1. Extract text from image
      const ocrResult = await suggestVocabularyFromImageContext({ imageDataUri: previewImage });
      const extractedText = ocrResult.suggestedVocabulary.join('\n');
      
      if (!extractedText.trim()) {
        throw new Error("Im Bild wurde kein Text gefunden.");
      }

      // 2. Generate structured vocabulary from text
      const generationResult = await generateVocabularyFromExtractedText({ extractedText });
      const generatedVocab = generationResult.vocabulary;

      if (generatedVocab.length === 0) {
        throw new Error("Aus dem extrahierten Text konnten keine Vokabeln generiert werden.");
      }
      
      // 3. Save to Firestore
      if (!user || !firestore) {
         throw new Error("Benutzer nicht authentifiziert.");
      }

      const stackRef = await addDoc(stacksCollectionRef!, {
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
      
      // 4. Reset state and close dialog
      setNewStackName('');
      setPreviewImage(null);
      setIsOcrDialogOpen(false);

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
            subjectId: subjectId,
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

  const handleStartLearning = () => {
    if (selectedVocab.length > 0) {
      sessionStorage.setItem('learn-session-vocab', JSON.stringify(selectedVocab));
      sessionStorage.setItem('learn-session-subject', subjectId);
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
      <div className="sticky top-24 md:top-20 z-30 p-2 flex items-center justify-between mb-6 w-full max-w-4xl mx-auto group glass-effect shadow-md">
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
            subjectId={subjectId}
            onDelete={() => forceUpdate()}
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
                          <Input id="picture" type="file" onChange={handleFileChange} accept="image/*" disabled={isProcessingOcr} />
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
                        
                        {previewImage && !isProcessingOcr && (
                            <div className="relative w-full aspect-video rounded-md border p-1">
                                <Image src={previewImage} alt="Vorschau" layout="fill" objectFit="contain" />
                            </div>
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
