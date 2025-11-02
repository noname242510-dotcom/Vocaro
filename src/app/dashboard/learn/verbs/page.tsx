
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Check, Loader2, RotateCcw, X, Lightbulb } from 'lucide-react';
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


interface PracticeItem {
    id: string;
    verbInfinitive: string;
    front: string;
    back: string;
}

interface VerbLearnState {
  practiceItems: PracticeItem[];
  currentIndex: number;
  incorrectlyAnsweredIds: Set<string>;
}

// Function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

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
    const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
    const [initialItems, setInitialItems] = useState<PracticeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [subjectId, setSubjectId] = useState<string | null>(null);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [incorrectlyAnsweredIds, setIncorrectlyAnsweredIds] = useState<Set<string>>(new Set());
    const [showResults, setShowResults] = useState(false);
    const [isNewCard, setIsNewCard] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const [isGermanFirst, setIsGermanFirst] = useState(false);
    const [shouldShowHints, setShouldShowHints] = useState(true);

    const [history, setHistory] = useState<VerbLearnState[]>([]);

    useEffect(() => {
        const germanFirstSetting = localStorage.getItem('query-direction-verbs') === 'true';
        setIsGermanFirst(germanFirstSetting);

        const showHintsSetting = localStorage.getItem('show-verb-hints') !== 'false';
        setShouldShowHints(showHintsSetting);

        const sessionData = sessionStorage.getItem('verb-practice-session');
        const subjectIdData = sessionStorage.getItem('verb-practice-subject-id');

        if (!sessionData || !subjectIdData) {
            setError('Keine Übungsdaten gefunden. Bitte gehe zurück und wähle Verben aus.');
            setIsLoading(false);
            return;
        }

        setSubjectId(subjectIdData);

        try {
            const verbs: (Verb & { selectedTenses: string[] })[] = JSON.parse(sessionData);
            const items: PracticeItem[] = [];

            verbs.forEach((verb) => {
                if (verb.selectedTenses.length === 0) {
                    // Only practice infinitive
                    items.push({
                        id: `${verb.id}-infinitive`,
                        verbInfinitive: verb.infinitive,
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
                                        front = `${germanPronoun} ${germanForm}`;
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
            setIsNewCard(true);

        } catch (e) {
            console.error(e);
            setError('Fehler beim Verarbeiten der Übungsdaten.');
        } finally {
            setIsLoading(false);
        }

    }, []);

    useEffect(() => {
        if (isNewCard) {
            const timer = setTimeout(() => setIsNewCard(false), 300); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [isNewCard]);
    
    const totalItemCount = initialItems.length;
    const correctAnswersCount = totalItemCount > 0 ? totalItemCount - practiceItems.length : 0;
    const progress = totalItemCount > 0 ? (correctAnswersCount / totalItemCount) * 100 : 0;

    const handleGoBack = () => {
        if (history.length > 0) {
          const lastState = history[history.length - 1];
          setPracticeItems(lastState.practiceItems);
          setCurrentIndex(lastState.currentIndex);
          setIncorrectlyAnsweredIds(lastState.incorrectlyAnsweredIds);
          setHistory(prev => prev.slice(0, -1));
          setIsFlipped(false);
          setIsNewCard(true);
        }
    };


    const handleAnswer = (knewIt: boolean) => {
        if (!isFlipped) return;

        setHistory(prev => [...prev, { practiceItems, currentIndex, incorrectlyAnsweredIds }]);
    
        const currentCard = practiceItems[currentIndex];
        let remainingCards = [...practiceItems];
    
        if (!knewIt) {
            // Mark as incorrect for this session
            if (!incorrectlyAnsweredIds.has(currentCard.id)) {
                setIncorrectlyAnsweredIds(prev => new Set(prev).add(currentCard.id));
            }
            
            // Move card to the end of the queue for repetition
            const cardToRepeat = remainingCards.splice(currentIndex, 1)[0];
            remainingCards.push(cardToRepeat);
        } else {
            // Correct answer: remove the card from this session's queue
            remainingCards.splice(currentIndex, 1);
        }
    
        if (remainingCards.length === 0) {
            const incorrectCount = incorrectlyAnsweredIds.size;
            const correctCount = totalItemCount - incorrectCount;
            const finalScore = totalItemCount > 0 ? Math.round((correctCount / totalItemCount) * 100) : 0;
            
            const confettiEnabled = localStorage.getItem('enable-confetti') !== 'false';
            if (finalScore >= 90 && confettiEnabled) {
                setShowConfetti(true);
            }
            setShowResults(true);
        } else {
            // If we removed the last item, the new index should be 0
            const newIndex = currentIndex >= remainingCards.length ? 0 : currentIndex;
            
            setPracticeItems(remainingCards);
            setCurrentIndex(newIndex);
            setIsNewCard(true);
            // Delay flipping back the card to prevent animation clash
            setTimeout(() => setIsFlipped(false), 0);
        }
    };
    
    const resetSession = () => {
        setPracticeItems(shuffleArray(initialItems));
        setCurrentIndex(0);
        setIsFlipped(false);
        setShowResults(false);
        setShowConfetti(false);
        setIncorrectlyAnsweredIds(new Set());
        setHistory([]);
        setIsNewCard(true);
    };

    const handleBackToSubject = () => {
        if (subjectId) {
            router.push(`/dashboard/subjects/${subjectId}?tab=verbs`);
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
    
    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-2xl px-4 sm:px-0">
                <div className="flex items-center justify-start mb-2">
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
                </div>
                <Progress value={progress} className="h-2 w-full mb-1" />
                <p className="text-sm text-muted-foreground text-center">
                    ({correctAnswersCount}/{totalItemCount})
                </p>
            </div>

            <div className="w-full max-w-2xl h-80 [perspective:1000px] relative mt-4">
                <Card
                    className={cn(
                        "relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]",
                        isFlipped && "[transform:rotateX(-180deg)]",
                        isNewCard && 'animate-pop-in'
                    )}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    {/* Front of the card */}
                    <div className="absolute w-full h-full [backface-visibility:hidden] flex flex-col items-center justify-center p-6 rounded-2xl bg-card">
                        {shouldShowHints && <p className="text-xl text-muted-foreground font-light mb-2">{currentCard.verbInfinitive}</p>}
                        <p className="text-4xl font-bold text-center font-headline">{currentCard.front}</p>
                    </div>
                    {/* Back of the card */}
                    <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateX(180deg)] flex flex-col items-center justify-center p-6 rounded-2xl bg-card">
                         <p className="text-4xl font-bold text-center font-headline">{currentCard.back}</p>
                    </div>
                </Card>
            </div>

            <div className="mt-8 w-full max-w-2xl">
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
            {history.length > 0 && !isFlipped && (
                <Button variant="link" onClick={handleGoBack} className="mt-4 text-muted-foreground">
                    Zurück
                </Button>
            )}
        </div>
    );
}

    
