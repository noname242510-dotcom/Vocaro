"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import {
  X,
  Check,
  Lightbulb,
  ChevronLeft,
  Zap,
  Pencil,
  ArrowRight
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
import { useSettings } from '@/contexts/settings-context';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// --- Types ---
type LearnItem = {
  id: string;
  type: 'vocab' | 'verb';
  front: string; // The foreign/target word
  back: string;  // The translation/definition
  data: any;
  isMastered?: boolean;
  stackId?: string;
  subjectLanguage?: string;
};

// --- Utility: Shuffle ---
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// --- Utility: Answer Feedback (Typing Mode) ---
type AnswerStatus = 'unanswered' | 'correct' | 'incorrect' | 'accepted';

const AnswerFeedback = ({ userInput, correctAnswer, status }: { userInput: string, correctAnswer: string, status: AnswerStatus }) => {
  if (status === 'incorrect') {
    const areWordsEqual = (a: string, b: string) => {
      const norm = (s: string) => s.replace(/^\(.*\)$/, '$1').toLowerCase();
      return norm(a) === norm(b);
    };

    const lcs = (a: string[], b: string[]) => {
      const dp = Array(a.length + 1).fill(0).map(() => Array(b.length + 1).fill(0));
      for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++)
          dp[i][j] = areWordsEqual(a[i - 1], b[j - 1]) ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

      let i = a.length, j = b.length;
      const diff: { type: 'correct' | 'extra' | 'missing', value: string }[] = [];
      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && areWordsEqual(a[i - 1], b[j - 1])) { diff.unshift({ type: 'correct', value: a[i - 1] }); i--; j--; }
        else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) { diff.unshift({ type: 'missing', value: b[j - 1] }); j--; }
        else { diff.unshift({ type: 'extra', value: a[i - 1] }); i--; }
      }
      return diff;
    };

    const userWords = userInput.trim().split(/\s+/).filter(Boolean);
    const correctWords = correctAnswer.trim().split(/\s+/).filter(Boolean);
    const diff = lcs(userWords, correctWords);

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-1 font-mono text-lg">
          {diff.map((part, i) => (
            <span key={i} className={cn(
              part.type === 'extra' && "line-through opacity-50",
              part.type === 'missing' && "border-b-2 border-foreground px-2 opacity-60",
            )}>
              {part.value}
            </span>
          ))}
        </div>
        <p className="text-3xl font-bold font-headline">{correctAnswer}</p>
      </div>
    );
  }
  return <p className="text-3xl font-bold font-headline">{correctAnswer}</p>;
};

