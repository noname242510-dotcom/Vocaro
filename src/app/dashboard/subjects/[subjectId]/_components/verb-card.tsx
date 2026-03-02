
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
      <Card className="shadow-sm border-none bg-secondary/30 backdrop-blur-sm rounded-[2rem] overflow-hidden group transition-all duration-300">
        <div className="p-5 flex justify-between items-center">
          <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setIsOpen(!isOpen)}>
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                id={`verb-${verb.id}`}
                className="w-5 h-5 rounded-md border-2 border-primary/20"
                checked={!!verb.isSelected}
                onCheckedChange={(checked) => onSelectionChange(verb.id, Boolean(checked))}
              />
            </div>
            <label htmlFor={`verb-${verb.id}`} className="cursor-pointer space-y-0.5">
              <p className="text-lg font-bold font-headline leading-tight">{verb.infinitive}</p>
              <p className="text-sm text-muted-foreground font-medium">{verb.translation}</p>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-background/50">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-2xl">
                  <DropdownMenuItem onClick={() => onEdit(verb)} className="rounded-xl">
                    <Pen className="mr-2 h-4 w-4" />
                    <span>Bearbeiten</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive rounded-xl">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Löschen</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop Buttons */}
            <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-background/50" onClick={() => onEdit(verb)}>
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
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedTenses).map(([groupName, tenses]) => (
              <Card key={groupName} className="p-4 rounded-2xl bg-background/50 border-none shadow-none">
                <h4 className="font-bold text-xs uppercase tracking-widest text-primary mb-4 px-2">{groupName}</h4>
                <div className="space-y-1">
                  {tenses.map((tense) => (
                    <div key={tense} className="flex items-center justify-between p-2 rounded-xl hover:bg-background transition-colors">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`${verb.id}-${tense}`}
                          className="w-4 h-4 rounded"
                          checked={verb.selectedTenses?.has(tense)}
                          onCheckedChange={(checked) => onTenseSelectionChange(verb.id, tense, !!checked)}
                        />
                        <label htmlFor={`${verb.id}-${tense}`} className="text-sm font-semibold cursor-pointer">
                          {tense}
                        </label>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                            <Info className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 rounded-2xl p-4 shadow-2xl border-none">
                          <div className="space-y-3">
                            <h4 className="font-bold text-lg border-b pb-2">{tense}</h4>
                            <div className="space-y-1">
                              {getSortedPronouns(verb.forms[tense]).map(pronoun => (
                                <div key={pronoun} className="grid grid-cols-2 gap-4 py-1 border-b border-muted/50 last:border-none">
                                  <span className="text-muted-foreground font-medium">{pronoun}</span>
                                  <span className="font-bold">{verb.forms[tense][pronoun]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </CollapsibleContent>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Aktion kann nicht rückgängig gemacht werden. Das Verb "{verb.infinitive}" wird dauerhaft gelöscht.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Löschen"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </Collapsible>
  );
}
