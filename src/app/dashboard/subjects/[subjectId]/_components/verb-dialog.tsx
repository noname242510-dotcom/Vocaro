'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, AlertTriangle, Save } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { generateVerbForms, type GenerateVerbFormsOutput } from '@/ai/flows/generate-verb-forms';
import type { Verb, VerbTense } from '@/lib/types';
import { z } from 'zod';

interface VerbDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  language: string;
  onSave: (verbData: Omit<Verb, 'id' | 'subjectId' | 'language'>) => Promise<void>;
  existingVerb?: Verb | null;
}

const GenerateVerbFormsInputSchema = z.object({
  verb: z.string().describe('The infinitive form of the verb to be conjugated.'),
  language: z.string().describe("The language of the verb, e.g., 'French', 'English'."),
});
type GenerateVerbFormsInput = z.infer<typeof GenerateVerbFormsInputSchema>;


export function VerbDialog({ isOpen, onOpenChange, language, onSave, existingVerb }: VerbDialogProps) {
  const [infinitive, setInfinitive] = useState(existingVerb?.infinitive || '');
  const [generatedData, setGeneratedData] = useState<GenerateVerbFormsOutput | null>(existingVerb ? { translation: existingVerb.translation, forms: existingVerb.forms } : null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!infinitive.trim()) {
      toast({ variant: 'destructive', title: 'Fehlender Infinitiv', description: 'Bitte gib ein Verb ein.' });
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedData(null);
    try {
      const result = await generateVerbForms({ verb: infinitive, language });
      setGeneratedData(result);
    } catch (e) {
      console.error(e);
      setError('Die Verbformen konnten nicht generiert werden. Bitte versuche es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (tense: string, pronoun: string, value: string) => {
    if (!generatedData) return;
    const newData = { ...generatedData };
    (newData.forms[tense] as VerbTense)[pronoun] = value;
    setGeneratedData(newData);
  };
  
  const handleTranslationChange = (value: string) => {
    if (!generatedData) return;
    const newData = { ...generatedData, translation: value };
    setGeneratedData(newData);
  };

  const handleSave = async () => {
    if (!generatedData || !infinitive) return;
    setIsSaving(true);
    try {
      await onSave({
        infinitive,
        translation: generatedData.translation,
        forms: generatedData.forms,
      });
      closeAndReset();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fehler beim Speichern', description: 'Das Verb konnte nicht gespeichert werden.' });
    } finally {
      setIsSaving(false);
    }
  };

  const closeAndReset = () => {
    onOpenChange(false);
    // Delay reset to allow dialog to close smoothly
    setTimeout(() => {
        setInfinitive('');
        setGeneratedData(null);
        setError(null);
        setIsLoading(false);
    }, 300);
  };

  // Determine order of tenses for display
  const sortedTenses = Object.entries(generatedData?.forms || {}).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{existingVerb ? 'Verb bearbeiten' : 'Neues Verb hinzufügen'}</DialogTitle>
          <DialogDescription>
            {generatedData ? 'Überprüfe und bearbeite die generierten Formen.' : 'Gib ein Verb im Infinitiv ein, um alle Formen zu generieren.'}
          </DialogDescription>
        </DialogHeader>

        {!generatedData ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="infinitive" className="text-right">
                Infinitiv
              </Label>
              <Input
                id="infinitive"
                value={infinitive}
                onChange={(e) => setInfinitive(e.target.value)}
                className="col-span-3"
                placeholder={language === 'French' ? 'z.B. aller' : 'z.B. to go'}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                disabled={!!existingVerb}
              />
            </div>
             {error && (
                <div className="col-span-4 flex items-center gap-2 text-destructive text-sm p-2 bg-destructive/10 rounded-md">
                    <AlertTriangle className="h-4 w-4" />
                    <p>{error}</p>
                </div>
            )}
            <DialogFooter>
                <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Formen generieren
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="max-h-[60vh] overflow-y-auto p-1 -mx-1">
              <div className="grid gap-4 py-4">
                 <Collapsible defaultOpen className="space-y-2">
                  <CollapsibleTrigger className="font-semibold text-lg w-full text-left">Übersetzung</CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-4 items-center gap-4 pl-4">
                      <Label htmlFor="translation" className="text-right">de</Label>
                      <Input
                        id="translation"
                        value={generatedData.translation}
                        onChange={(e) => handleTranslationChange(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                
                {sortedTenses.map(([tense, forms]) => (
                  <Collapsible key={tense} className="space-y-2">
                    <CollapsibleTrigger className="font-semibold text-lg w-full text-left">{tense}</CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pl-4">
                      {Object.entries(forms).map(([pronoun, form]) => (
                        <div key={pronoun} className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor={`${tense}-${pronoun}`} className="text-right text-muted-foreground">
                            {pronoun}
                          </Label>
                          <Input
                            id={`${tense}-${pronoun}`}
                            value={form}
                            onChange={(e) => handleFormChange(tense, pronoun, e.target.value)}
                            className="col-span-3"
                          />
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Verb speichern
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}