// --- Session Finished Screen ---
function FinishedScreen({ stats, onRestart }: { stats: { correct: number; incorrect: number; maxStreak: number }, onRestart: () => void }) {
  const total = stats.correct + stats.incorrect;
  const pct = total > 0 ? Math.round((stats.correct / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center space-y-12 px-6 animate-in fade-in zoom-in duration-1000">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
        <div className="relative bg-white shadow-2xl shadow-primary/10 rounded-[4rem] p-16 border-none">
          <p className="font-creative text-[10rem] font-black leading-none text-primary mb-4">{pct}<span className="text-4xl align-top mt-8 inline-block">%</span></p>
          <p className="text-2xl text-muted-foreground font-bold font-creative uppercase tracking-[0.3em]">Meisterhaft!</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-12 max-w-2xl w-full">
        <div className="space-y-2">
          <p className="text-5xl font-black font-creative text-primary">{stats.correct}</p>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Gewusst</p>
        </div>
        <div className="space-y-2">
          <p className="text-5xl font-black font-creative text-destructive">{stats.incorrect}</p>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Wiederholen</p>
        </div>
        <div className="space-y-2">
          <p className="text-5xl font-black font-creative text-foreground">{stats.maxStreak}</p>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Max Streak</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl">
        <Button className="h-20 flex-1 text-xl font-black rounded-[2rem] bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all" onClick={onRestart}>
          Nochmal lernen
        </Button>
        <Button variant="outline" className="h-20 flex-1 text-xl font-black rounded-[2rem] border-4 shadow-lg hover:scale-[1.02] transition-all" onClick={() => window.location.href = '/dashboard'}>
          Dashboard
        </Button>
      </div>
    </div>
  );
}


// --- Main Component ---
export default function LearnPage() {
  const { firestore, user } = useFirebase();
  const { settings } = useSettings();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { triggerHapticFeedback } = useHapticFeedback();

  // State
  const [items, setItems] = useState<LearnItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, streak: 0, maxStreak: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [isTypedMode, setIsTypedMode] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');
  const [history, setHistory] = useState<number[]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subjectLanguage, setSubjectLanguage] = useState('en-US');

  // Guard: warn on page leave during active session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isFinished && items.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFinished, items.length]);

  // Initialization
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
        // Get subject language
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
              // Front = foreign word (or definition if direction reversed), Back = translation
              const front = settings?.vocabQueryDirection ? data.definition : data.term;
              const back = settings?.vocabQueryDirection ? data.term : data.definition;
              allItems.push({
                id: d.id,
                type: 'vocab',
                front,
                back,
                data,
                isMastered: data.isMastered,
                stackId: stackDoc.id,
              });
            }
          });
        }

        setItems(shuffleArray(allItems));

        // Create learning session record
        const sessRef = await addDoc(collection(firestore, 'users', user.uid, 'learningSessions'), {
          userId: user.uid,
          startTime: serverTimestamp(),
          endTime: null,
        });
        setSessionId(sessRef.id);

      } catch (e) {
        console.error("Learn page init error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [firestore, user, settings]);

  // Focus input in typing mode
  useEffect(() => {
    if (isTypedMode && !isFlipped && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTypedMode, currentIndex]);

  // --- Handlers ---
  const handleAnswer = async (correct: boolean) => {
    const currentItem = items[currentIndex];
    triggerHapticFeedback(correct ? 'light' : 'heavy');

    if (correct) {
      setSessionStats(prev => {
        const newStreak = prev.streak + 1;
        // CSS flash effect on progress bar wrapper instead of confetti
        if (newStreak > 0 && newStreak % 5 === 0) {
          const progressEl = document.getElementById('streak-progress');
          if (progressEl) {
            progressEl.classList.add('flash-streak');
            setTimeout(() => progressEl.classList.remove('flash-streak'), 1000);
          }
        }
        return {
          ...prev,
          correct: prev.correct + 1,
          streak: newStreak,
          maxStreak: Math.max(prev.maxStreak, newStreak),
        };
      });

      // Mark as mastered in Firestore
      if (firestore && user && subjectId && currentItem.stackId && !currentItem.isMastered) {
        const docRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', currentItem.stackId, 'vocabulary', currentItem.id);
        updateDoc(docRef, { isMastered: true }).catch(console.error);
      }
    } else {
      setSessionStats(prev => ({ ...prev, incorrect: prev.incorrect + 1, streak: 0 }));
    }

    if (currentIndex < items.length - 1) {
      setHistory(prev => [...prev, currentIndex]);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
        setAnswerStatus('unanswered');
        setUserInput('');
      }, 50);
    } else {
      setIsFinished(true);
      if (sessionId && firestore && user) {
        updateDoc(doc(firestore, 'users', user.uid, 'learningSessions', sessionId), {
          endTime: serverTimestamp(),
          stats: sessionStats,
        });
      }
      confetti({
        particleCount: 150,
        spread: 100,
        colors: ['#000000', '#ffffff', '#888888', '#555555'],
      });
    }
  };

  const handleGoBack = () => {
    if (history.length > 0) {
      const prevIndex = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setTimeout(() => {
        setCurrentIndex(prevIndex);
        setIsFlipped(false);
        setAnswerStatus('unanswered');
        setUserInput('');
      }, 50);
    }
  };

  const handleTypingSubmit = () => {
    if (answerStatus !== 'unanswered') {
      handleAnswer(answerStatus === 'correct' || answerStatus === 'accepted');
      return;
    }

    const currentItem = items[currentIndex];
    const normalized = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const isCorrect = normalized(userInput) === normalized(currentItem.back);
    const isAccepted = !isCorrect && normalized(userInput).length > 0 &&
      currentItem.back.toLowerCase().split(/[,;\/]/).map(s => s.trim()).some(variant =>
        normalized(userInput) === normalized(variant)
      );

    setAnswerStatus(isCorrect ? 'correct' : isAccepted ? 'accepted' : 'incorrect');
    setIsFlipped(true);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setHistory([]);
    setSessionStats({ correct: 0, incorrect: 0, streak: 0, maxStreak: 0 });
    setAnswerStatus('unanswered');
    setUserInput('');
    setItems(prev => shuffleArray([...prev]));
  };

  const currentItem = items[currentIndex];
  const progress = items.length > 0 ? (currentIndex / items.length) * 100 : 0;

  // --- Loading / Empty State ---
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-4 h-4 rounded-full bg-primary animate-bounce shadow-xl shadow-primary/20"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-xs font-black tracking-[0.3em] uppercase text-muted-foreground opacity-60">
            Fokus wird geladen…
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] space-y-8 text-center px-6">
        <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="h-12 w-12 text-muted-foreground/30" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black font-creative">Keine Karten</h2>
          <p className="text-xl text-muted-foreground max-w-sm font-medium">Wähle zuerst einige Vokabeln in einem Fach aus, um sie zu lernen.</p>
        </div>
        <Button onClick={() => router.push('/dashboard')} className="h-16 px-12 rounded-[2rem] text-xl font-bold">
          Zum Dashboard
        </Button>
      </div>
    );
  }

  if (isFinished) {
    return <FinishedScreen stats={sessionStats} onRestart={handleRestart} />;
  }

  // The foreign word is always `currentItem.front`
  const ttsLanguage = settings?.vocabQueryDirection ? 'de-DE' : subjectLanguage;

  return (
    <div className="max-w-4xl mx-auto min-h-[90vh] flex flex-col justify-between py-12 px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-[1.5rem] bg-white shadow-xl shadow-primary/5 hover:bg-white hover:scale-105 transition-all">
              <ChevronLeft className="h-8 w-8" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-[2.5rem] p-10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-3xl font-black font-creative">Lernen unterbrechen?</AlertDialogTitle>
              <AlertDialogDescription className="text-lg mt-4 font-medium">
                Dein Fokus geht verloren. Du kannst aber später genau hier weitermachen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-4 mt-8">
              <AlertDialogCancel className="h-14 rounded-[1.2rem] font-bold border-2">Bleiben</AlertDialogCancel>
              <AlertDialogAction className="h-14 rounded-[1.2rem] font-bold bg-destructive hover:bg-destructive/90" onClick={() => router.push('/dashboard')}>Unterbrechen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex gap-4">
          {/* Typing mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-14 w-14 rounded-[1.5rem] bg-white shadow-xl shadow-primary/5 hover:bg-white hover:scale-105 transition-all",
              isTypedMode && "text-primary border-2 border-primary/20"
            )}
            onClick={() => { setIsTypedMode(!isTypedMode); setIsFlipped(false); setAnswerStatus('unanswered'); setUserInput(''); }}
          >
            <Pencil className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-3 bg-white px-8 rounded-[1.5rem] font-bold text-lg shadow-xl shadow-primary/5 border border-primary/5">
            <Zap className="h-6 w-6 text-primary fill-primary" />
            <span className="font-creative text-2xl font-black">{sessionStats.streak}</span>
          </div>
        </div>
      </div>

      {/* Main Study Area */}
      <div className="flex-1 flex flex-col justify-center gap-12 max-w-2xl mx-auto w-full">
        {/* Progress Strip */}
        <div className="space-y-4" id="streak-progress">
          <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <p className="text-center font-black text-xs uppercase tracking-[0.4em] text-muted-foreground opacity-50">
            {currentIndex + 1} &middot; {items.length}
          </p>
        </div>

        {/* The Card */}
        <div className="relative w-full group" style={{ perspective: '2000px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 40, rotateX: 10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -40, rotateX: -10 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="w-full h-full"
            >
              <div className="relative w-full aspect-[4/3] md:aspect-[3/2]" style={{ transformStyle: 'preserve-3d' }}>
                <motion.div
                  className="w-full h-full relative"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 25 }}
                >
                  {/* ===== FRONT SIDE ===== */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-white rounded-[3rem] shadow-2xl shadow-primary/10 border-none overflow-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="absolute top-8 right-8 flex gap-3">
                      <SpeakerButton
                        text={currentItem.front}
                        languageHint={ttsLanguage}
                        ttsEnabled={settings?.ttsEnabled ?? true}
                        autoplayEnabled={settings?.ttsAutoplay ?? false}
                        autoplay={!isFlipped}
                        className="h-14 w-14 rounded-2xl bg-secondary/30 hover:bg-secondary/50 text-foreground border-none transition-all"
                      />
                      {currentItem.data.notes && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-all">
                              <Lightbulb className="h-6 w-6" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="rounded-3xl p-6 shadow-2xl border-none max-w-xs">
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Notiz / Hilfe</p>
                            <p className="text-lg font-medium leading-relaxed">{currentItem.data.notes}</p>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    <div className="text-center space-y-6">
                      <h3 className="font-creative text-5xl md:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
                        {currentItem.front}
                      </h3>
                      {currentItem.data.phonetic && (
                        <div className="inline-block px-6 py-2 bg-secondary/40 rounded-full">
                          <p className="text-lg font-medium text-muted-foreground/80 font-mono tracking-wider italic">
                            {currentItem.data.phonetic}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ===== BACK SIDE ===== */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-primary text-white rounded-[3rem] shadow-2xl shadow-primary/20 border-none overflow-hidden"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <div className="text-center space-y-8">
                      <h3 className="font-creative text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
                        {currentItem.back}
                      </h3>
                      {currentItem.data.relatedWord && (
                        <div className="inline-flex items-center gap-3 px-8 py-3 rounded-full bg-white/20 backdrop-blur-md">
                          <span className="text-xs font-black uppercase tracking-[0.2em] opacity-60">{currentItem.data.relatedWord.language}:</span>
                          <span className="text-xl font-bold">{currentItem.data.relatedWord.word}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ===== ACTION AREA ===== */}
      <div className="max-w-2xl mx-auto w-full pt-12">
        {isTypedMode ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {answerStatus === 'unanswered' ? (
              <div className="flex gap-4">
                <Input
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTypingSubmit()}
                  placeholder="Übersetzung eingeben..."
                  className="h-20 text-2xl font-bold rounded-[2rem] px-10 flex-1 border-4 focus:border-primary shadow-xl shadow-primary/5 transition-all"
                  autoComplete="off"
                />
                <Button
                  className="h-20 w-20 rounded-[2rem] shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                  onClick={handleTypingSubmit}
                >
                  <ArrowRight className="h-8 w-8" />
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] p-10 text-center shadow-xl shadow-primary/5 border-4 border-transparent">
                  <p className={cn(
                    "font-black text-xs uppercase tracking-[0.4em] mb-6",
                    (answerStatus === 'correct' || answerStatus === 'accepted') ? "text-primary" : "text-destructive"
                  )}>
                    {answerStatus === 'correct' ? '✓ Richtig!' : answerStatus === 'accepted' ? '✓ Akzeptiert' : '✗ Falsch'}
                  </p>
                  <AnswerFeedback userInput={userInput} correctAnswer={currentItem.back} status={answerStatus} />
                </div>
                <Button
                  className="w-full h-20 text-2xl font-black rounded-[2rem] shadow-xl shadow-primary/20"
                  onClick={() => handleAnswer(answerStatus === 'correct' || answerStatus === 'accepted')}
                >
                  Nächste Karte
                  <ArrowRight className="ml-4 h-8 w-8" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full">
            {!isFlipped ? (
              <div className="flex flex-col gap-4">
                <Button
                  className="w-full h-24 text-3xl font-black rounded-[2.5rem] bg-primary shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                  onClick={() => setIsFlipped(true)}
                >
                  Umdrehen
                </Button>
                {(currentIndex > 0 || history.length > 0) && (
                  <Button
                    variant="ghost"
                    className="h-12 rounded-full font-bold text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
                    onClick={handleGoBack}
                  >
                    <ChevronLeft className="mr-2 h-5 w-5" />
                    Karte zurück
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Button
                  variant="outline"
                  className="h-24 flex-1 rounded-[2.5rem] border-4 text-2xl font-black hover:bg-destructive/5 hover:border-destructive hover:text-destructive active:scale-95 transition-all"
                  onClick={() => handleAnswer(false)}
                >
                  <X className="mr-4 h-8 w-8" />
                  Nicht gewusst
                </Button>
                <Button
                  className="h-24 flex-1 rounded-[2.5rem] bg-primary shadow-2xl shadow-primary/30 text-2xl font-black active:scale-95 transition-all"
                  onClick={() => handleAnswer(true)}
                >
                  <Check className="mr-4 h-8 w-8" />
                  Gewusst
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .flash-streak {
          animation: streakPulse 1s ease-out;
        }
        @keyframes streakPulse {
          0% { filter: brightness(1) scale(1); }
          50% { filter: brightness(1.5) scale(1.02); }
          100% { filter: brightness(1) scale(1); }
        }
      `}</style>
    </div>
  );
}
