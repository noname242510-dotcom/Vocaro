'use client';

import { useState, useMemo, useEffect, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, AlertTriangle, Save, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateVerbForms, type GenerateVerbFormsOutput } from '@/ai/flows/generate-verb-forms';
import type { Verb, VerbTense } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TaskContext } from '@/contexts/task-context';


interface VerbDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  language: string;
  onSave: (verbData: Omit<Verb, 'id' | 'subjectId' | 'language'>) => Promise<void>;
  existingVerb?: Verb | null;
}

const tenseOrder: { [key: string]: string[] } = {
  'Indicatif': [
    'Indicatif Présent',
    'Indicatif Imparfait',
    'Indicatif Passé composé',
    'Indicatif Plus-que-parfait',
    'Indicatif Futur simple',
    'Indicatif Futur antérieur'
  ],
  'Conditionnel': [
    'Conditionnel Présent',
    'Conditionnel Passé'
  ],
  'Subjonctif': [
    'Subjonctif Présent',
    'Subjonctif Passé'
  ],
  'Autres formes': [
    'Impératif Présent',
    'Infinitif Présent',
    'Participe Présent',
    'Participe Passé'
  ],
  'Present': [
    'Simple Present',
    'Present Progressive',
    'Present Perfect',
    'Present Perfect Progressive'
  ],
  'Past': [
    'Simple Past',
    'Past Progressive',
    'Past Perfect',
    'Past Perfect Progressive'
  ],
  'Future': [
    'Simple Future',
    'Future Progressive',
    'Future Perfect',
    'Future Perfect Progressive'
  ],
  'Other Forms': [
    'Imperative',
    'Infinitive',
    'Present Participle',
    'Past Participle'
  ]
};

