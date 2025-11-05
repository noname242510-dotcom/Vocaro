
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { X, Check, RotateCcw, Loader2, Lightbulb, ArrowLeft, Pencil, ChevronLeft, Smile, Frown, Meh } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/confetti';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, where, documentId, collectionGroup } from 'firebase/firestore';
import type { VocabularyItem } from '@/lib/types';
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
import { Input } from '@/components/ui/input';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

// Function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect' | 'accepted';

interface LearnState {
  vocabulary: VocabularyItem[];
  currentIndex: number;
  incorrectlyAnsweredIds: Set<string>;
  answeredIds: Map<string, AnswerStatus>;
  userInput: string;
}

const DiffHighlight = ({userInput, correctAnswer}: {userInput: string, correctAnswer: string}) => {
    const userChars = userInput.trim().split('');
    const correctChars = correctAnswer.trim().split('');

    return (
        <p className="text-xl font-mono text-center mb-1">
        {userChars.map((char, index) => (
            <span 
                key={index}
                className={cn(
                    "border-b-2",
                    index < correctChars.length && char.toLowerCase() === correctChars[index].toLowerCase()
                        ? 'border-transparent'
                        : 'border-destructive'
                )}
            >
                {char}
            </span>
        ))}
        </p>
    );
};


export default function LearnPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { triggerHapticFeedback } = useHapticFeedback();
  
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [initialVocab, setInitialVocab] = useState<VocabularyItem[]>([]);
  const [totalVocabCount, setTotalVocabCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [incorrectlyAnsweredIds, setIncorrectlyAnsweredIds] = useState<Set<string>>(new Set());
  const [answeredIds, setAnsweredIds] = useState<Map<string, AnswerStatus>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [isNewCard, setIsNewCard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [isTermFirst, setIsTermFirst] = useState(true);
  const [shouldShowHints, setShouldShowHints] = useState(true);

  const [history, setHistory] = useState<LearnState[]>([]);
  
  // Typed Input Mode State
  const [isTypedMode, setIsTypedMode] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');


  useEffect(() => {
    // Load settings from local storage
    const termFirstSetting = localStorage.getItem('query-direction-flashcards') !== 'true';
    setIsTermFirst(termFirstSetting);
    
    const showHintsSetting = localStorage.getItem('show-vocab-hints') !== 'false';
    setShouldShowHints(showHintsSetting);
    
    const typedModeSetting = localStorage.getItem('learn-mode-typed') === 'true';
    setIsTypedMode(typedModeSetting);

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
      let vocabIds: string[] = [];
      try {
        vocabIds = JSON.parse(vocabIdsJson);
      } catch (e) {
        setError('Fehler beim Lesen der Vokabel-IDs.');
        setIsLoading(false);
        return;
      }

      if (vocabIds.length === 0) {
        setError('Keine Vokabeln ausgewählt.');
        setIsLoading(false);
        return;
      }
      
      try {
        const allVocab: VocabularyItem[] = [];
        const CHUNK_SIZE = 30; // Firestore 'in' query limit
        
        const stacksCollectionRef = collection(firestore, 'users', user.uid, 'subjects', storedSubjectId, 'stacks');
        const stacksSnapshot = await getDocs(stacksCollectionRef);
        const queryPromisesPerStack: Promise<any>[] = [];

        for (const stackDoc of stacksSnapshot.docs) {
          const vocabCollectionRef = collection(stackDoc.ref, 'vocabulary');
          
          for (let i = 0; i < vocabIds.length; i += CHUNK_SIZE) {
            const chunk = vocabIds.slice(i, i + CHUNK_SIZE);
            if (chunk.length > 0) {
              const vocabQuery = query(vocabCollectionRef, where(documentId(), 'in', chunk));
              queryPromisesPerStack.push(getDocs(vocabQuery));
            }
          }
        }

        const allSnapshots = await Promise.all(queryPromisesPerStack);
        allSnapshots.forEach(snapshot => {
          snapshot.forEach((doc: any) => {
            if (vocabIds.includes(doc.id)) {
               allVocab.push({ ...doc.data(), id: doc.id } as VocabularyItem);
            }
          });
        });
        
        const uniqueVocab = Array.from(new Map(allVocab.map(item => [item.id, item])).values());


        if (uniqueVocab.length === 0 && vocabIds.length > 0) {
          setError('Ausgewählte Vokabeln konnten nicht geladen werden.');
        } else {
          const shuffledVocab = shuffleArray(uniqueVocab);
          setVocabulary(shuffledVocab);
          setInitialVocab(shuffledVocab);
          setTotalVocabCount(shuffledVocab.length);
          setIsNewCard(true);
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

  useEffect(() => {
    if (isNewCard) {
      const timer = setTimeout(() => {
        setIsNewCard(false);
        if (isTypedMode && inputRef.current) {
            inputRef.current.focus();
        }
      }, 300); // Duration of the animation
      return () => clearTimeout(timer);
    }
  }, [isNewCard, isTypedMode]);
  
  const correctAnswersCount = Array.from(answeredIds.values()).filter(status => status === 'correct' || status === 'accepted').length;
  const progress = totalVocabCount > 0 ? (correctAnswersCount / totalVocabCount) * 100 : 0;

  const handleGoBack = () => {
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      setVocabulary(lastState.vocabulary);
      setCurrentIndex(lastState.currentIndex);
      setIncorrectlyAnsweredIds(lastState.incorrectlyAnsweredIds);
      setAnsweredIds(lastState.answeredIds);
      setUserInput(lastState.userInput);

      setHistory(prev => prev.slice(0, -1));
      
      setAnswerStatus('unanswered');
      setIsFlipped(false);
      setIsNewCard(true);
    }
  };
  
  const goToNextCard = () => {
     let remainingCards = [...vocabulary];
     remainingCards.splice(currentIndex, 1);
     
     if (remainingCards.length === 0) {
        finishSession();
     } else {
        const newIndex = currentIndex >= remainingCards.length ? 0 : currentIndex;
        
        setVocabulary(remainingCards);
        setCurrentIndex(newIndex);
        
        // Reset for next card
        setIsNewCard(true);
        setIsFlipped(false);
        setAnswerStatus('unanswered');
        setUserInput('');
     }
  }

  const handleClassicAnswer = (knewIt: boolean) => {
    if (!isFlipped || !user || !firestore) return;

    setHistory(prev => [...prev, { vocabulary, currentIndex, incorrectlyAnsweredIds, answeredIds, userInput }]);

    const currentCard = vocabulary[currentIndex];

    if (knewIt) {
        setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'correct'));
        triggerHapticFeedback('light');
        goToNextCard();
    } else {
        if (!incorrectlyAnsweredIds.has(currentCard.id)) {
            setIncorrectlyAnsweredIds(prev => new Set(prev).add(currentCard.id));
        }
        setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'incorrect'));
        triggerHapticFeedback('heavy');

        const cardToRepeat = vocabulary.splice(currentIndex, 1)[0];
        const newVocabulary = [...vocabulary, cardToRepeat];
        
        setVocabulary(newVocabulary);
        
        // No need to change index, as the next card is now at the current index
        setIsNewCard(true);
        setTimeout(() => setIsFlipped(false), 0);
    }
  };

  const handleCheckAnswer = () => {
    if (isFlipped) {
      goToNextCard();
      return;
    }

    setHistory(prev => [...prev, { vocabulary, currentIndex, incorrectlyAnsweredIds, answeredIds, userInput }]);
    setIsFlipped(true);

    const currentCard = vocabulary[currentIndex];
    const expectedAnswer = isTermFirst ? currentCard.definition : currentCard.term;

    // Simple case-insensitive and trimming comparison
    const isCorrect = userInput.trim().toLowerCase() === expectedAnswer.trim().toLowerCase();

    if (isCorrect) {
      setAnswerStatus('correct');
      setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'correct'));
      triggerHapticFeedback('light');
    } else {
      setAnswerStatus('incorrect');
      if (!incorrectlyAnsweredIds.has(currentCard.id)) {
        setIncorrectlyAnsweredIds(prev => new Set(prev).add(currentCard.id));
      }
      setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'incorrect'));
      triggerHapticFeedback('heavy', 'heavy'); // Double tap
    }
  };
  
  const handleMarkAsCorrect = () => {
    setAnswerStatus('accepted');
    const currentCard = vocabulary[currentIndex];
    setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'accepted'));
    triggerHapticFeedback('light');
  }

  const finishSession = () => {
    const incorrectCount = incorrectlyAnsweredIds.size;
    const correctCount = totalVocabCount - incorrectCount;
    const finalScore = totalVocabCount > 0 ? Math.round((correctCount / totalVocabCount) * 100) : 0;
    
    const confettiEnabled = localStorage.getItem('enable-confetti') !== 'false';
    if (finalScore >= 90 && confettiEnabled) {
        setShowConfetti(true);
    }
    setShowResults(true);
  };

  const resetSession = () => {
    setVocabulary(shuffleArray(initialVocab));
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowResults(false);
    setShowConfetti(false);
    setIncorrectlyAnsweredIds(new Set());
    setAnsweredIds(new Map());
    setHistory([]);
    setUserInput('');
    setAnswerStatus('unanswered');
    setIsNewCard(true);
  };
  
  const handleBackToSelection = () => {
    if (subjectId) {
        router.push(`/dashboard/subjects/${subjectId}?tab=vocabulary`);
    } else {
        router.push('/dashboard');
    }
  };
  
  const toggleInputMode = () => {
    const newMode = !isTypedMode;
    setIsTypedMode(newMode);
    localStorage.setItem('learn-mode-typed', String(newMode));
    
    // Reset only the state for the current card view
    setUserInput('');
    setAnswerStatus('unanswered');
    setIsFlipped(false);
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
    const incorrectCount = incorrectlyAnsweredIds.size;
    const correctCount = totalVocabCount - incorrectCount;
    const finalScore = totalVocabCount > 0 ? Math.round((correctCount / totalVocabCount) * 100) : 0;
    const motivationMessage = getMotivationMessage(finalScore);
    
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
            <Confetti active={showConfetti} />
            <h1 className="text-2xl font-semibold font-headline mb-4 max-w-md">{motivationMessage}</h1>
            <p className="text-7xl font-bold mb-4">{finalScore}%</p>
            <div className="flex gap-8 text-lg mb-8">
                <p><span className="font-bold">{correctCount}</span> Richtig</p>
                <p><span className="font-bold">{incorrectCount}</span> Falsch</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-sm">
                <Button onClick={resetSession} size="lg" className="w-full"><RotateCcw className="mr-2 h-4 w-4" /> Nochmal versuchen</Button>
                <Button variant="outline" size="lg" className="w-full" onClick={handleBackToSelection}>
                    Zur Vokabelübersicht
                </Button>
            </div>
        </div>
    );
  }
  
  const FeedbackIcon = ({ status }: { status: AnswerStatus }) => {
    switch (status) {
        case 'correct': return <Smile className="h-10 w-10" />;
        case 'incorrect': return <Frown className="h-10 w-10" />;
        case 'accepted': return <Meh className="h-10 w-10" />;
        default: return <div className="h-10 w-10" />;
    }
  };
  
  const expectedAnswer = isTermFirst ? currentCard.definition : currentCard.term;


  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-2xl px-4 sm:px-0">
        <div className="flex items-center justify-between mb-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Abfrage beenden?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Möchtest du die aktuelle Lernsitzung wirklich beenden und zum Fach zurückkehren? Dein Fortschritt geht verloren.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBackToSelection}>Beenden</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button variant={isTypedMode ? 'default' : 'ghost'} size="icon" onClick={toggleInputMode}>
                <Pencil className="h-5 w-5" />
            </Button>
        </div>
        <Progress value={progress} className="h-2 w-full mb-1" />
        <p className="text-sm text-muted-foreground text-center">
          ({correctAnswersCount}/{totalVocabCount})
        </p>
      </div>

      <div className="w-full max-w-2xl h-80 [perspective:1000px] relative mt-4">
        <Card
          className={cn(
            "relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]",
            isFlipped && "[transform:rotateX(-180deg)]",
            isNewCard && 'animate-pop-in'
          )}
          onClick={() => !isTypedMode && setIsFlipped(!isFlipped)}
        >
          {/* Front of the card */}
          <div className="absolute w-full h-full [backface-visibility:hidden] flex flex-col items-center justify-center p-6 rounded-2xl glass-effect">
            <p className="text-4xl font-bold text-center">{isTermFirst ? currentCard.term : currentCard.definition}</p>
          </div>
          {/* Back of the card */}
          <div className={cn("absolute w-full h-full [backface-visibility:hidden] [transform:rotateX(180deg)] flex flex-col items-center justify-center p-6 rounded-2xl glass-effect")}>
             <div className="flex flex-col items-center justify-center gap-4">
                {isTypedMode && answerStatus === 'incorrect' && (
                    <DiffHighlight userInput={userInput} correctAnswer={expectedAnswer} />
                )}
                <p className="text-4xl font-bold text-center">{isTermFirst ? currentCard.definition : currentCard.term}</p>
                {isTypedMode && <div className="mt-2"><FeedbackIcon status={answerStatus} /></div>}
            </div>

            {shouldShowHints && currentCard.notes && (
                <div className="absolute bottom-16 flex items-start gap-2 text-base text-center text-muted-foreground mt-4 px-6">
                  <Lightbulb className="h-5 w-5 flex-shrink-0" />
                  <p>{currentCard.notes}</p>
                </div>
            )}
            {isTypedMode && answerStatus === 'incorrect' && (
               <div className="absolute bottom-4 text-center opacity-75 transition-opacity duration-300">
                  <Button variant="link" className="text-muted-foreground" onClick={handleMarkAsCorrect}>
                      Ich hab's gewusst
                  </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
      
       <div className="mt-8 w-full max-w-2xl min-h-[6rem] relative">
          {isTypedMode ? (
            <>
              <div className={cn("flex gap-2 transition-opacity duration-300 w-full", isFlipped && 'opacity-0 pointer-events-none')}>
                <Input
                  ref={inputRef}
                  placeholder="Antwort tippen..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckAnswer()}
                  className="text-center text-lg h-12"
                  autoFocus
                />
                <Button size="lg" onClick={handleCheckAnswer}>Überprüfen</Button>
              </div>
              <div className={cn("absolute inset-0 flex gap-2 transition-opacity duration-300 w-full", !isFlipped && 'opacity-0 pointer-events-none')}>
                <Button size="lg" className="w-full" onClick={goToNextCard}>
                  {answerStatus === 'incorrect' ? 'Verstanden' : 'Weiter'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className={cn("absolute inset-0 flex transition-opacity duration-300", isFlipped && 'opacity-0 pointer-events-none')}>
                <Button size="lg" className="w-full" onClick={() => setIsFlipped(true)}>Umdrehen</Button>
              </div>
              <div className={cn("flex gap-2 w-full", !isFlipped && 'opacity-0 pointer-events-none')}>
                <Button variant="outline" size="default" className="flex-1 h-12 text-base transition-all duration-300" onClick={() => handleClassicAnswer(false)} style={{ transform: isFlipped ? 'translateX(0)' : 'translateX(50%) scale(0.9)', opacity: isFlipped ? 1 : 0}}>
                  <X className="mr-2 h-4 w-4" /> Wusste ich nicht
                </Button>
                <Button variant="default" size="default" className="flex-1 h-12 text-base transition-all duration-300" onClick={() => handleClassicAnswer(true)} style={{ transform: isFlipped ? 'translateX(0)' : 'translateX(-50%) scale(0.9)', opacity: isFlipped ? 1 : 0}}>
                  <Check className="mr-2 h-4 w-4" /> Wusste ich
                </Button>
              </div>
            </>
          )}
       </div>
       <div className="w-full max-w-2xl flex justify-center">
            {history.length > 0 && (
                <Button variant="link" onClick={handleGoBack} className="mt-4 text-muted-foreground">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Zurück
                </Button>
            )}
       </div>
    </div>
  );
}

    