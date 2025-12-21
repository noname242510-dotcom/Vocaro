

"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { X, Check, RotateCcw, Loader2, Lightbulb, ArrowLeft, Pencil, ChevronLeft, Smile, Frown, Meh, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/confetti';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, where, documentId, collectionGroup, getDoc, doc } from 'firebase/firestore';
import type { VocabularyItem, Subject } from '@/lib/types';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SpeakerButton } from '@/components/speaker-button';

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
        <div className="text-center">
            
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
        </div>
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

  const [subject, setSubject] = useState<Subject | null>(null);

  const [isExiting, setIsExiting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [isTermFirst, setIsTermFirst] = useState(true);
  const [shouldShowHints, setShouldShowHints] = useState(true);

  const [history, setHistory] = useState<LearnState[]>([]);
  
  // Typed Input Mode State
  const [isTypedMode, setIsTypedMode] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');
  const [isHintPopoverOpen, setIsHintPopoverOpen] = useState(false);

  // Ref for auto-play logic
  const speakerButtonRef = useRef<{ play: () => void }>(null);

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

      try {
        const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', storedSubjectId);
        const subjectDoc = await getDoc(subjectDocRef);
        if (subjectDoc.exists()) {
            setSubject({ ...subjectDoc.data(), id: subjectDoc.id } as Subject);
        } else {
            throw new Error('Subject not found');
        }

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
        }
      } catch (e) {
        console.error(e);
        setError('Die Daten konnten nicht geladen werden. Bitte versuche es erneut.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVocab();

  }, [firestore, user]);

  useEffect(() => {
    if (!isExiting && isTypedMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, isExiting, isTypedMode]);
  
  useEffect(() => {
    if (isFlipped && speakerButtonRef.current) {
      speakerButtonRef.current.play();
    }
  }, [isFlipped]);

  const correctAnswersCount = Array.from(answeredIds.values()).filter(status => status === 'correct' || status === 'accepted').length;
  const progress = totalVocabCount > 0 ? (correctAnswersCount / totalVocabCount) * 100 : 0;

  const saveToHistory = () => {
    setHistory(prev => [...prev, { vocabulary, currentIndex, incorrectlyAnsweredIds, answeredIds, userInput }]);
  };

  const handleGoBack = () => {
    if (isFlipped) {
        setIsFlipped(false);
        setUserInput('');
        setAnswerStatus('unanswered');
        return;
    }

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
    }
  };
  
  const goToNextCard = (isCorrect: boolean) => {
    saveToHistory(); // Save state before moving to the next card
    const currentCard = vocabulary[currentIndex];
    let remainingCards = [...vocabulary];
  
    setAnswerStatus('unanswered');
    setUserInput('');
  
    if (isCorrect) {
      remainingCards.splice(currentIndex, 1);
       if (!answeredIds.has(currentCard.id) || answeredIds.get(currentCard.id) === 'incorrect') {
          setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'correct'));
       }
    } else {
      const cardToRepeat = remainingCards.splice(currentIndex, 1)[0];
      remainingCards.push(cardToRepeat);
    }
  
    if (remainingCards.length === 0) {
      finishSession();
    } else {
      const newIndex = currentIndex >= remainingCards.length ? 0 : currentIndex;
      
      setVocabulary(remainingCards);
      setCurrentIndex(newIndex);
    }
  };

  const handleClassicAnswer = (knewIt: boolean) => {
    if (!isFlipped || isExiting) return;

    const currentCard = vocabulary[currentIndex];
    
    if (knewIt) {
        if (!answeredIds.has(currentCard.id) || answeredIds.get(currentCard.id) === 'incorrect') {
            setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'correct'));
        }
        triggerHapticFeedback('light');
    } else {
        if (!incorrectlyAnsweredIds.has(currentCard.id)) {
            setIncorrectlyAnsweredIds(prev => new Set(prev).add(currentCard.id));
        }
        setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'incorrect'));
        triggerHapticFeedback('heavy');
    }
    
    setIsExiting(true);
    setTimeout(() => {
        setIsFlipped(false);
        goToNextCard(knewIt);
        setIsExiting(false);
    }, 500); // Duration matches animation
  };

  const handleFlipCard = () => {
    setIsFlipped(true);
  };

  const handleCheckAnswer = () => {
    if (isFlipped) {
      const isCorrect = answerStatus === 'correct' || answerStatus === 'accepted';
      setIsExiting(true);
      setTimeout(() => {
        setIsFlipped(false);
        goToNextCard(isCorrect);
        setIsExiting(false);
      }, 500); // Duration matches animation
      return;
    }

    setIsFlipped(true);

    const currentCard = vocabulary[currentIndex];
    const expectedAnswer = isTermFirst ? currentCard.definition : currentCard.term;

    const isCorrect = userInput.trim().toLowerCase() === expectedAnswer.trim().toLowerCase();

    if (isCorrect) {
      setAnswerStatus('correct');
      if (!answeredIds.has(currentCard.id) || answeredIds.get(currentCard.id) === 'incorrect') {
        setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'correct'));
      }
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
  
    // If we switch modes while the answer is already shown and correct, stay flipped.
    if (isFlipped && (answerStatus === 'correct' || answerStatus === 'accepted')) {
        return;
    }
  
    // Otherwise, reset to the front of the card.
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
  const languageHint = subject?.name || 'English';

  const foreignFlag = subject?.emoji || '🌐';
  const germanFlag = '🇩🇪';

  // Front of the card
  const frontWord = isTermFirst ? currentCard.term : currentCard.definition;
  const frontFlag = isTermFirst ? foreignFlag : germanFlag;
  const frontIsForeign = isTermFirst;

  // Back of the card
  const backWord = isTermFirst ? currentCard.definition : currentCard.term;
  const backFlag = isTermFirst ? germanFlag : foreignFlag;
  const backIsForeign = !isTermFirst;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)]">
      <div className="w-full max-w-2xl px-4 sm:px-0 mx-auto">
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

      <div className="w-full max-w-2xl mt-4 mx-auto flex-grow flex flex-col justify-center">
        <div
          key={currentCard.id}
          className={cn(
            "relative w-full h-80 flex flex-col items-center justify-center p-6 rounded-2xl glass-effect border transition-opacity duration-300",
            !isExiting ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="absolute top-4 left-4 text-3xl [perspective:1000px]">
            <div className={cn("relative transition-transform duration-700 [transform-style:preserve-3d]", isFlipped && "[transform:rotateY(180deg)]")}>
                <div className="[backface-visibility:hidden]">
                    <span>{frontFlag}</span>
                </div>
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <span>{backFlag}</span>
                </div>
            </div>
          </div>
          
           <div className="absolute top-4 right-4 h-10 w-10 [perspective:1000px]">
             <div className={cn("relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]", isFlipped && "[transform:rotateY(180deg)]")}>
                {/* Speaker for the foreign word */}
                <div className={cn("absolute inset-0 [backface-visibility:hidden]", !frontIsForeign && "opacity-0")}>
                    <SpeakerButton ref={frontIsForeign ? speakerButtonRef : null} text={currentCard.term} languageHint={languageHint} />
                </div>
                <div className={cn("absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]", !backIsForeign && "opacity-0")}>
                    <SpeakerButton ref={backIsForeign ? speakerButtonRef : null} text={currentCard.term} languageHint={languageHint} />
                </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 [grid-template-areas:_'center'] justify-center items-center [perspective:1000px] w-full px-12">
            {/* These two are invisible but establish the grid area's size */}
            <p className="[grid-area:center] col-start-1 row-start-1 invisible text-4xl font-bold text-center">{frontWord}</p>
            <p className="[grid-area:center] col-start-1 row-start-1 invisible text-4xl font-bold text-center">{backWord}</p>
            
            <div className={cn(
                "col-start-1 row-start-1 [grid-area:center] transition-transform duration-700 [transform-style:preserve-3d]",
                isFlipped && "[transform:rotateY(180deg)]"
            )}>
                <div className="[backface-visibility:hidden] flex flex-col items-center justify-center">
                    <p className="text-4xl font-bold text-center">{frontWord}</p>
                </div>
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center">
                    {isTypedMode && answerStatus === 'incorrect' ? (
                        <div className="flex flex-col items-center justify-center text-center">
                           <DiffHighlight userInput={userInput} correctAnswer={expectedAnswer} />
                           <p className="text-4xl font-bold mt-4">{expectedAnswer}</p>
                           <div className="mt-4">
                               <FeedbackIcon status={answerStatus} />
                           </div>
                        </div>
                    ) : (
                        <p className="text-4xl font-bold text-center">{backWord}</p>
                    )}
                    {isTypedMode && (answerStatus === 'correct' || answerStatus === 'accepted') && (
                        <div className="mt-4">
                            <FeedbackIcon status={answerStatus} />
                        </div>
                    )}
                </div>
            </div>
          </div>

          
          {shouldShowHints && currentCard.notes && (
            <div className="absolute bottom-4 right-4 h-10 w-10 [perspective:1000px]">
              <div className={cn("relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]", isFlipped && "[transform:rotateY(180deg)]")}>
                <div className="[backface-visibility:hidden] w-full h-full">
                  {/* Empty on the front */}
                </div>
                <div className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <Popover open={isHintPopoverOpen} onOpenChange={setIsHintPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); }}>
                        <Lightbulb className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto max-w-xs sm:max-w-sm"
                      side="top"
                    >
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 mt-1 flex-shrink-0" />
                        <p className="text-sm">{currentCard.notes}</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
          {isTypedMode && answerStatus === 'incorrect' && isFlipped &&(
             <div className="absolute bottom-4 text-center opacity-75 transition-opacity duration-300">
                <Button variant="link" className="text-muted-foreground" onClick={handleMarkAsCorrect}>
                    Ich hab's gewusst
                </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-auto w-full max-w-2xl flex flex-col items-center mx-auto pt-4">
        <div className="w-full h-12 relative">
            <div
                className={cn(
                    'absolute inset-0 flex justify-center items-center transition-all duration-300',
                    (isFlipped || isExiting) && 'opacity-0 scale-90 hidden'
                )}
            >
                {isTypedMode ? (
                    <div className="flex gap-2 w-full">
                        <Input
                            ref={inputRef}
                            placeholder="Antwort tippen..."
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCheckAnswer()}
                            className="text-center text-lg h-12 rounded-full"
                            autoFocus
                        />
                        <Button size="lg" onClick={handleCheckAnswer}>Überprüfen</Button>
                    </div>
                ) : (
                    <Button size="lg" className="w-full" onClick={handleFlipCard}>Umdrehen</Button>
                )}
            </div>
            <div
                className={cn(
                    'absolute inset-0 flex justify-center items-center gap-2 transition-all duration-300',
                    (!isFlipped || isExiting) && 'opacity-0 scale-90 hidden'
                )}
            >
                {isTypedMode ? (
                   <Button size="lg" className="w-full" onClick={handleCheckAnswer}>
                    Weiter
                   </Button>
                ) : (
                  <>
                      <Button
                          variant="outline"
                          size="default"
                          className="w-[calc(50%-0.25rem)] h-12 text-base"
                          onClick={() => handleClassicAnswer(false)}
                      >
                          <X className="mr-2 h-4 w-4" /> Wusste ich nicht
                      </Button>
                      <Button
                          variant="default"
                          size="default"
                          className="w-[calc(50%-0.25rem)] h-12 text-base"
                          onClick={() => handleClassicAnswer(true)}
                      >
                          <Check className="mr-2 h-4 w-4" /> Wusste ich
                      </Button>
                  </>
                )}
            </div>
        </div>
        <div className="w-full text-center mt-2">
            {history.length > 0 && !isExiting ? (
              <Button variant="link" onClick={handleGoBack} className="text-muted-foreground">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Zurück
              </Button>
            ) : (
              <div className="h-[36px]" />
            )}
        </div>
      </div>
    </div>
  );
}

    
