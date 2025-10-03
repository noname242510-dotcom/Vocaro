'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import type { Stack } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { suggestVocabularyFromImageContext } from '@/ai/flows/suggest-vocabulary-from-image-context';
import { useToast } from '@/hooks/use-toast';

// Mock data for demonstration until Firebase is fully integrated
const subject = { id: '1', name: 'Spanisch', emoji: '🇪🇸' };
const stacksData: Stack[] = []; // Start with no stacks

export default function SubjectDetailPage({ params }: { params: { subjectId: string } }) {
  const [stacks, setStacks] = useState<Stack[]>(stacksData);
  const [selectedVocab, setSelectedVocab] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
    try {
      const result = await suggestVocabularyFromImageContext({ imageDataUri: previewImage });
      console.log('Extracted Vocabulary:', result.suggestedVocabulary);
      // Here you would typically update the state to show the extracted vocab
      toast({
        title: "Vokabeln extrahiert!",
        description: `${result.suggestedVocabulary.length} Begriffe gefunden.`,
      });
    } catch (error) {
      console.error("Error extracting vocabulary:", error);
      toast({
        variant: "destructive",
        title: "Fehler bei der Extraktion",
        description: "Die Vokabeln konnten nicht extrahiert werden. Bitte versuchen Sie es erneut.",
      });
    } finally {
      setIsExtracting(false);
    }
  };


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
      <div className="sticky top-20 md:top-4 z-30 bg-background/80 backdrop-blur-sm rounded-full p-2 flex items-center justify-between shadow-md mb-6 w-full max-w-4xl mx-auto group border">
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

      {stacks.length === 0 ? (
        <div className="text-center mt-20 text-muted-foreground">
            <BookCopy className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold">Noch keine Stapel</h3>
            <p className="text-sm">Füge Vokabeln hinzu, um deinen ersten Stapel zu erstellen.</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl mx-auto">
        {stacks.map((stack) => (
          <Collapsible key={stack.id} defaultOpen className="border rounded-2xl">
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between group">
                <div className='flex items-center gap-4'>
                    <Circle className="h-5 w-5 text-muted-foreground/50" />
                    <h3 className="font-headline text-lg">{stack.name}</h3>
                    <Badge variant="secondary">{stack.vocabCount} Begriffe</Badge>
                </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{stack.lastStudied}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100"><Pen className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                <ChevronDown className="h-5 w-5 transition-transform duration-300 group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="px-4 pb-4 space-y-2">
                    {/* Vocabulary items would be rendered here */}
                    <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                        <Circle className="h-5 w-5 text-muted-foreground/50" />
                        <span className="flex-1">Hola</span>
                        <span className="flex-1 text-muted-foreground">Hallo</span>
                        <span className="flex-1 text-xs text-muted-foreground italic">Keine Hinweise</span>
                    </div>
                     <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                        <Circle className="h-5 w-5 text-muted-foreground/50" />
                        <span className="flex-1">Adiós</span>
                        <span className="flex-1 text-muted-foreground">Auf Wiedersehen</span>
                        <span className="flex-1 text-xs text-muted-foreground italic">Formell</span>
                    </div>
                </div>
            </CollapsibleContent>
          </Collapsible>
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
            >
                <Zap className="mr-2 h-5 w-5" /> 
                Lernen ({selectedVocab.length})
            </Button>

            <Dialog>
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
                            <Input id="stack-name" placeholder="z.B. Kapitel 1" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="term">Begriff</Label>
                          <Input id="term" placeholder="z.B., Hola" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="definition">Definition</Label>
                          <Textarea id="definition" placeholder="z.B., Hallo" />
                        </div>
                         <div className="grid gap-2">
                          <Label htmlFor="definition">Hinweise (optional)</Label>
                          <Textarea id="definition" placeholder="z.B., Begrüßung" />
                        </div>
                        <Button>Begriff hinzufügen</Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="ocr" className="pt-4">
                      <div className="grid gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="stack-name-ocr">Stapelname</Label>
                            <Input id="stack-name-ocr" placeholder="z.B. Aus meinem Notizbuch" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="picture">Bild</Label>
                          <Input id="picture" type="file" onChange={handleFileChange} accept="image/*" />
                        </div>
                        {previewImage && (
                          <div className="relative w-full h-64 rounded-md border border-dashed flex items-center justify-center bg-muted/40">
                            <Image src={previewImage} alt="Vorschau" layout="fill" objectFit="contain" className="rounded-md" />
                          </div>
                        )}
                        <Button onClick={handleExtractVocabulary} disabled={isExtracting}>
                          {isExtracting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          {isExtracting ? 'Extrahiere...' : 'Vokabeln extrahieren'}
                        </Button>
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
