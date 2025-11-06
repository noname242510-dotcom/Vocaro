
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Check, Loader2, RotateCcw, X, Lightbulb, Pencil, ChevronLeft, Smile, Frown, Meh } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Verb, VerbTense } from '@/lib/types';
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
import { Confetti } from '@/components/confetti';
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

interface PracticeItem {
    id: string;
    verbInfinitive: string;
    isConjugation: boolean; // Flag to identify if it's a conjugation or infinitive translation
    front: string;
    back: string;
}

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect' | 'accepted';

interface VerbLearnState {
  practiceItems: PracticeItem[];
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

const germanPronounMap: Record<string, string> = {
    "ich": "ich",
    "du": "du",
    "er/sie/es": "er/sie/es",
    "wir": "wir",
    "ihr": "ihr",
    "sie/Sie": "sie/Sie",
    "I": "ich",
    "you": "du", // or Sie, context is needed. Defaulting to 'du'
    "he/she/it": "er/sie/es",
    "we": "wir",
    "they": "sie",
    "je": "ich",
    "j'": "ich",
    "tu": "du",
    "il/elle/on": "er/sie/es",
    "nous": "wir",
    "vous": "ihr", // or Sie
    "ils/elles": "sie",
    "form": "form", // for participles etc.
    "(tu)": "(du)",
    "(nous)": "(wir)",
    "(vous)": "(ihr)",
};


export default function VerbPracticePage() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const { triggerHapticFeedback } = useHapticFeedback();
    
    const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
    const [initialItems, setInitialItems] = useState<PracticeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [subjectId, setSubjectId] = useState<string | null>(null);
    const [subjectEmoji, setSubjectEmoji] = useState<string>('🌐');
    const [totalItemCount, setTotalItemCount] = useState(0);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [incorrectlyAnsweredIds, setIncorrectlyAnsweredIds] = useState<Set<string>>(new Set());
    const [answeredIds, setAnsweredIds] = useState<Map<string, AnswerStatus>>(new Map());
    const [showResults, setShowResults] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const [isGermanFirst, setIsGermanFirst] = useState(false);
    const [shouldShowHints, setShouldShowHints] = useState(true);

    const [history, setHistory] = useState<VerbLearnState[]>([]);
    
    // Typed Input Mode State
    const [isTypedMode, setIsTypedMode] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');


    useEffect(() => {
        const germanFirstSetting = localStorage.getItem('query-direction-verbs') === 'true';
        setIsGermanFirst(germanFirstSetting);

        const showHintsSetting = localStorage.getItem('show-verb-hints') !== 'false';
        setShouldShowHints(showHintsSetting);
        
        const typedModeSetting = localStorage.getItem('learn-mode-typed') === 'true';
        setIsTypedMode(typedModeSetting);

        const sessionData = sessionStorage.getItem('verb-practice-session');
        const subjectIdData = sessionStorage.getItem('verb-practice-subject-id');
        const storedSubjectEmoji = sessionStorage.getItem('learn-session-emoji');

        if (!sessionData || !subjectIdData) {
            setError('Keine Übungsdaten gefunden. Bitte gehe zurück und wähle Verben aus.');
            setIsLoading(false);
            return;
        }

        setSubjectId(subjectIdData);
        if (storedSubjectEmoji) setSubjectEmoji(storedSubjectEmoji);

        try {
            const verbs: (Verb & { selectedTenses: string[] })[] = JSON.parse(sessionData);
            const items: PracticeItem[] = [];

            verbs.forEach((verb) => {
                if (verb.selectedTenses.length === 0) {
                    // Only practice infinitive
                    items.push({
                        id: `${verb.id}-infinitive`,
                        verbInfinitive: verb.infinitive,
                        isConjugation: false,
                        front: germanFirstSetting ? verb.translation : verb.infinitive,
                        back: germanFirstSetting ? verb.infinitive : verb.translation,
                    });
                } else {
                    // Practice selected tenses
                    verb.selectedTenses.forEach((tense) => {
                        const tenseForms = verb.forms[tense] as VerbTense;
                        const germanTenseForms = verb.germanForms?.[tense] as VerbTense;
                        
                        if (tenseForms) {
                            Object.entries(tenseForms).forEach(([pronoun, form]) => {
                                let front, back;
                                const germanPronoun = germanPronounMap[pronoun] || pronoun;

                                if (germanFirstSetting && germanTenseForms) {
                                    const germanForm = germanTenseForms[germanPronoun];
                                    if(germanForm) {
                                        front = `${germanPronoun}, ${tense}`;
                                        back = `${pronoun} ${form}`;
                                    } else {
                                        // Fallback if no German form is found
                                        front = `${pronoun}, ${tense}`;
                                        back = form;
                                    }
                                } else { // Foreign language first
                                    front = `${pronoun}, ${tense}`;
                                    const germanForm = germanTenseForms ? germanTenseForms[germanPronoun] : '';
                                    back = germanForm ? `${germanPronoun} ${germanForm}` : form;
                                }

                                items.push({
                                    id: `${verb.id}-${tense}-${pronoun}`,
                                    verbInfinitive: verb.infinitive,
                                    isConjugation: true,
                                    front,
                                    back,
                                });
                            });
                        }
                    });
                }
            });

            if (items.length === 0) {
                setError('Keine gültigen Übungseinheiten gefunden. Überprüfe deine Auswahl.');
                setIsLoading(false);
                return;
            }

            const shuffledItems = shuffleArray(items);
            setPracticeItems(shuffledItems);
            setInitialItems(shuffledItems);
            setTotalItemCount(shuffledItems.length);

        } catch (e) {
            console.error(e);
            setError('Fehler beim Verarbeiten der Übungsdaten.');
        } finally {
            setIsLoading(false);
        }

    }, []);

