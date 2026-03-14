'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sparkles } from 'lucide-react';

interface AiTipModalProps {
  word: { term: string; definition: string };
  onClose: () => void;
}

export function AiTipModal({ word, onClose }: AiTipModalProps) {
  const [tips, setTips] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTip, setSelectedTip] = useState<string | null>(null);
  const [savedTip, setSavedTip] = useState<string | null>(null); // State for the saved tip
  const [error, setError] = useState<string | null>(null);

  // Check for a saved tip when the component mounts
  useEffect(() => {
    const storedTip = localStorage.getItem(`tip_${word.term}`);
    if (storedTip) {
      setSavedTip(storedTip);
    }
  }, [word.term]);

  const generateTips = async () => {
    setIsLoading(true);
    setError(null);
    setTips([]); // Clear previous tips

    try {
      const response = await fetch('/api/generate-tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ term: word.term, definition: word.definition }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate tips');
      }

      const data = await response.json();
      setTips(data.tips);

    } catch (err) {
      setError('Tipps konnten nicht generiert werden. Bitte versuche es später erneut.');
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
      return <div className="py-12 text-center text-muted-foreground">Generiere Tipps...</div>;
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
              className="text-left h-auto whitespace-normal"
            >
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
                Klicke auf den Button, um dir personalisierte Lerntipps von unserer KI generieren zu lassen.
            </p>
        </div>
    );
  };

  const renderFooter = () => {
      if (savedTip) {
          return (
            <DialogFooter>
                <Button variant="secondary" onClick={onClose}>Schliessen</Button>
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
            Hier sind einige Eselsbrücken, um sich dieses Wort besser zu merken.
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
        {renderFooter()}

      </DialogContent>
    </Dialog>
  );
}
