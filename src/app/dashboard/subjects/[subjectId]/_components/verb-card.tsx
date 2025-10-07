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

export function VerbCard({ verb, onEdit, onDelete, onSelectionChange }: VerbCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(verb.id);
      // The parent component will handle closing the dialog and refreshing the list
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
        <Card className="shadow-none border">
            <div className="p-4 flex justify-between items-center group">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        id={`verb-${verb.id}`}
                        checked={!!verb.isSelected}
                        onCheckedChange={(checked) => onSelectionChange(verb.id, Boolean(checked))}
                    />
                </div>
                <label htmlFor={`verb-${verb.id}`} className="cursor-pointer">
                    <p className="font-bold font-headline">{verb.infinitive}</p>
                    <p className="text-sm text-muted-foreground">{verb.translation}</p>
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
                <div className="px-4 pb-4 space-y-3">
                    {Object.entries(verb.forms).map(([tense, forms]) => (
                        <div key={tense}>
                            <h4 className="font-semibold text-sm mb-2 px-2">{tense}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.entries(forms).map(([pronoun, form]) => (
                                    <div key={pronoun} className="bg-muted/50 p-2 rounded-md flex items-baseline gap-2">
                                        <Badge variant="secondary" className="text-xs">{pronoun}</Badge>
                                        <p className="text-sm">{form}</p>
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
