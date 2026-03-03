
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { VocabularyItem } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { getDocs, query, collection, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

interface VocabDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  vocabItem: VocabularyItem;
  subjectId: string;
  onSave: (stackId: string, vocabId: string, data: Partial<VocabularyItem>) => Promise<void>;
}

export function VocabDialog({ isOpen, onOpenChange, vocabItem, subjectId, onSave }: VocabDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    term: '',
    definition: '',
    phonetic: '',
    notes: '',
    relatedLanguage: '',
    relatedWord: '',
  });
  const [originalData, setOriginalData] = useState<typeof formData | null>(null);

  useEffect(() => {
    if (vocabItem) {
      const initialData = {
        term: vocabItem.term || '',
        definition: vocabItem.definition || '',
        phonetic: vocabItem.phonetic || '',
        notes: vocabItem.notes || '',
        relatedLanguage: vocabItem.relatedWord?.language || '',
        relatedWord: vocabItem.relatedWord?.word || '',
      };
      setFormData(initialData);
      setOriginalData(initialData);
    }
  }, [vocabItem]);

  const findStackIdForVocab = async (vocabId: string): Promise<string | null> => {
    if (!firestore || !user) return null;

    const stacksCollectionRef = collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks');
    const stacksSnapshot = await getDocs(stacksCollectionRef);

    for (const stackDoc of stacksSnapshot.docs) {
      const vocabQuery = query(collection(stackDoc.ref, 'vocabulary'), where('__name__', '==', vocabId));
      const vocabSnapshot = await getDocs(vocabQuery);
      if (!vocabSnapshot.empty) {
        return stackDoc.id;
      }
    }
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    const stackId = await findStackIdForVocab(vocabItem.id);
    if (!stackId) {
      // Handle error: couldn't find stack
      setIsSaving(false);
      return;
    }
    const dataToSave: Partial<VocabularyItem> = {
      term: formData.term,
      definition: formData.definition,
      phonetic: formData.phonetic,
      notes: formData.notes,
      relatedWord:
        formData.relatedLanguage && formData.relatedWord
          ? { language: formData.relatedLanguage, word: formData.relatedWord }
          : null,
    };
    await onSave(stackId, vocabItem.id, dataToSave);
    setIsSaving(false);
    onOpenChange(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleReset = () => {
    if (originalData) {
      setFormData(originalData);
      toast({ title: 'Zurückgesetzt', description: 'Die Änderungen wurden verworfen.' });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-8" onOpenAutoFocus={(e) => e.preventDefault()} aria-describedby="vocab-dialog-description">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold font-headline">Vokabel bearbeiten</DialogTitle>
          <DialogDescription id="vocab-dialog-description" className="text-base">Ändere die Details für diese Vokabel.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-2">
          <div className="grid gap-2">
            <Label htmlFor="term" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Fremdwort
            </Label>
            <Textarea id="term" value={formData.term} onChange={handleInputChange} className="rounded-2xl border-none bg-secondary/30 focus-visible:ring-primary text-lg font-bold p-4" rows={2} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="definition" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Bedeutung (Deutsch)
            </Label>
            <Textarea id="definition" value={formData.definition} onChange={handleInputChange} className="rounded-2xl border-none bg-secondary/30 focus-visible:ring-primary text-lg font-medium p-4" rows={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="phonetic" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Lautschrift
              </Label>
              <Input id="phonetic" value={formData.phonetic} onChange={handleInputChange} className="rounded-xl border-none bg-secondary/30 h-12 px-4 font-mono" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="relatedLanguage" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Ähnliches Wort
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input id="relatedLanguage" placeholder="Sprache" value={formData.relatedLanguage} onChange={handleInputChange} className="rounded-xl border-none bg-secondary/30 h-12 px-4 text-sm" />
                <Input id="relatedWord" placeholder="Wort" value={formData.relatedWord} onChange={handleInputChange} className="rounded-xl border-none bg-secondary/30 h-12 px-4 font-bold" />
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Hinweise & Notizen
            </Label>
            <Textarea id="notes" value={formData.notes} onChange={handleInputChange} className="rounded-2xl border-none bg-secondary/30 focus-visible:ring-primary p-4" rows={3} />
          </div>
        </div>
        <DialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" onClick={handleReset} className="rounded-xl h-12 font-semibold">Zurücksetzen</Button>
          <div className="flex-1" />
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-12 px-6 border-2 font-semibold flex-1 sm:flex-none">Abbrechen</Button>
            <Button onClick={handleSave} disabled={isSaving} className="rounded-xl h-12 px-8 font-bold flex-1 sm:flex-none">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