const pronounOrder: { [key: string]: string[] } = {
  french: ["je", "j'", "tu", "il/elle/on", "nous", "vous", "ils/elles", "(tu)", "(nous)", "(vous)", "form"],
  english: ["I", "you", "he/she/it", "we", "they", "form"],
  german: ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie", "form", "(du)", "(wir)", "(ihr)"],
  default: ["form"]
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { runTask, isRunning } = useContext(TaskContext);

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
      }
    }
  }, [isOpen, existingVerb]);

  const handleGenerate = async () => {
    if (!infinitive.trim()) {
      toast({ variant: 'destructive', title: 'Fehlender Infinitiv', description: 'Bitte gib ein Verb ein.' });
      return;
    }
    
    setError(null);
    setGeneratedData(null);
    
    runTask(
        () => generateVerbForms({ verb: infinitive, language }),
        {
            name: `Verbformen für "${infinitive}" generieren`,
            onSuccess: (result) => {
                setGeneratedData(result);
                toast({ title: 'Erfolg', description: `Verbformen für "${infinitive}" wurden generiert.` });
            },
            onError: (e) => {
                setError(e.message || 'Die Verbformen konnten nicht generiert werden.');
                toast({ variant: 'destructive', title: 'Fehler', description: e.message || 'Die Verbformen konnten nicht generiert werden.' });
            }
        }
    );
  };

  const handleFormChange = (tense: string, pronoun: string, value: string, formType: 'forms' | 'germanForms') => {
    setGeneratedData(prevData => {
        if (!prevData) return null;
        const newData = JSON.parse(JSON.stringify(prevData));
        const formsToUpdate = formType === 'germanForms' ? newData.germanForms : newData.forms;
        if (formsToUpdate && formsToUpdate[tense]) {
            (formsToUpdate[tense] as VerbTense)[pronoun] = value;
        }
        return newData;
    });
  };
  
  const handleTranslationChange = (value: string) => {
    setGeneratedData(prevData => {
        if (!prevData) return null;
        return { ...prevData, translation: value };
    });
  };

  const handleSave = async () => {
    if (!generatedData || !infinitive) return;
    setIsSaving(true);
    try {
      await onSave({
        infinitive: generatedData.infinitive,
        translation: generatedData.translation,
        forms: generatedData.forms,
        germanForms: generatedData.germanForms,
      });
      handleOpenChange(false);
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
    setIsSaving(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAndReset();
    }
    onOpenChange(open);
  }

  const getGroupedTenses = (forms: Verb['forms'] | Verb['germanForms']) => {
    if (!forms) return {};
    const allTenses = Object.keys(forms);
    const isFrench = allTenses.some(t => t.startsWith('Indicatif'));

    const groups = isFrench 
        ? ['Indicatif', 'Conditionnel', 'Subjonctif', 'Autres formes'] 
        : ['Present', 'Past', 'Future', 'Other Forms'];
        
    const grouped: { [key: string]: string[] } = {};

    for (const group of groups) {
        const tensesInGroup = tenseOrder[group]?.filter(tense => allTenses.includes(tense));
        if (tensesInGroup && tensesInGroup.length > 0) {
        grouped[group] = tensesInGroup;
        }
    }

    const ungroupedTenses = allTenses.filter(tense => !Object.values(tenseOrder).flat().includes(tense));
    if (ungroupedTenses.length > 0) {
        grouped['Uncategorized'] = ungroupedTenses;
    }

    return grouped;
  }

  const getSortedPronouns = (tenseForms: VerbTense, langKey: keyof typeof pronounOrder) => {
    const currentPronounOrder = pronounOrder[langKey] || pronounOrder.default;
    return Object.keys(tenseForms).sort((a, b) => {
        const indexA = currentPronounOrder.indexOf(a);
        const indexB = currentPronounOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
  };

  const groupedForeignTenses = useMemo(() => getGroupedTenses(generatedData?.forms), [generatedData]);
  const groupedGermanTenses = useMemo(() => getGroupedTenses(generatedData?.germanForms), [generatedData]);

  const displayLanguage = languageDisplayNames[language] || language;
  const foreignPronounKey = language.toLowerCase() as keyof typeof pronounOrder;

  const TenseList = ({ groupedTenses, forms, formType, pronounKey }: { groupedTenses: Record<string, string[]>, forms?: Record<string, VerbTense>, formType: 'forms' | 'germanForms', pronounKey: keyof typeof pronounOrder }) => (
    <div style={{ columnCount: 3, columnGap: '2rem' }}>
      {Object.entries(groupedTenses).map(([group, tenses]) => (
        <div key={group} className='mb-4' style={{ breakInside: 'avoid' }}>
          <h4 className="font-semibold text-sm text-muted-foreground mb-2 px-1">{group}</h4>
          <div className="flex flex-col gap-1">
            {tenses.map((tense) => (
              <div key={tense} className="flex items-center">
                <span className="text-sm">{tense}</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 text-muted-foreground hover:text-foreground">
                      <Info className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-80" 
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                  >
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">{tense}</h4>
                      <div className="text-sm text-muted-foreground space-y-2 mt-2">
                        {forms?.[tense] && getSortedPronouns(forms[tense], pronounKey).map(pronoun => (
                          <div key={pronoun} className="grid grid-cols-[1fr,2fr] items-center gap-2">
                            <Label htmlFor={`${formType}-${tense}-${pronoun}`} className="text-right text-xs">
                              {pronoun}
                            </Label>
                            <Input
                              id={`${formType}-${tense}-${pronoun}`}
                              value={forms[tense][pronoun]}
                              onChange={(e) => handleFormChange(tense, pronoun, e.target.value, formType)}
                              className="h-8 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );


  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={true}>
        <DialogContent 
          className="sm:max-w-4xl flex flex-col max-h-[90vh]"
          onInteractOutside={(e) => {
            if (isRunning) e.preventDefault();
          }}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{existingVerb ? 'Verb bearbeiten' : 'Neues Verb hinzufügen'}</DialogTitle>
            <DialogDescription>
              {generatedData ? 'Überprüfe und bearbeite die generierten Formen.' : 'Gib ein Verb im Infinitiv ein, um alle Formen zu generieren.'}
            </DialogDescription>
          </DialogHeader>

          <fieldset disabled={isRunning || isSaving} className="contents">
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
                    disabled={!!existingVerb || isRunning}
                  />
                </div>
                 {error && (
                    <div className="col-span-4 flex items-center gap-2 text-destructive text-sm p-2 bg-destructive/10 rounded-md">
                        <AlertTriangle className="h-4 w-4" />
                        <p>{error}</p>
                    </div>
                )}
                <div className="flex justify-end">
                    <Button onClick={handleGenerate} disabled={isRunning}>
                    {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Formen generieren
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 pb-4 border-b flex-shrink-0">
                    <div>
                        <Label htmlFor="infinitive-display" className="text-sm font-medium text-muted-foreground">Infinitiv</Label>
                        <p id="infinitive-display" className="text-lg font-semibold">{generatedData.infinitive}</p>
                    </div>
                     <div>
                        <Label htmlFor="translation" className="text-sm font-medium text-muted-foreground">Deutsche Übersetzung</Label>
                        <Input
                            id="translation"
                            value={generatedData.translation}
                            onChange={(e) => handleTranslationChange(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                </div>
                
                <div className="flex-grow min-h-0">
                    <ScrollArea className="h-full pr-6" type="always">
                        <Tabs defaultValue="foreign" className="mt-2">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="foreign">{displayLanguage}</TabsTrigger>
                                <TabsTrigger value="german">Deutsch</TabsTrigger>
                            </TabsList>
                            <TabsContent value="foreign" className="mt-4">
                                <TenseList groupedTenses={groupedForeignTenses} forms={generatedData.forms} formType="forms" pronounKey={foreignPronounKey} />
                            </TabsContent>
                            <TabsContent value="german" className="mt-4">
                                <TenseList groupedTenses={groupedGermanTenses} forms={generatedData.germanForms} formType="germanForms" pronounKey="german" />
                            </TabsContent>
                        </Tabs>
                    </ScrollArea>
                </div>
                
                <div className="pt-4 mt-auto flex-shrink-0 flex justify-end">
                   <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {existingVerb ? 'Änderungen speichern' : 'Verb speichern'}
                  </Button>
                </div>
              </>
            )}
          </fieldset>
        </DialogContent>
      </Dialog>
    </>
  );
}
