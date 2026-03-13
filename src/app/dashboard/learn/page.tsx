"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    X,
    Check,
    ChevronLeft,
    ChevronRight,
    CornerDownLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
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
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useSettings } from '@/contexts/settings-context';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';


type LearnItem = {
    id: string;
    type: 'vocab' | 'verb';
    term: string;
    definition: string;
    data: any;
    isMastered?: boolean;
    stackId?: string;
    subjectLanguage?: string;
};

function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

const LoadingSpinner = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex space-x-2">
            <div className="w-3 h-3 bg-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-3 h-3 bg-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-3 bg-foreground rounded-full animate-bounce"></div>
        </div>
        <style jsx>{`
      @keyframes bounce {
        0%, 80%, 100% {
          transform: scale(0);
        }
        40% {
          transform: scale(1.0);
        }
      }
      .animate-bounce {
        animation: bounce 1.4s infinite ease-in-out both;
      }
    `}</style>
    </div>
);


function FinishedScreen({ stats, onRestart, onBackToSubject }: { stats: { correct: number; incorrect: number; }, onRestart: () => void, onBackToSubject: () => void }) {
    const total = stats.correct + stats.incorrect;
    const percentage = total > 0 ? Math.round((stats.correct / total) * 100) : 0;

    useEffect(() => {
        if (percentage >= 80) {
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 },
                colors: document.documentElement.classList.contains('dark') ? ['#ffffff'] : ['#000000'],
            });
        }
    }, [percentage]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-8 px-6 animate-in fade-in zoom-in duration-500">
            <h1 className="text-5xl font-black font-headline">Runde abgeschlossen!</h1>

            <div className="relative">
                <div className="absolute -inset-4 bg-primary/10 blur-xl rounded-full" />
                <div className="relative bg-card shadow-lg rounded-full w-60 h-60 flex flex-col justify-center items-center">
                    <p className="font-headline text-7xl font-black text-primary">{percentage}<span className="text-3xl align-top">%</span></p>
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mt-1">Richtig</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="bg-card p-4 rounded-2xl">
                    <p className="text-4xl font-bold font-headline text-green-500">{stats.correct}</p>
                    <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Richtig</p>
                </div>
                <div className="bg-card p-4 rounded-2xl">
                    <p className="text-4xl font-bold font-headline text-destructive">{stats.incorrect}</p>
                    <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Falsch</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <Button className="h-16 flex-1 text-lg font-bold rounded-full" onClick={onRestart}>
                    Wiederholen
                </Button>
                <Button variant="outline" className="h-16 flex-1 text-lg font-bold rounded-full border-2" onClick={onBackToSubject}>
                    Zurück zum Fach
                </Button>
            </div>
        </div>
    );
}

