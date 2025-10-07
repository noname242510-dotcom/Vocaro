'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pen, Trash2, Loader2 } from 'lucide-react';
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

interface VerbCardProps {
  verb: Verb;
  onEdit: (verb: Verb) => void;
  onDelete: (verbId: string) => Promise<void>;
  onSelectionChange: (verbId: string, selected: boolean) => void;
}

export function VerbCard({ verb, onEdit, onDelete, onSelectionChange }: VerbCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
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
    <>
      <Card className="p-4 shadow-none border flex justify-between items-center group">
        <div className="flex items-center gap-4">
          <Checkbox
            id={`verb-${verb.id}`}
            checked={!!verb.isSelected}
            onCheckedChange={(checked) => onSelectionChange(verb.id, Boolean(checked))}
          />
          <label htmlFor={`verb-${verb.id}`} className="cursor-pointer">
            <p className="font-bold font-headline">{verb.infinitive}</p>
            <p className="text-sm text-muted-foreground">{verb.translation}</p>
          </label>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </Card>
    </>
  );
}
