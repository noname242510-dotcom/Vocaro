
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
  const [initialVocab, setInitialVocab] = useState<VocabularyItem[]>([]);
  const [totalVocabCount, setTotalVocabCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [persistentlyIncorrectIds, setPersistentlyIncorrectIds] = useState<Set<string>>(new Set());
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
          const shuffledVocab = shuffleArray(selectedVocab);
          setVocabulary(shuffledVocab);
          setInitialVocab(shuffledVocab);
          setTotalVocabCount(shuffledVocab.length);
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

  
  const correctAnswersCount = totalVocabCount > 0 ? totalVocabCount - vocabulary.length : 0;
  const progress = totalVocabCount > 0 ? (correctAnswersCount / totalVocabCount) * 100 : 0;


  const handleAnswer = (knewIt: boolean) => {
    if (!isFlipped) return;

    const currentCard = vocabulary[currentIndex];
    let remainingCards = [...vocabulary];

    if (!knewIt) {
        if (!persistentlyIncorrectIds.has(currentCard.id)) {
            setPersistentlyIncorrectIds(prev => new Set(prev).add(currentCard.id));
        }
        const cardToRepeat = remainingCards.splice(currentIndex, 1)[0];
        remainingCards.push(cardToRepeat);
    } else {
        remainingCards.splice(currentIndex, 1);
    }

    if (remainingCards.length === 0) {
        setShowResults(true);
    } else {
        const newIndex = currentIndex >= remainingCards.length ? 0 : currentIndex;
        setVocabulary(remainingCards);
        setCurrentIndex(newIndex);
        setTimeout(() => setIsFlipped(false), 0);
    }
  };

  const resetSession = () => {
    setVocabulary(shuffleArray(initialVocab));
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowResults(false);
    setPersistentlyIncorrectIds(new Set());
  };
    
  const handleBackToSelection = () => {
    if (subjectId) {
        router.push(`/dashboard/subjects/${subjectId}`);
    } else {
        router.push('/dashboard');
    }
  };

  const getMotivationMessage = (score: number) => {
    if (score >= 90) return "Exzellente Leistung. Halte das Niveau.";
    if (score >= 70) return "Gut gemacht. Ein paar Lücken gibt es noch, die du schließen kannst.";
    if (score >= 50) return "Halb geschafft – konzentriere dich beim nächsten Durchgang auf die Fehler.";
    if (score >= 30) return "Kein Grund zur Sorge. Lerne gezielt die Fehler, dann kommst du schnell voran.";
    return "Das Fundament fehlt noch – wiederhole regelmäßig, um Fortschritt zu sehen.";
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
    const incorrectCount = persistentlyIncorrectIds.size;
    const correctCount = totalVocabCount - incorrectCount;
    const score = totalVocabCount > 0 ? Math.round((correctCount / totalVocabCount) * 100) : 0;
    const motivationMessage = getMotivationMessage(score);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
            <Confetti active={score >= 90} />
            <h1 className="text-2xl font-semibold font-headline mb-4 max-w-md">{motivationMessage}</h1>
            <p className="text-7xl font-bold mb-4">{score}%</p>
            <div className="flex gap-8 text-lg mb-8">
                <p><span className="font-bold">{correctCount}</span> Richtig</p>
                <p><span className="font-bold">{incorrectCount}</span> Falsch</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-sm">
                <Button onClick={resetSession} size="lg" className="w-full"><RotateCcw className="mr-2 h-4 w-4" /> Nochmal versuchen</Button>
                <Button variant="outline" size="lg" className="w-full" onClick={handleBackToSelection}>
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
            ({correctAnswersCount}/{totalVocabCount})
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
                <div className="flex items-start gap-2 text-base text-center text-muted-foreground mt-4">
                  <Lightbulb className="h-5 w-5 flex-shrink-0" />
                  <p>{currentCard.notes}</p>
                </div>
            )}
          </div>
        </Card>
      </div>
      
       <div className="mt-8 w-full max-w-2xl flex items-center justify-center">
          {!isFlipped ? (
            <Button size="lg" className="w-full" onClick={() => setIsFlipped(true)}>Umdrehen</Button>
          ) : (
            <div className={cn("flex gap-2 transition-opacity duration-300 w-full", !isFlipped && 'opacity-0 pointer-events-none')}>
                <Button variant="outline" size="default" className="flex-1 h-12 text-base" onClick={() => handleAnswer(false)}>
                <X className="mr-2 h-4 w-4" /> Wusste ich nicht
                </Button>
                <Button variant="default" size="default" className="flex-1 h-12 text-base" onClick={() => handleAnswer(true)}>
                <Check className="mr-2 h-4 w-4" /> Wusste ich
                </Button>
            </div>
          )}
       </div>
    </div>
  );
}
