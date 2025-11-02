
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Loader2, Wand2, AlertTriangle, Save, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { generateVerbForms, type GenerateVerbFormsOutput } from '@/ai/flows/generate-verb-forms';
import type { Verb, VerbTense } from '@/lib/types';
import { z } from 'zod';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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

const tenseOrderConfig: { [key: string]: string[] } = {
    'Indicatif': [
        'Indicatif Présent', 'Indicatif Imparfait', 'Indicatif Passé composé', 
        'Indicatif Plus-que-parfait', 'Indicatif Futur simple', 'Indicatif Futur antérieur'
    ],
    'Conditionnel': ['Conditionnel Présent', 'Conditionnel Passé'],
    'Subjonctif': ['Subjonctif Présent', 'Subjonctif Passé'],
    'Autres formes': ['Impératif Présent', 'Infinitif Présent', 'Participe Présent', 'Participe Passé'],
    'Present': [
        'Simple Present', 'Present Progressive', 'Present Perfect', 'Present Perfect Progressive'
    ],
    'Past': [
        'Simple Past', 'Past Progressive', 'Past Perfect', 'Past Perfect Progressive'
    ],
    'Future': [
        'Simple Future', 'Future Progressive', 'Future Perfect', 'Future Perfect Progressive'
    ],
    'Other Forms': ['Imperative', 'Infinitive', 'Present Participle', 'Past Participle']
};

const languageDisplayNames: { [key: string]: string } = {
    'French': 'Französisch',
    'English': 'Englisch',
    'Spanish': 'Spanisch',
    'German': 'Deutsch',
};

export function VerbDialog({ isOpen, onOpenChange, language, onSave, existingVerb }: VerbDialogProps) {
  const [infinitive, setInfinitive] = useState('');
  const [generatedData, setGeneratedData] = useState<GenerateVerbFormsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (existingVerb) {
        setInfinitive(existingVerb.infinitive);
        setGeneratedData({ 
          infinitive: existingVerb.infinitive,
          translation: existingVerb.translation, 
          forms: existingVerb.forms,
          germanForms: existingVerb.germanForms
        });
      } else {
        // Reset state when opening for a new verb
        closeAndReset();
      }
    }
  }, [isOpen, existingVerb]);


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

  const handleFormChange = (tense: string, pronoun: string, value: string, formType: 'forms' | 'germanForms') => {
    if (!generatedData) return;
    const newData = { ...generatedData };
    const formsToUpdate = formType === 'germanForms' ? newData.germanForms : newData.forms;
    if (formsToUpdate && formsToUpdate[tense]) {
      (formsToUpdate[tense] as VerbTense)[pronoun] = value;
       setGeneratedData(newData);
    }
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
        germanForms: generatedData.germanForms,
      });
      closeAndReset();
      onOpenChange(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fehler beim Speichern', description: 'Das Verb konnte nicht gespeichert werden.' });
    } finally {
      setIsSaving(false);
    }
  };

  const closeAndReset = () => {
    setInfinitive('');
    setGeneratedData(null);
    setError(null);
    setIsLoading(false);
    setIsSaving(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAndReset();
    }
    onOpenChange(open);
  }

  const sortedTenses = useMemo(() => {
    if (!generatedData) return [];
    
    const allTenses = Object.keys(generatedData.forms);
    const isFrench = allTenses.some(t => t.startsWith('Indicatif'));
    const orderKeys = isFrench 
      ? ['Indicatif', 'Conditionnel', 'Subjonctif', 'Autres formes']
      : ['Present', 'Past', 'Future', 'Other Forms'];
      
    const orderedTenseList = orderKeys.flatMap(key => tenseOrderConfig[key] || []);
    
    const sorted = allTenses.sort((a, b) => {
        const indexA = orderedTenseList.indexOf(a);
        const indexB = orderedTenseList.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return sorted.map(tense => [tense, generatedData.forms[tense]]);
  }, [generatedData]);

  const displayLanguage = languageDisplayNames[language] || language;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
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
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4 pb-2">
                <div>
                    <Label htmlFor="infinitive-display" className="text-lg font-semibold">{generatedData.infinitive}</Label>
                </div>
                 <div>
                    <Label htmlFor="translation" className="text-lg font-semibold">Deutsche Übersetzung</Label>
                    <Input
                        id="translation"
                        value={generatedData.translation}
                        onChange={(e) => handleTranslationChange(e.target.value)}
                        className="mt-2"
                    />
                </div>
            </div>
            
            <Tabs defaultValue="foreign" className="mt-2 flex-grow min-h-0 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="foreign">{displayLanguage}</TabsTrigger>
                <TabsTrigger value="german">Deutsch</TabsTrigger>
              </TabsList>
              <ScrollArea className="mt-2 flex-grow">
                <div className="p-1">
                  <TabsContent value="foreign" className="mt-0">
                    {sortedTenses.map(([tense, forms]) => (
                      <Collapsible key={tense as string} className="space-y-2 p-2">
                        <CollapsibleTrigger className="font-semibold text-lg w-full text-left flex justify-between items-center">
                          <span>{tense as string}</span>
                          <ChevronDown className="h-5 w-5 transition-transform-all [&[data-state=open]]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 pl-4">
                          {Object.entries(forms).map(([pronoun, form]) => (
                            <div key={pronoun} className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor={`${tense}-${pronoun}`} className="text-right text-muted-foreground">
                                {pronoun}
                              </Label>
                              <Input
                                id={`${tense}-${pronoun}`}
                                value={form as string}
                                onChange={(e) => handleFormChange(tense as string, pronoun, e.target.value, 'forms')}
                                className="col-span-3"
                              />
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </TabsContent>
                  <TabsContent value="german" className="mt-0">
                    {generatedData.germanForms && sortedTenses.map(([tense]) => (
                      <Collapsible key={`de-${tense as string}`} className="space-y-2 p-2">
                        <CollapsibleTrigger className="font-semibold text-lg w-full text-left flex justify-between items-center">
                          <span>{tense as string}</span>
                          <ChevronDown className="h-5 w-5 transition-transform-all [&[data-state=open]]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 pl-4">
                          {generatedData.germanForms?.[tense as string] && Object.entries(generatedData.germanForms[tense as string]).map(([pronoun, form]) => (
                            <div key={`de-${pronoun}`} className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor={`de-${tense}-${pronoun}`} className="text-right text-muted-foreground">
                                {pronoun}
                              </Label>
                              <Input
                                id={`de-${tense}-${pronoun}`}
                                value={form as string}
                                onChange={(e) => handleFormChange(tense as string, pronoun, e.target.value, 'germanForms')}
                                className="col-span-3"
                              />
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
            
            <DialogFooter className="pt-4 mt-auto">
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
