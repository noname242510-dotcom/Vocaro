
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
import { useFirebase } from '@/firebase';

interface VocabDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  vocabItem: VocabularyItem;
  subjectId: string;
  onSave: (stackId: string, vocabId: string, data: Partial<VocabularyItem>) => Promise<void>;
}

export function VocabDialog({ isOpen, onOpenChange, vocabItem, subjectId, onSave }: VocabDialogProps) {
  const { firestore, user } = useFirebase();
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
          : undefined,
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
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vokabel bearbeiten</DialogTitle>
          <DialogDescription>Ändere die Details für diese Vokabel.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="term" className="text-right">
              Fremdwort
            </Label>
            <Textarea id="term" value={formData.term} onChange={handleInputChange} className="col-span-3" rows={2} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="definition" className="text-right">
              Deutsch
            </Label>
            <Textarea id="definition" value={formData.definition} onChange={handleInputChange} className="col-span-3" rows={2} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phonetic" className="text-right">
              Lautschrift
            </Label>
            <Input id="phonetic" value={formData.phonetic} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Hinweise
            </Label>
            <Textarea id="notes" value={formData.notes} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="relatedLanguage" className="text-right">
              Ähnliches Wort
            </Label>
            <div className="col-span-3 grid grid-cols-2 gap-2">
                <Input id="relatedLanguage" placeholder="Sprache" value={formData.relatedLanguage} onChange={handleInputChange} />
                <Input id="relatedWord" placeholder="Wort" value={formData.relatedWord} onChange={handleInputChange} />
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={handleReset}>Zurücksetzen</Button>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Speichern
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
