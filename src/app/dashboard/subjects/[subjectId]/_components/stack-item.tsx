'use client';

import { useState } from 'react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Stack, VocabularyItem } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Pen, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StackItemProps {
  stack: Stack;
  subjectId: string;
  onSelectionChange: (vocabId: string, isSelected: boolean) => void;
}

export function StackItem({ stack, subjectId, onSelectionChange }: StackItemProps) {
  const { firestore, user } = useFirebase();
  const [isOpen, setIsOpen] = useState(true);

  const vocabCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stack.id, 'vocabulary');
  }, [firestore, user, subjectId, stack.id]);

  const { data: vocabulary, isLoading } = useCollection<VocabularyItem>(vocabCollectionRef);

  const allVisibleInStackSelected = vocabulary ? vocabulary.every(v => v.isSelected) : false;

  const handleSelectAll = (checked: boolean) => {
    vocabulary?.forEach(v => {
        onSelectionChange(v.id, checked);
        // This is a temporary local update. A better solution would involve a centralized state manager.
        v.isSelected = checked;
    });
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-2xl">
      <CollapsibleTrigger className="w-full p-4 flex items-center justify-between group">
        <div className="flex items-center gap-4">
          <Checkbox 
             checked={allVisibleInStackSelected}
             onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
             onClick={(e) => e.stopPropagation()}
          />
          <h3 className="font-headline text-lg">{stack.name}</h3>
          <Badge variant="secondary">{stack.vocabCount || 0} Begriffe</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{stack.lastStudied || 'Noch nicht gelernt'}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100">
            <Pen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <ChevronDown className={cn('h-5 w-5 transition-transform duration-300', isOpen && 'rotate-180')} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-2">
          {isLoading && <p className="p-2 text-muted-foreground text-sm">Lade Vokabeln...</p>}
          {!isLoading && vocabulary && vocabulary.length > 0 ? (
            vocabulary.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted"
              >
                <Checkbox 
                    id={`vocab-${item.id}`}
                    checked={item.isSelected}
                    onCheckedChange={(checked) => onSelectionChange(item.id, Boolean(checked))}
                />
                <label htmlFor={`vocab-${item.id}`} className="flex-1 cursor-pointer">{item.term}</label>
                <span className="flex-1 text-muted-foreground">{item.definition}</span>
              </div>
            ))
          ) : (
            !isLoading && <p className="p-2 text-muted-foreground text-sm">Keine Vokabeln in diesem Stapel.</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Add isSelected to VocabularyItem for local state management
declare module '@/lib/types' {
    interface VocabularyItem {
        isSelected?: boolean;
    }
}
