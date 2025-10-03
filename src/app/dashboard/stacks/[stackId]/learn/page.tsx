"use client";

import { useState, useMemo } from 'react';
import { mockVocabulary } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { X, Check, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/confetti';

export default function LearnPage({ params }: { params: { stackId: string } }) {
  const vocabulary = useMemo(() => mockVocabulary[params.stackId] || mockVocabulary['s1-1'], [params.stackId]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] =useState(0);
  const [showResults, setShowResults] = useState(false);

  const progress = ((currentIndex) / vocabulary.length) * 100;
  const currentCard = vocabulary[currentIndex];

  const handleAnswer = (knewIt: boolean) => {
    if (!isFlipped) return;

    if (knewIt) {
      setCorrectAnswers(prev => prev + 1);
    } else {
      setIncorrectAnswers(prev => prev + 1);
    }

    if (currentIndex + 1 < vocabulary.length) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setShowResults(true);
    }
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrectAnswers(0);
    setIncorrectAnswers(0);
    setShowResults(false);
  };
  
  const score = vocabulary.length > 0 ? Math.round((correctAnswers / vocabulary.length) * 100) : 0;

  if (showResults) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
            <Confetti active={score >= 90} />
            <h1 className="text-4xl font-bold font-headline mb-4">Session Complete!</h1>
            <p className="text-7xl font-bold mb-4">{score}%</p>
            <div className="flex gap-8 text-lg mb-8">
                <p><span className="font-bold text-green-500">{correctAnswers}</span> Correct</p>
                <p><span className="font-bold text-red-500">{incorrectAnswers}</span> Incorrect</p>
            </div>
            <div className="flex gap-4">
                <Button onClick={resetSession} size="lg"><RotateCcw className="mr-2 h-4 w-4" /> Try Again</Button>
                <Button variant="outline" size="lg" asChild>
                    <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-8">
      <div className="w-full max-w-2xl mb-8">
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground text-center mt-2">
          Card {currentIndex + 1} of {vocabulary.length}
        </p>
      </div>

      <div className="w-full max-w-2xl perspective-1000">
        <Card
          className={cn("h-80 w-full transition-transform duration-700 preserve-3d", isFlipped && "rotate-y-180")}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front of the card */}
          <div className="absolute w-full h-full backface-hidden flex items-center justify-center p-6">
            <p className="text-4xl font-bold text-center font-headline">{currentCard.term}</p>
          </div>
          {/* Back of the card */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-6 bg-card">
            <p className="text-xl text-center text-muted-foreground">{currentCard.definition}</p>
          </div>
        </Card>
      </div>

      <div className={cn("flex gap-4 mt-8 transition-opacity duration-300", !isFlipped && 'opacity-0 pointer-events-none')}>
        <Button variant="destructive" size="lg" className="w-40 h-16 text-lg" onClick={() => handleAnswer(false)}>
          <X className="mr-2" /> I didn't know
        </Button>
        <Button variant="secondary" size="lg" className="w-40 h-16 text-lg bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAnswer(true)}>
          <Check className="mr-2" /> I knew it
        </Button>
      </div>
      
      <style jsx>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      `}</style>
    </div>
  );
}
