
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MoreHorizontal, Pen, Trash2, Loader2, ChevronDown, Info } from 'lucide-react';
import type { Verb, VerbTense } from '@/lib/types';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


interface VerbCardProps {
  verb: Verb;
  onEdit: (verb: Verb) => void;
  onDelete: (verbId: string) => Promise<void>;
  onSelectionChange: (verbId: string, selected: boolean) => void;
  onTenseSelectionChange: (verbId: string, tense: string, selected: boolean) => void;
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

// Define the classical order of pronouns for different languages
const pronounOrder: { [key: string]: string[] } = {
  french: ["je", "tu", "il/elle/on", "nous", "vous", "ils/elles", "(tu)", "(nous)", "(vous)", "form"],
  english: ["I", "you", "he/she/it", "we", "they", "form"],
  default: ["form"]
};

const getGroupedTenses = (forms: Verb['forms']) => {
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

  // Add any tenses not in the predefined groups
  const ungroupedTenses = allTenses.filter(tense => !Object.values(tenseOrder).flat().includes(tense));
  if (ungroupedTenses.length > 0) {
    grouped['Uncategorized'] = ungroupedTenses;
  }

  return grouped;
}


export function VerbCard({ verb, onEdit, onDelete, onSelectionChange, onTenseSelectionChange }: VerbCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(verb.id);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const groupedTenses = getGroupedTenses(verb.forms);
  const pronounOrderKey = verb.language.toLowerCase() as keyof typeof pronounOrder;
  const currentPronounOrder = pronounOrder[pronounOrderKey] || pronounOrder.default;

  const getSortedPronouns = (tenseForms: VerbTense) => {
    // Special handling for French "j'" apostrophe
    const getSortIndex = (pronoun: string) => {
      if (pronoun.toLowerCase().startsWith("j'")) {
        return currentPronounOrder.indexOf("je");
      }
      return currentPronounOrder.indexOf(pronoun);
    };

    return Object.keys(tenseForms).sort((a, b) => {
      const indexA = getSortIndex(a);
      const indexB = getSortIndex(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  };


  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <Card className="rounded-[2.5rem] border-none bg-white shadow-xl shadow-primary/5 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10">
        <div className="p-8 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <Checkbox
              id={`verb-${verb.id}`}
              className="w-8 h-8 rounded-xl border-2 border-primary/10 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all scale-110"
              checked={!!verb.isSelected}
              onCheckedChange={(checked) => onSelectionChange(verb.id, Boolean(checked))}
            />
            <div className="cursor-pointer flex-1 min-w-0" onClick={() => setIsOpen(!isOpen)}>
              <h3 className="font-creative text-2xl font-black truncate text-foreground leading-tight">{verb.infinitive}</h3>
              <p className="text-sm text-muted-foreground font-semibold uppercase tracking-widest leading-loose">{verb.translation}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-secondary/50 opacity-60 transition-all">
                  <MoreHorizontal className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-[1.5rem] p-2 shadow-2xl border-none">
                <DropdownMenuItem onClick={() => onEdit(verb)} className="rounded-xl px-4 py-3 font-bold gap-3 cursor-pointer">
                  <Pen className="h-4 w-4" /> Bearbeiten
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
          <div className="px-8 pb-8 space-y-8">
            <div className="h-px bg-border/50" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {Object.entries(groupedTenses).map(([groupName, tenses]) => (
                <div key={groupName} className="space-y-4">
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground/60 px-4">{groupName}</h4>
                  <div className="grid gap-2">
                    {tenses.map((tense) => (
                      <div key={tense} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-border transition-all group/tense">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            id={`${verb.id}-${tense}`}
                            className="w-5 h-5 rounded-lg border-2"
                            checked={verb.selectedTenses?.has(tense)}
                            onCheckedChange={(checked) => onTenseSelectionChange(verb.id, tense, !!checked)}
                          />
                          <label htmlFor={`${verb.id}-${tense}`} className="text-base font-bold cursor-pointer group-hover/tense:text-primary transition-colors">
                            {tense}
                          </label>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2 hover:bg-white hover:shadow-lg transition-all">
                              <Info className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 rounded-[2rem] p-6 shadow-2xl border-none">
                            <h4 className="font-creative text-xl font-black mb-6 pb-4 border-b">{tense}</h4>
                            <div className="grid gap-4">
                              {getSortedPronouns(verb.forms[tense]).map(pronoun => (
                                <div key={pronoun} className="flex items-center justify-between py-1 border-b border-muted/30 last:border-none">
                                  <span className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">{pronoun}</span>
                                  <span className="font-bold text-lg">{verb.forms[tense][pronoun]}</span>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-[2.5rem] p-10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-3xl font-bold font-headline text-foreground">Verb löschen?</AlertDialogTitle>
              <AlertDialogDescription className="text-lg mt-4 text-muted-foreground">
                Bist du sicher? Alle Konjugationen für &quot;{verb.infinitive}&quot; werden unwiderruflich gelöscht.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-4 mt-8">
              <AlertDialogCancel className="h-14 rounded-2xl border-2 font-bold text-lg">Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="h-14 rounded-2xl bg-destructive hover:bg-destructive/90 font-bold text-lg">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verb löschen"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </Collapsible>
  );
}