export default function LearnPage() {
    const { firestore, user } = useFirebase();
    const { settings } = useSettings();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const { triggerHapticFeedback } = useHapticFeedback();

    const [deck, setDeck] = useState<LearnItem[]>([]);
    const [queue, setQueue] = useState<LearnItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [correctlyAnswered, setCorrectlyAnswered] = useState<LearnItem[]>([]);
    const [incorrectlyAnswered, setIncorrectlyAnswered] = useState<LearnItem[]>([]);

    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFinished, setIsFinished] = useState(false);

    const [userInput, setUserInput] = useState('');
    const [answerStatus, setAnswerStatus] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');

    const [subjectId, setSubjectId] = useState<string | null>(null);

    // Initial data loading effect
    useEffect(() => {
        const init = async () => {
            if (!firestore || !user) return;

            const storedSubjectId = sessionStorage.getItem('learn-session-subject');
            const vocabIdsJson = sessionStorage.getItem('learn-session-vocab');

            if (!storedSubjectId || !vocabIdsJson) {
                setIsLoading(false);
                return;
            }
            setSubjectId(storedSubjectId);
            try {
                const vocabIds: string[] = JSON.parse(vocabIdsJson);
                const allItems: LearnItem[] = [];

                const stacksRef = collection(firestore, 'users', user.uid, 'subjects', storedSubjectId, 'stacks');
                const stacksSnap = await getDocs(stacksRef);

                for (const stackDoc of stacksSnap.docs) {
                    const vocabRef = collection(stackDoc.ref, 'vocabulary');
                    const vocabSnap = await getDocs(vocabRef);
                    vocabSnap.docs.forEach(d => {
                        if (vocabIds.includes(d.id)) {
                            const data = d.data() as VocabularyItem;
                            allItems.push({
                                id: d.id,
                                type: 'vocab',
                                term: data.term,
                                definition: data.definition,
                                data,
                                isMastered: data.isMastered,
                                stackId: stackDoc.id,
                            });
                        }
                    });
                }

                const shuffledItems = shuffleArray(allItems);
                setDeck(shuffledItems);
                setQueue(shuffledItems);
            } catch (e) {
                console.error("Learn page init error:", e);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [firestore, user]);

    const handleCheckAnswer = () => {
        if (!currentItem) return;
        setIsFlipped(true);
        triggerHapticFeedback('light');

        const expectedAnswer = settings?.vocabQueryDirection ? currentItem.term : currentItem.definition;
        const isCorrect = userInput.trim().toLowerCase() === expectedAnswer.trim().toLowerCase();

        if (isCorrect) {
            setAnswerStatus('correct');
        } else {
            setAnswerStatus('incorrect');
        }
    };

    const goToNextCard = (wasCorrect: boolean) => {
        const currentItem = queue[currentIndex];
        let newQueue = [...queue];

        if (wasCorrect) {
            triggerHapticFeedback('light');
            // Remove from queue
            newQueue.splice(currentIndex, 1);
            // Add to correctly answered if it's the first time
            if (!correctlyAnswered.some(item => item.id === currentItem.id) && !incorrectlyAnswered.some(item => item.id === currentItem.id)) {
                setCorrectlyAnswered(prev => [...prev, currentItem]);
            }
            // Update Firestore for mastered status
            if (subjectId && currentItem.stackId && !currentItem.isMastered) {
                const docRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', currentItem.stackId, 'vocabulary', currentItem.id);
                updateDoc(docRef, { isMastered: true }).catch(console.error);
            }
        } else {
            triggerHapticFeedback('heavy');
            // Add to incorrectly answered if it's the first time
            if (!incorrectlyAnswered.some(item => item.id === currentItem.id)) {
                setIncorrectlyAnswered(prev => [...prev, currentItem]);
            }
            // Move card to the back of the queue
            const itemToMove = newQueue.splice(currentIndex, 1)[0];
            newQueue.push(itemToMove);
        }

        // Reset state for next card
        setIsFlipped(false);
        setUserInput('');
        setAnswerStatus('unanswered');

        if (newQueue.length === 0) {
            setIsFinished(true);
        } else {
            // Adjust index if we removed the last item
            const newIndex = currentIndex >= newQueue.length ? 0 : currentIndex;
            setQueue(newQueue);
            setCurrentIndex(newIndex);
            inputRef.current?.focus();
        }
    };


    const handleRestart = () => {
        setIsFinished(false);
        setQueue(shuffleArray(deck));
        setCurrentIndex(0);
        setCorrectlyAnswered([]);
        setIncorrectlyAnswered([]);
    };

    const handleBackToSubject = () => {
        if (subjectId) {
            router.push(`/dashboard/subjects/${subjectId}`);
        } else {
            router.push('/dashboard');
        }
    };

    const progress = deck.length > 0 ? ((deck.length - queue.length + (answerStatus === 'correct' ? 1 : 0)) / deck.length) * 100 : 0;
    const currentItem = !isLoading && !isFinished ? queue[currentIndex] : null;

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (deck.length === 0 && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-8 text-center px-6">
                <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4"><X className="h-12 w-12 text-muted-foreground/30" /></div>
                <div className="space-y-4">
                    <h2 className="text-4xl font-black font-headline">Keine Karten ausgewählt</h2>
                    <p className="text-xl text-muted-foreground max-w-sm font-medium">Wähle zuerst einige Vokabeln in einem Fach aus, um sie zu lernen.</p>
                </div>
                <Button onClick={() => router.push('/dashboard')} className="h-16 px-12 rounded-full text-xl font-bold">Zum Dashboard</Button>
            </div>
        );
    }

    if (isFinished) {
        return <FinishedScreen
            stats={{ correct: correctlyAnswered.length, incorrect: incorrectlyAnswered.length }}
            onRestart={handleRestart}
            onBackToSubject={handleBackToSubject}
        />;
    }

    const frontContent = settings?.vocabQueryDirection ? currentItem?.definition : currentItem?.term;
    const backContent = settings?.vocabQueryDirection ? currentItem?.term : currentItem?.definition;

    return (
        <div className="max-w-2xl mx-auto h-screen flex flex-col justify-between py-4 px-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 w-full">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Lernsitzung beenden?</AlertDialogTitle>
                            <AlertDialogDescription>Dein aktueller Fortschritt in dieser Runde geht verloren.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBackToSubject}>Beenden</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Progress value={progress} className="w-full h-3" />
                <div className="text-sm font-bold text-muted-foreground min-w-[70px] text-right">
                    {deck.length - queue.length + (answerStatus === 'correct' ? 1 : 0)} / {deck.length}
                </div>
            </div>

            {/* Card */}
            <div className="relative w-full aspect-[4/2.5] my-4">
                <div
                    className={cn(
                        "absolute inset-0 w-full h-full p-8 rounded-3xl flex items-center justify-center text-center transition-transform duration-500",
                        isFlipped ? '[transform:rotateX(180deg)]' : '[transform:rotateX(0deg)]',
                        "bg-card shadow-lg"
                    )}
                    style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
                >
                    <p className="text-3xl md:text-4xl font-bold font-headline">{frontContent}</p>
                </div>
                <div
                    className={cn(
                        "absolute inset-0 w-full h-full p-8 rounded-3xl flex flex-col items-center justify-center text-center transition-transform duration-500",
                        isFlipped ? '[transform:rotateX(0deg)]' : '[transform:rotateX(-180deg)]',
                        answerStatus === 'unanswered' ? 'bg-card' : answerStatus === 'correct' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40',
                        "shadow-lg"
                    )}
                    style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
                >
                    <p className="text-3xl md:text-4xl font-bold font-headline mb-2">{backContent}</p>
                    {answerStatus !== 'correct' && (
                        <>
                            <p className="text-muted-foreground">Deine Antwort:</p>
                            <p className="text-lg font-mono p-2 bg-black/5 dark:bg-white/5 rounded-md">{userInput}</p>
                        </>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="w-full min-h-[96px]">
                {isFlipped ? (
                    <div className="flex gap-4 animate-in fade-in">
                        <Button variant="outline" className="h-24 flex-1 rounded-2xl text-lg font-bold" onClick={() => goToNextCard(false)}>
                            <X className="mr-2 h-6 w-6" /> Falsch
                        </Button>
                        <Button className="h-24 flex-1 rounded-2xl text-lg font-bold" onClick={() => goToNextCard(true)}>
                            <Check className="mr-2 h-6 w-6" /> Richtig
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleCheckAnswer(); }} className="space-y-4 animate-in fade-in">
                        <Input
                            ref={inputRef}
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Antwort eingeben..."
                            className="h-20 text-center text-xl rounded-2xl"
                            autoFocus
                        />
                         <div className="flex gap-4">
                             <Button type="button" variant="ghost" className="h-12 flex-1 rounded-full" onClick={() => { setIsFlipped(true); setAnswerStatus('incorrect'); triggerHapticFeedback('light'); }}>Überspringen</Button>
                            <Button type="submit" className="h-12 flex-1 rounded-full">
                                Prüfen <CornerDownLeft className="ml-2 h-4 w-4"/>
                             </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}