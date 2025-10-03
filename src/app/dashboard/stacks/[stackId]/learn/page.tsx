
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { X, Check, RotateCcw, Loader2, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/confetti';
import { useFirebase } from '@/firebase';
import { collection, doc, getDoc, getDocs, query, where, documentId } from 'firebase/firestore';
import type { VocabularyItem } from '@/lib/types';


// Function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function LearnPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState<VocabularyItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [subjectId, setSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !user) return;

    const fetchVocab = async () => {
      const vocabIdsJson = sessionStorage.getItem('learn-session-vocab');
      const storedSubjectId = sessionStorage.getItem('learn-session-subject');

      if (!vocabIdsJson || !storedSubjectId) {
        setError('Keine Vokabeln für die Lernsitzung gefunden.');
        setIsLoading(false);
        return;
      }

      setSubjectId(storedSubjectId);
      const vocabIds = JSON.parse(vocabIdsJson) as string[];

      if (vocabIds.length === 0) {
        setError('Keine Vokabeln ausgewählt.');
        setIsLoading(false);
        return;
      }
      
      try {
        // This is complex. We need to query vocab items across different stacks.
        // A single query with `documentId` `in` operator is limited to 30 items.
        // For more, we need multiple queries.
        // Firestore path: /users/{userId}/subjects/{subjectId}/stacks/{stackId}/vocabulary/{vocabularyId}
        // We only have vocab IDs, not stack IDs. This makes it impossible to query directly.
        // This is a data modeling problem. A better model would be to have a single `vocabulary` collection for a subject.
        // For now, let's assume all vocab is in one subject and we can query all stacks.
        
        const stacksCollectionRef = collection(firestore, 'users', user.uid, 'subjects', storedSubjectId, 'stacks');
        const stacksSnapshot = await getDocs(stacksCollectionRef);
        const allVocab: VocabularyItem[] = [];

        for (const stackDoc of stacksSnapshot.docs) {
          const vocabCollectionRef = collection(stackDoc.ref, 'vocabulary');
          const vocabQuery = query(vocabCollectionRef, where(documentId(), 'in', vocabIds));
          const vocabSnapshot = await getDocs(vocabQuery);
          vocabSnapshot.forEach(vocabDoc => {
            if (vocabIds.includes(vocabDoc.id)) {
              allVocab.push({ ...vocabDoc.data(), id: vocabDoc.id } as VocabularyItem);
            }
          });
        }
        
        const selectedVocab = allVocab.filter(v => vocabIds.includes(v.id));

        if (selectedVocab.length === 0) {
          setError('Ausgewählte Vokabeln konnten nicht geladen werden.');
        } else {
          setVocabulary(shuffleArray(selectedVocab));
        }
      } catch (e) {
        console.error(e);
        setError('Fehler beim Laden der Vokabeln.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVocab();

  }, [firestore, user]);

  
  const progress = vocabulary.length > 0 ? ((currentIndex) / vocabulary.length) * 100 : 0;

  const handleAnswer = (knewIt: boolean) => {
    if (!isFlipped) return;
    const currentCard = vocabulary[currentIndex];

    if (knewIt) {
      setCorrectAnswers(prev => prev + 1);
    } else {
      setIncorrectAnswers(prev => [...prev, currentCard]);
    }

    if (currentIndex + 1 < vocabulary.length) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      // If there are incorrect answers, reshuffle them and continue
      if (incorrectAnswers.length > 0) {
          setVocabulary(shuffleArray(incorrectAnswers));
          setIncorrectAnswers([]);
          setCurrentIndex(0);
          setIsFlipped(false);
      } else {
        setShowResults(true);
      }
    }
  };

  const resetSession = () => {
    // This should re-fetch and re-shuffle
    window.location.reload();
  };
  
  const score = vocabulary.length > 0 ? Math.round((correctAnswers / vocabulary.length) * 100) : 0;
  
  const handleBackToSelection = () => {
    if (subjectId) {
        router.push(`/dashboard/subjects/${subjectId}`);
    } else {
        router.push('/dashboard');
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  }

  if (error) {
    return <div className="flex flex-col items-center justify-center h-screen text-center">
        <p className="text-red-500">{error}</p>
        <Button asChild variant="link"><Link href="/dashboard">Zurück zum Dashboard</Link></Button>
    </div>;
  }
  
  const currentCard = vocabulary[currentIndex];

  if (!currentCard && !showResults) {
     return <div className="flex flex-col items-center justify-center h-screen text-center">
        <p>Keine Vokabeln für diese Sitzung geladen.</p>
        <Button asChild variant="link"><Link href="/dashboard">Zurück zum Dashboard</Link></Button>
    </div>;
  }


  if (showResults) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
            <Confetti active={score >= 90} />
            <h1 className="text-4xl font-bold font-headline mb-4">Sitzung beendet!</h1>
            <p className="text-7xl font-bold mb-4">{score}%</p>
            <div className="flex gap-8 text-lg mb-8">
                <p><span className="font-bold text-green-500">{correctAnswers}</span> Richtig</p>
                <p><span className="font-bold text-red-500">{vocabulary.length - correctAnswers}</span> Falsch</p>
            </div>
            <div className="flex gap-4">
                <Button onClick={resetSession} size="lg"><RotateCcw className="mr-2 h-4 w-4" /> Nochmal versuchen</Button>
                <Button variant="outline" size="lg" onClick={handleBackToSelection}>
                    Zur Vokabelauswahl
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
          Karte {currentIndex + 1} von {vocabulary.length}
        </p>
      </div>

      <div className="w-full max-w-2xl h-80 [perspective:1000px] relative">
        <Card
          className={cn(
            "relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]",
            isFlipped && "[transform:rotateX(-180deg)]"
          )}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front of the card */}
          <div className="absolute w-full h-full [backface-visibility:hidden] flex items-center justify-center p-6 rounded-2xl bg-card">
            <p className="text-4xl font-bold text-center font-headline">{currentCard.term}</p>
          </div>
          {/* Back of the card */}
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateX(180deg)] flex flex-col items-center justify-center p-6 rounded-2xl bg-card">
            <p className="text-4xl font-bold text-center font-headline">{currentCard.definition}</p>
            {currentCard.notes && (
                <div className="flex items-center gap-2 text-lg text-center text-muted-foreground mt-4">
                  <Lightbulb className="h-5 w-5" />
                  <p>{currentCard.notes}</p>
                </div>
            )}
          </div>
        </Card>
      </div>
      
       <div className="w-full max-w-2xl h-16 mt-8 flex items-center justify-center">
          {!isFlipped ? (
            <Button size="lg" className="w-full" onClick={() => setIsFlipped(true)}>Umdrehen</Button>
          ) : (
            <div className={cn("flex gap-4 transition-opacity duration-300 w-full", !isFlipped && 'opacity-0 pointer-events-none')}>
                <Button variant="outline" size="lg" className="w-full h-12 text-base" onClick={() => handleAnswer(false)}>
                <X className="mr-2 h-4 w-4" /> Wusste ich nicht
                </Button>
                <Button variant="default" size="lg" className="w-full h-12 text-base" onClick={() => handleAnswer(true)}>
                <Check className="mr-2 h-4 w-4" /> Wusste ich
                </Button>
            </div>
          )}
       </div>
    </div>
  );
}
