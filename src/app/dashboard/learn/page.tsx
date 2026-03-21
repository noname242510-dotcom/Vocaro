"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  X,
  Check,
  Lightbulb,
  ChevronLeft,
  Pencil,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SpeakerButton } from '@/components/speaker-button';
import { useSettings } from '@/contexts/settings-context';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

type LearnItem = {
  id: string;
  type: 'vocab' | 'verb';
  term: string;
  definition: string;
  data: any;
  isMastered?: boolean;
  stackId?: string;
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
            <div className="w-3 h-3 bg-foreground rounded-full animate-dot-bounce [animation-delay:-0.3s]"></div>
            <div className="w-3 h-3 bg-foreground rounded-full animate-dot-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-3 bg-foreground rounded-full animate-dot-bounce"></div>
        </div>
        <style jsx>{`
      @keyframes dot-bounce {
        0%, 80%, 100% {
          transform: scale(0);
        }
        40% {
          transform: scale(1.0);
        }
      }
      .animate-dot-bounce {
        animation: dot-bounce 1.4s infinite ease-in-out both;
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
                <div className="absolute -inset-4 bg-primary/10 blur-xl rounded-[3rem]" />
                <div className="relative bg-card shadow-lg rounded-[3rem] w-72 px-8 py-12 flex flex-col justify-center items-center">
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

function DiffDisplay({ userInput, correctAnswer }: { userInput: string, correctAnswer: string }) {
    const userWords = userInput.trim().toLowerCase().split(/\s+/);
    const correctWords = correctAnswer.trim().toLowerCase().split(/\s+/);

    const result = [];
    let userIndex = 0;

    for (const correctWord of correctWords) {
        if (userWords[userIndex] === correctWord) {
            result.push({ word: userWords[userIndex], type: 'correct' });
            userIndex++;
        } else if (userWords.includes(correctWord)) {
            while (userWords[userIndex] !== correctWord) {
                result.push({ word: userWords[userIndex], type: 'incorrect' });
                userIndex++;
            }
            result.push({ word: userWords[userIndex], type: 'correct' });
            userIndex++;
        } else {
            result.push({ word: '   ', type: 'missing' });
        }
    }

    while (userIndex < userWords.length) {
        result.push({ word: userWords[userIndex], type: 'incorrect' });
        userIndex++;
    }

    return (
        <div className="mt-4 w-full max-w-md mx-auto bg-card/50 p-4 rounded-2xl">
            <p className="text-sm font-bold text-muted-foreground mb-2">Deine Eingabe</p>
            <p className="text-lg font-mono p-2 bg-black/5 dark:bg-white/5 rounded-md">
                {result.map((item, index) => (
                    <span key={index}>
                        <span
                            className={cn({
                                'text-green-600': item.type === 'correct',
                                'text-destructive': item.type === 'incorrect' || item.type === 'missing',
                                'px-2': item.type === 'missing',
                            })}
                        >
                            {item.word}
                        </span>{' '}
                    </span>
                ))}
            </p>
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
  const [inputMode, setInputMode] = useState(false);

  const [userInput, setUserInput] = useState('');
  const [answerStatus, setAnswerStatus] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');

  const [previousCardState, setPreviousCardState] = useState<{
    queue: LearnItem[],
    currentIndex: number,
    correctlyAnswered: LearnItem[],
    incorrectlyAnswered: LearnItem[],
  } | null>(null);

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subjectLanguage, setSubjectLanguage] = useState('en-US');

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
        const subSnap = await getDoc(doc(firestore, 'users', user.uid, 'subjects', storedSubjectId));
        if (subSnap.exists()) {
          const subName = (subSnap.data().name || '').toLowerCase();
          if (subName.includes('französisch')) setSubjectLanguage('fr-FR');
          else if (subName.includes('spanisch')) setSubjectLanguage('es-ES');
          else if (subName.includes('deutsch')) setSubjectLanguage('de-DE');
          else if (subName.includes('italien')) setSubjectLanguage('it-IT');
          else if (subName.includes('portugies')) setSubjectLanguage('pt-PT');
          else setSubjectLanguage('en-US');
        }

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

  const goToNextCard = (wasCorrect: boolean) => {
    if (isFinished) return;

    setPreviousCardState({
      queue,
      currentIndex,
      correctlyAnswered,
      incorrectlyAnswered,
    });

    const currentItem = queue[currentIndex];
    let newQueue = [...queue];

    if (wasCorrect) {
        triggerHapticFeedback('light');
        newQueue.splice(currentIndex, 1);
        if (!correctlyAnswered.some(item => item.id === currentItem.id) && !incorrectlyAnswered.some(item => item.id === currentItem.id)) {
            setCorrectlyAnswered(prev => [...prev, currentItem]);
            import('@/lib/notifications').then(({ cancelTodaysReminder }) => cancelTodaysReminder()).catch(console.error);
        }
        if (subjectId && currentItem.stackId && !currentItem.isMastered) {
            const docRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', currentItem.stackId, 'vocabulary', currentItem.id);
            updateDoc(docRef, { isMastered: true }).catch(console.error);
        }
    } else {
        triggerHapticFeedback('heavy');
        if (!incorrectlyAnswered.some(item => item.id === currentItem.id)) {
            setIncorrectlyAnswered(prev => [...prev, currentItem]);
        }
        const itemToMove = newQueue.splice(currentIndex, 1)[0];
        newQueue.push(itemToMove);
    }

    setIsFlipped(false);
    setUserInput('');
    setAnswerStatus('unanswered');

    if (newQueue.length === 0) {
        setIsFinished(true);
    } else {
        const newIndex = currentIndex >= newQueue.length ? 0 : currentIndex;
        setQueue(newQueue);
        setCurrentIndex(newIndex);
        if(inputMode) inputRef.current?.focus();
    }
  };

  const handleCheckAnswer = () => {
    if (!currentItem) return;
    
    setIsFlipped(true);
    triggerHapticFeedback('light');

    const expectedAnswer = settings?.vocabQueryDirection ? currentItem.term : currentItem.definition;
    const isCorrect = userInput.trim().toLowerCase() === expectedAnswer.trim().toLowerCase();
    
    const status = isCorrect ? 'correct' : 'incorrect';
    setAnswerStatus(status);
  };

  const handleIKnewIt = () => {
    setAnswerStatus('correct');
  };

  const handleToggleInputMode = () => {
    if (isFlipped) {
        setIsFlipped(false);
        setAnswerStatus('unanswered');
    }
    setInputMode(prev => !prev);
  };

  const handleGoToPreviousCard = () => {
    if (!previousCardState) return;

    setQueue(previousCardState.queue);
    setCurrentIndex(previousCardState.currentIndex);
    setCorrectlyAnswered(previousCardState.correctlyAnswered);
    setIncorrectlyAnswered(previousCardState.incorrectlyAnswered);

    setIsFlipped(false);
    setAnswerStatus('unanswered');
    setUserInput('');
    
    setPreviousCardState(null);
  };

  const handleRestart = () => {
    setIsFinished(false);
    setQueue(shuffleArray(deck));
    setCurrentIndex(0);
    setCorrectlyAnswered([]);
    setIncorrectlyAnswered([]);
    setPreviousCardState(null);
  };

  const handleBackToSubject = () => {
    if (subjectId) {
        router.push(`/dashboard/subjects/${subjectId}`);
    } else {
        router.push('/dashboard');
    }
  };

  const progress = deck.length > 0 ? (correctlyAnswered.length / deck.length) * 100 : 0;
  
  const currentItem = !isLoading && !isFinished ? queue[currentIndex] : null;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (deck.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-8 text-center px-6">
        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4"><X className="h-12 w-12 text-muted-foreground/30" /></div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black font-headline">Keine Karten</h2>
          <p className="text-xl text-muted-foreground max-w-sm font-medium">Wähle zuerst einige Vokabeln in einem Fach aus, um sie zu lernen.</p>
        </div>
        <Button onClick={() => router.push('/dashboard')} className="h-16 px-12 rounded-full text-xl font-bold">Zum Dashboard</Button>
      </div>
    );
  }

  if (isFinished) {
    return <FinishedScreen stats={{ correct: correctlyAnswered.length, incorrect: incorrectlyAnswered.length }} onRestart={handleRestart} onBackToSubject={handleBackToSubject} />;
  }

  const frontIsForeign = !settings?.vocabQueryDirection;
  const frontContent = frontIsForeign ? currentItem?.term : currentItem?.definition;
  const backContent = frontIsForeign ? currentItem?.definition : currentItem?.term;

  return (
    <div className="max-w-4xl mx-auto h-screen flex flex-col justify-between py-6 px-4 overflow-hidden">
        <div className="w-full relative py-4">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 text-sm font-bold text-muted-foreground">
                {correctlyAnswered.length} / {deck.length}
            </div>
            <div className="flex items-center gap-4 w-full">
                 <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-14 w-14 rounded-full"><ChevronLeft className="h-8 w-8" /></Button></AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[3rem] p-10">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-3xl font-black font-headline">Session beenden?</AlertDialogTitle>
                            <AlertDialogDescription className="text-lg mt-4 font-medium">
                                Wenn du die aktuelle Lern-Session beendest, geht dein bisheriger Fortschritt für diese Runde verloren und du musst eine neue starten.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-4 mt-8">
                            <AlertDialogCancel className="h-14 rounded-full font-bold border-2">Bleiben</AlertDialogCancel>
                            <AlertDialogAction className="h-14 rounded-full font-bold bg-destructive hover:bg-destructive/90" onClick={handleBackToSubject}>Beenden</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Progress value={progress} className="h-3 w-full"/>
                <Button variant={inputMode ? "secondary" : "ghost"} size="icon" className="h-14 w-14 rounded-full flex-shrink-0" onClick={handleToggleInputMode}>
                    <Pencil className="h-6 w-6" />
                </Button>
            </div>
        </div>

        <div className="flex-1 flex justify-center items-center w-full max-w-5xl mx-auto gap-4 px-4" style={{ perspective: '2000px' }}>
            {/* DESKTOP: Back button */}
            <div className="hidden md:flex flex-1 justify-end">
                {previousCardState && (
                    <Button onClick={handleGoToPreviousCard} variant="ghost" size="icon" className="h-20 w-20 rounded-full bg-secondary">
                        <ChevronLeft className="h-10 w-10" />
                    </Button>
                )}
            </div>

            {/* CARD */}
            <AnimatePresence>
            {currentItem && (
                <motion.div
                key={currentItem.id}
                className="w-full max-w-2xl"
                initial={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                >
                <div className="relative w-full aspect-[4/2.5] max-h-[60vh]" style={{ transformStyle: 'preserve-3d' }}>
                    <motion.div
                    className="w-full h-full relative"
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={{ rotateX: isFlipped ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 250, damping: 30 }}
                    >
                    {/* FRONT */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 md:p-12 bg-card rounded-[3rem] shadow-2xl shadow-primary/10 border-none overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
                        {/* MOBILE: Back button */}
                        <div className="md:hidden">
                            {previousCardState && (
                                <Button onClick={handleGoToPreviousCard} variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 left-4 h-14 w-14 rounded-full bg-secondary/50 hover:bg-secondary">
                                    <ChevronLeft className="h-8 w-8" />
                                </Button>
                            )}
                        </div>

                        <div className="absolute top-8 right-8 flex gap-3">
                        { !isFlipped && frontIsForeign && (settings?.ttsEnabled ?? true) && <SpeakerButton text={frontContent} languageHint={subjectLanguage} ttsEnabled={settings?.ttsEnabled ?? true} autoplayEnabled={settings?.ttsAutoplay ?? false} autoplay={!isFlipped} className="h-14 w-14 rounded-full bg-secondary hover:bg-secondary/80 border-none transition-all" /> }
                        {currentItem.data.notes && <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-secondary hover:bg-secondary/80 transition-all"><Lightbulb className="h-6 w-6" /></Button></PopoverTrigger><PopoverContent className="rounded-full p-6 shadow-2xl border-none max-w-xs"><p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Notiz / Hilfe</p><p className="text-lg font-medium leading-relaxed">{currentItem.data.notes}</p></PopoverContent></Popover>}
                        </div>
                        <div className="text-center space-y-4 px-12">
                            <h3 className={cn("font-headline font-black tracking-tight leading-[1.1]", frontContent.length <= 10 ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl")}>{frontContent}</h3>
                            {currentItem.data.phonetic && frontIsForeign && <div className="inline-block px-6 py-2 bg-secondary/80 rounded-full"><p className={cn("text-lg font-medium text-muted-foreground/80 font-mono tracking-wider italic", answerStatus === 'correct' ? 'text-green-600' : '')}>{currentItem.data.phonetic}</p></div>}
                        </div>
                    </div>

                    {/* BACK */}
                    <div className={cn("absolute inset-0 flex flex-col items-center justify-center p-8 md:p-12 bg-card rounded-[3rem] shadow-2xl shadow-primary/10 border-none overflow-hidden", {
                        'bg-green-100 dark:bg-green-900/20': inputMode && answerStatus === 'correct',
                        'bg-red-100 dark:bg-red-900/20': inputMode && answerStatus === 'incorrect'
                    })} style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}>
                        {/* MOBILE: Back button */}
                        <div className="md:hidden">
                            {previousCardState && (
                                <Button onClick={handleGoToPreviousCard} variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 left-4 h-14 w-14 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20">
                                    <ChevronLeft className="h-8 w-8" />
                                </Button>
                            )}
                        </div>

                        <div className="absolute top-8 right-8 flex gap-3">
                            {isFlipped && !frontIsForeign && (settings?.ttsEnabled ?? true) && (
                                <SpeakerButton
                                    text={backContent}
                                    languageHint={subjectLanguage}
                                    ttsEnabled={settings?.ttsEnabled ?? true}
                                    autoplayEnabled={settings?.ttsAutoplay ?? false}
                                    autoplay={isFlipped && !frontIsForeign}
                                    className="h-14 w-14 rounded-full bg-secondary hover:bg-secondary/80 border-none transition-all"
                                />
                            )}
                        </div>
                        <div className="text-center space-y-6 px-12">
                        <h3 className={cn("font-headline font-black tracking-tight leading-[1.1]", backContent.length <= 10 ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl")}>{backContent}</h3>
                        {currentItem.data.relatedWord && <div className="inline-flex items-center gap-3 px-8 py-3 rounded-full bg-secondary/80"><span className="text-xs font-black uppercase tracking-[0.2em] opacity-60">{currentItem.data.relatedWord.language}:</span><span className="text-xl font-bold">{currentItem.data.relatedWord.word}</span></div>}
                        </div>
                        {isFlipped && inputMode && answerStatus === 'incorrect' && (
                            <DiffDisplay userInput={userInput} correctAnswer={backContent} />
                        )}
                    </div>
                    </motion.div>
                </div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* DESKTOP: Placeholder for centering */}
            <div className="hidden md:flex flex-1 justify-start">
                {previousCardState && <div className="h-20 w-20"></div>}
            </div>
        </div>

      <div className="max-w-2xl mx-auto w-full pt-4">
        <div className="w-full min-h-[112px]">
            {isFlipped ? (
                inputMode ? (
                    answerStatus === 'correct' ? (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Button
                                className="w-full h-24 text-3xl font-black rounded-full bg-primary shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                                onClick={() => goToNextCard(true)}
                            >
                                Weiter <ChevronRight className="ml-4 h-8 w-8" />
                            </Button>
                        </div>
                    ) : ( // answerStatus === 'incorrect'
                        <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Button
                                variant="outline"
                                className="h-24 rounded-full border-4 text-xl font-black flex-[1] hover:bg-primary/5 hover:border-primary hover:text-primary active:scale-95 transition-all"
                                onClick={handleIKnewIt}
                            >
                                Wusste ich doch
                            </Button>
                            <Button
                                className="h-24 rounded-full bg-primary shadow-2xl shadow-primary/30 text-2xl font-black flex-[2] active:scale-95 transition-all"
                                onClick={() => goToNextCard(false)}
                            >
                                Weiter <ChevronRight className="ml-4 h-8 w-8" />
                            </Button>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex gap-6">
                            <Button variant="outline" className="h-24 flex-1 rounded-full border-4 text-2xl font-black hover:bg-destructive/5 hover:border-destructive hover:text-destructive active:scale-95 transition-all" onClick={() => goToNextCard(false)}><X className="mr-4 h-8 w-8" />Nicht gewusst</Button>
                            <Button className="h-24 flex-1 rounded-full bg-primary shadow-2xl shadow-primary/30 text-2xl font-black active:scale-95 transition-all" onClick={() => goToNextCard(true)}><Check className="mr-4 h-8 w-8" />Gewusst</Button>
                        </div>
                    </div>
                )
            ) : inputMode ? (
               <form onSubmit={(e) => { e.preventDefault(); handleCheckAnswer(); }} className="animate-in fade-in duration-300">
                    <div className="flex items-center gap-4">
                        <Input
                            ref={inputRef}
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Antwort eingeben..."
                            className="flex-1 h-24 px-8 text-center text-2xl font-bold rounded-full bg-card shadow-lg border-2 focus:shadow-primary/20 transition-all"
                            autoFocus
                        />
                        <Button type="submit" size="icon" className="h-24 w-24 flex-shrink-0 rounded-full bg-primary shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">
                            <ChevronRight className="h-10 w-10" />
                        </Button>
                    </div>
                </form>
            ) : (
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                <Button className="w-full h-24 text-3xl font-black rounded-full bg-primary shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all" onClick={() => setIsFlipped(true)}>Umdrehen</Button>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
