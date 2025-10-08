
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pen, Trash2, Loader2, ChevronDown } from 'lucide-react';
import type { Verb } from '@/lib/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


interface VerbCardProps {
  verb: Verb;
  onEdit: (verb: Verb) => void;
  onDelete: (verbId: string) => Promise<void>;
  onSelectionChange: (verbId: string, selected: boolean) => void;
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


export function VerbCard({ verb, onEdit, onDelete, onSelectionChange }: VerbCardProps) {
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


  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
        <Card className="shadow-none border">
            <div className="p-4 flex justify-between items-center group">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setIsOpen(!isOpen)}>
                <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        id={`verb-${verb.id}`}
                        checked={!!verb.isSelected}
                        onCheckedChange={(checked) => onSelectionChange(verb.id, Boolean(checked))}
                    />
                </div>
                <label htmlFor={`verb-${verb.id}`} className="cursor-pointer">
                    <p className="font-bold font-headline">{verb.infinitive}</p>
                    <p className="text-sm text-muted-foreground">{verb.language}</p>
                </label>
                </div>
                <div className="flex items-center gap-1">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onEdit(verb)}>
                        <Pen className="h-4 w-4" />
                    </Button>
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
                </div>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <ChevronDown className={cn('h-5 w-5 transition-transform duration-300', isOpen && 'rotate-180')} />
                    </Button>
                </CollapsibleTrigger>
                </div>
            </div>
            <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4">
                  <div>
                      <h5 className="font-semibold text-sm mb-2">Übersetzung</h5>
                      <div className="bg-muted/50 p-2 rounded-md flex items-baseline gap-2">
                          <Badge variant="secondary" className="text-xs">de</Badge>
                          <p className="text-sm">{verb.translation}</p>
                      </div>
                  </div>
                  {Object.entries(groupedTenses).map(([groupName, tenses]) => (
                    <div key={groupName}>
                      <h4 className="font-bold text-sm text-muted-foreground mb-2">{groupName}</h4>
                      <div className="space-y-4">
                        {tenses.map((tense) => (
                           <div key={tense}>
                                <h5 className="font-semibold text-sm mb-2">{tense}</h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {Object.entries(verb.forms[tense]).map(([pronoun, form]) => (
                                        <div key={pronoun} className="bg-muted/50 p-2 rounded-md flex items-baseline gap-2">
                                            <Badge variant="secondary" className="text-xs">{pronoun}</Badge>
                                            <p className="text-sm">{form}</p>
                                        </div>
                                    ))}
                                </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
            </CollapsibleContent>
        </Card>
    </Collapsible>
  );
}