    useEffect(() => {
        if (!isExiting && isTypedMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [currentIndex, isExiting, isTypedMode]);
    
    const correctAnswersCount = Array.from(answeredIds.values()).filter(status => status === 'correct' || status === 'accepted').length;
    const progress = totalItemCount > 0 ? (correctAnswersCount / totalItemCount) * 100 : 0;

    const handleGoBack = () => {
        if (history.length > 0) {
          const lastState = history[history.length - 1];
          setPracticeItems(lastState.practiceItems);
          setCurrentIndex(lastState.currentIndex);
          setIncorrectlyAnsweredIds(lastState.incorrectlyAnsweredIds);
          setAnsweredIds(lastState.answeredIds);
          setUserInput(lastState.userInput);

          setHistory(prev => prev.slice(0, -1));
          
          setAnswerStatus('unanswered');
          setIsFlipped(false);
        }
    };


    const finishSession = () => {
        const incorrectCount = incorrectlyAnsweredIds.size;
        const correctCount = totalItemCount - incorrectCount;
        const finalScore = totalItemCount > 0 ? Math.round((correctCount / totalItemCount) * 100) : 0;
        
        const confettiEnabled = localStorage.getItem('enable-confetti') !== 'false';
        if (finalScore >= 90 && confettiEnabled) {
            setShowConfetti(true);
        }
        setShowResults(true);
    };


    const goToNextCard = (isCorrect: boolean) => {
        const currentCard = practiceItems[currentIndex];
        let remainingCards = [...practiceItems];

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
          
          setPracticeItems(remainingCards);
          setCurrentIndex(newIndex);
        }
    };
    
    const handleClassicAnswer = (knewIt: boolean) => {
        if (!isFlipped || isExiting) return;

        setHistory(prev => [...prev, { practiceItems, currentIndex, incorrectlyAnsweredIds, answeredIds, userInput }]);
    
        const currentCard = practiceItems[currentIndex];

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

        setHistory(prev => [...prev, { practiceItems, currentIndex, incorrectlyAnsweredIds, answeredIds, userInput }]);
        setIsFlipped(true);

        const currentCard = practiceItems[currentIndex];
        const expectedAnswer = currentCard.back;

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
        const currentCard = practiceItems[currentIndex];
        setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'accepted'));
        triggerHapticFeedback('light');
    };
    
    const resetSession = () => {
        setPracticeItems(shuffleArray(initialItems));
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

    const handleBackToSubject = () => {
        if (subjectId) {
            router.push(`/dashboard/subjects/${subjectId}?tab=verbs`);
        } else {
            router.push('/dashboard');
        }
    };

    const toggleInputMode = () => {
        const newMode = !isTypedMode;
        setIsTypedMode(newMode);
        localStorage.setItem('learn-mode-typed', String(newMode));
        
        // Reset card-specific state on mode toggle, unless an answer was just marked
        if (answerStatus === 'unanswered') {
            setUserInput('');
            setAnswerStatus('unanswered');
            setIsFlipped(false);
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
            <Button asChild variant="link" onClick={handleBackToSubject}>Zurück zum Fach</Button>
        </div>;
    }

    const currentCard = practiceItems[currentIndex];

    if (!currentCard && !showResults) {
        return <div className="flex flex-col items-center justify-center h-screen text-center">
           <p>Keine Verben für diese Sitzung geladen.</p>
           <Button asChild variant="link"><Link href="/dashboard">Zurück zum Dashboard</Link></Button>
       </div>;
    }
    
    if (showResults) {
        const incorrectCount = incorrectlyAnsweredIds.size;
        const correctCount = totalItemCount - incorrectCount;
        const finalScore = totalItemCount > 0 ? Math.round((correctCount / totalItemCount) * 100) : 0;
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
                    <Button variant="outline" size="lg" className="w-full" onClick={handleBackToSubject}>
                        Zur Verbübersicht
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
                                <AlertDialogTitle>Übung beenden?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Möchtest du die aktuelle Übung wirklich beenden und zum Fach zurückkehren? Dein Fortschritt geht verloren.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={handleBackToSubject}>Beenden</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant={isTypedMode ? 'default' : 'ghost'} size="icon" onClick={toggleInputMode}>
                        <Pencil className="h-5 w-5" />
                    </Button>
                </div>
                <Progress value={progress} className="h-2 w-full mb-1" />
                <p className="text-sm text-muted-foreground text-center">
                    ({correctAnswersCount}/{totalItemCount})
                </p>
            </div>

            <div className="w-full max-w-2xl h-80 relative mt-4">
                <div
                    key={currentCard.id}
                    className={cn(
                        "relative w-full h-full flex flex-col items-center justify-center p-6 rounded-2xl glass-effect border transition-opacity duration-300",
                         !isExiting ? 'opacity-100' : 'opacity-0'
                    )}
                >
                    <div className="absolute top-4 left-4 text-3xl [perspective:1000px]">
                        <div className={cn("relative transition-transform duration-700 [transform-style:preserve-3d]", isFlipped && "[transform:rotateY(180deg)]")}>
                            <div className="[backface-visibility:hidden]">
                                <span>{isGermanFirst ? '🇩🇪' : subjectEmoji}</span>
                            </div>
                            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                <span>{isGermanFirst ? subjectEmoji : '🇩🇪'}</span>
                            </div>
                        </div>
                    </div>

                    {shouldShowHints && currentCard.isConjugation && (
                        <div className="absolute top-6">
                            <p className="text-xl text-muted-foreground font-light">{currentCard.verbInfinitive}</p>
                        </div>
                    )}
                    <div className="relative w-full h-full flex items-center justify-center [perspective:1000px]">
                      <div className={cn("relative transition-transform duration-700 [transform-style:preserve-3d]", isFlipped && "[transform:rotateY(180deg)]")}>
                          <div className="[backface-visibility:hidden]">
                              <p className="text-4xl font-bold text-center">{currentCard.front}</p>
                          </div>
                          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center">
                              <p className="text-4xl font-bold text-center">{currentCard.back}</p>
                          </div>
                      </div>
                    </div>
                     {isTypedMode && answerStatus === 'incorrect' && isFlipped && (
                        <div className="absolute top-1/2 -translate-y-1/2 mt-12">
                            <DiffHighlight userInput={userInput} correctAnswer={currentCard.back} />
                        </div>
                    )}
                    {isTypedMode && isFlipped && <div className="absolute top-1/2 -translate-y-1/2 mt-24"><FeedbackIcon status={answerStatus} /></div>}

                    {isTypedMode && answerStatus === 'incorrect' && isFlipped && (
                        <div className="absolute bottom-4 text-center opacity-75 transition-opacity duration-300">
                            <Button variant="link" className="text-muted-foreground" onClick={handleMarkAsCorrect}>
                                Ich hab's gewusst
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 w-full max-w-2xl flex flex-col items-center">
                <div className="w-full h-12 relative">
                    {/* Container for the "Umdrehen" button */}
                    <div
                        className={cn(
                            'absolute inset-0 flex justify-center items-center transition-all duration-500',
                            isFlipped || isExiting
                            ? 'opacity-0 scale-90 pointer-events-none'
                            : 'opacity-100 scale-100'
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
                            <Button size="lg" className="w-full" onClick={() => setIsFlipped(true)}>Umdrehen</Button>
                        )}
                    </div>

                    {/* Container for the answer buttons */}
                    <div
                        className={cn(
                            'absolute inset-0 flex justify-center items-center gap-2 transition-opacity duration-500',
                            isFlipped && !isExiting
                            ? 'opacity-100'
                            : 'opacity-0 pointer-events-none'
                        )}
                    >
                        {isTypedMode ? (
                            <Button size="lg" className="w-full" onClick={handleCheckAnswer}>
                                {answerStatus === 'incorrect' ? 'Verstanden' : 'Weiter'}
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
                {history.length > 0 && !isExiting && (
                    <Button variant="link" onClick={handleGoBack} className="mt-4 text-muted-foreground">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Zurück
                    </Button>
                )}
            </div>
        </div>
    );
}

    