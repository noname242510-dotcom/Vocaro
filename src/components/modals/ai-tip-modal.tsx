'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sparkles, Loader2, Lightbulb, Brain, Book, Users } from 'lucide-react';
// WICHTIG: Wir importieren jetzt die Server Action statt fetch zu nutzen
import { generateLearningTip } from '@/ai/flows/generate-learning-tip';

interface AiTipModalProps {
  word: { term: string; definition: string; language?: string; type?: 'Vokabel' | 'Verb' };
  onClose: () => void;
}

const tipIcons = [
  <Lightbulb className="h-5 w-5" />,
  <Brain className="h-5 w-5" />,
  <Book className="h-5 w-5" />,
  <Users className="h-5 w-5" />
];

export function AiTipModal({ word, onClose }: AiTipModalProps) {
  const [tips, setTips] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTip, setSelectedTip] = useState<string | null>(null);
  const [savedTip, setSavedTip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedTip = localStorage.getItem(`tip_${word.term}`);
    if (storedTip) {
      setSavedTip(storedTip);
    }
  }, [word.term]);

  const generateTips = async () => {
    setIsLoading(true);
    setError(null);
    setTips([]);

    try {
      // Wir rufen die Genkit-Funktion direkt auf
      const result = await generateLearningTip({
        item: word.term,
        definition: word.definition,
        language: word.language || 'Deutsch',
        type: word.type || 'Vokabel'
      });

      if (result && result.tips) {
        setTips(result.tips);
      } else {
        throw new Error('Keine Tipps empfangen');
      }
    } catch (err) {
      console.error("Fehler beim Generieren:", err);
      setError('Tipps konnten nicht generiert werden. Bitte prüfe deine API-Verbindung.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (selectedTip) {
      localStorage.setItem(`tip_${word.term}`, selectedTip);
      setSavedTip(selectedTip);
      onClose();
    }
  };

  const handleRegenerate = () => {
    setSavedTip(null);
    setSelectedTip(null);
    setTips([]);
    generateTips();
  }

  const renderContent = () => {
    if (savedTip) {
      return (
        <div className="grid gap-4 py-4">
          <p className='text-center font-bold'>Dein gespeicherter Tipp:</p>
          <div className="p-4 bg-primary/10 rounded-lg">
            <p>{savedTip}</p>
          </div>
          <Button variant="outline" onClick={handleRegenerate}>Neue Tipps generieren</Button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="py-12 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>KI erstellt Lerntipps...</p>
        </div>
      );
    }

    if (error) {
      return <div className="py-12 text-center text-destructive">{error}</div>;
    }

    if (tips.length > 0) {
      return (
        <div className="grid gap-2 py-4">
          {tips.map((tip, index) => (
            <Button
              key={index}
              variant={selectedTip === tip ? 'default' : 'outline'}
              onClick={() => setSelectedTip(tip)}
              className="text-left h-auto whitespace-normal p-3 flex items-center gap-2"
            >
              {tipIcons[index % tipIcons.length]}
              {tip}
            </Button>
          ))}
        </div>
      );
    }

    return (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
            <Sparkles className="h-10 w-10 text-primary/50" />
            <p className="text-muted-foreground">
                Klicke auf den Button, um dir Eselsbrücken generieren zu lassen.
            </p>
        </div>
    );
  };

  const renderFooter = () => {
      if (savedTip) {
          return (
            <DialogFooter>
                <Button variant="secondary" onClick={onClose}>Schließen</Button>
            </DialogFooter>
          )
      }

      if (tips.length === 0 && !isLoading) {
          return (
            <DialogFooter>
                <Button onClick={generateTips}>Tipps generieren</Button>
            </DialogFooter>
          )
      }

      if (tips.length > 0) {
          return (
            <DialogFooter>
                <Button onClick={handleSave} disabled={!selectedTip}>Tipp speichern</Button>
            </DialogFooter>
          )
      }

      return null;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            KI-Tipps für "{word.term}"
          </DialogTitle>
          <DialogDescription>
            {word.definition}
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
        {renderFooter()}

      </DialogContent>
    </Dialog>
  );
}