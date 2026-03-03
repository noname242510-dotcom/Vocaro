"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import {
  X,
  Check,
  RotateCcw,
  Lightbulb,
  ChevronLeft,
  Smile,
  Frown,
  Meh,
  Languages,
  Zap,
  Trophy,
  Pencil,
  Sparkles,
  Info,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase/provider';
import {
  collection,
  getDocs,
  query,
  where,
  documentId,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import type { VocabularyItem, Subject, Verb } from '@/lib/types';
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
import { VocabDialog } from '../subjects/[subjectId]/_components/vocab-dialog';
import { SpeakerButton } from '@/components/speaker-button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useSettings } from '@/contexts/settings-context';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// --- Types ---
type LearnItem = {
  id: string;
  type: 'vocab' | 'verb';
  front: string;
  back: string;
  data: any;
  isMastered?: boolean;
  stackId?: string;
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

// --- Utility: LCS (Longest Common Subsequence) for Feedback ---
type AnswerStatus = 'unanswered' | 'correct' | 'incorrect' | 'accepted' | 'omitted-correct';

const AnswerFeedback = ({ userInput, correctAnswer, status }: { userInput: string, correctAnswer: string, status: AnswerStatus }) => {
  if (status === 'incorrect') {
    const areWordsEqual = (userWordLower: string, correctWordLower: string) => {
      const normalizedCorrect = correctWordLower.replace(/^\((.*)\)$/, '$1').toLowerCase();
      return userWordLower.toLowerCase() === normalizedCorrect;
    };

    const lcs = (a: string[], b: string[]) => {
      const m = a.length;
      const n = b.length;
      const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (areWordsEqual(a[i - 1], b[j - 1])) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          }
        }
      }

      let i = m;
      let j = n;
      const diff: { type: 'correct' | 'extra' | 'missing', value: string }[] = [];

      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && areWordsEqual(a[i - 1], b[j - 1])) {
          diff.unshift({ type: 'correct', value: a[i - 1] });
          i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
          diff.unshift({ type: 'missing', value: b[j - 1] });
          j--;
        } else {
          diff.unshift({ type: 'extra', value: a[i - 1] });
          i--;
        }
      }
      return diff;
    };

    const userWords = userInput.trim().split(/\s+/).filter(w => w);
    const correctWords = correctAnswer.trim().split(/\s+/).filter(w => w);
    const diff = lcs(userWords, correctWords);

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-1 font-mono text-lg">
          {diff.map((part, i) => (
            <span key={i} className={cn(
              part.type === 'extra' && "text-destructive line-through",
              part.type === 'missing' && "border-b-2 border-destructive px-2 opacity-50",
              part.type === 'correct' && "text-foreground"
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
  const [direction, setDirection] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

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

  const [subject, setSubject] = useState<Subject | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

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
        const subSnap = await getDoc(doc(firestore, 'users', user.uid, 'subjects', storedSubjectId));
        if (subSnap.exists()) setSubject({ ...subSnap.data(), id: subSnap.id } as Subject);

        const vocabIds: string[] = JSON.parse(vocabIdsJson);
        const allItems: LearnItem[] = [];

        // Fetch stacks to get vocabulary
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
                front: settings?.vocabQueryDirection ? data.definition : data.term,
                back: settings?.vocabQueryDirection ? data.term : data.definition,
                data,
                isMastered: data.isMastered,
                stackId: stackDoc.id
              });
            }
          });
        }

        setItems(shuffleArray(allItems));

        // Session creation
        const sessRef = await addDoc(collection(firestore, 'users', user.uid, 'learningSessions'), {
          userId: user.uid,
          startTime: serverTimestamp(),
          endTime: null
        });
        setSessionId(sessRef.id);

      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [firestore, user, settings]);

  // Handlers
  const handleAnswer = async (correct: boolean) => {
    const currentItem = items[currentIndex];

    // Update stats
    if (correct) {
      setSessionStats(prev => {
        const newStreak = prev.streak + 1;
        if (newStreak > 0 && newStreak % 5 === 0) {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#10b981', '#3b82f6']
          });
        }
        return {
          ...prev,
          correct: prev.correct + 1,
          streak: newStreak,
          maxStreak: Math.max(prev.maxStreak, newStreak)
        };
      });

      // Update Mastery
      if (firestore && user && subjectId && currentItem.stackId && !currentItem.isMastered) {
        const docRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', currentItem.stackId, 'vocabulary', currentItem.id);
        updateDoc(docRef, { isMastered: true }).catch(console.error);
      }
      triggerHapticFeedback('light');
    } else {
      setSessionStats(prev => ({ ...prev, incorrect: prev.incorrect + 1, streak: 0 }));
      triggerHapticFeedback('heavy');
    }

    if (currentIndex < items.length - 1) {
      setDirection(1);
      setHistory(prev => [...prev, currentIndex]);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
        setAnswerStatus('unanswered');
        setUserInput('');
        setDirection(0);
      }, 50);
    } else {
      setIsFinished(true);
      if (sessionId && firestore && user) {
        updateDoc(doc(firestore, 'users', user.uid, 'learningSessions', sessionId), {
          endTime: serverTimestamp(),
          stats: sessionStats
        });
      }
      confetti({ particleCount: 150, spread: 100 });
    }
  };

  const handleGoBack = () => {
    if (history.length > 0) {
      const prevIndex = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setDirection(-1);
      setTimeout(() => {
        setCurrentIndex(prevIndex);
        setIsFlipped(false);
        setAnswerStatus('unanswered');
        setUserInput('');
        setDirection(0);
      }, 50);
    }
  };

  const currentItem = items[currentIndex];
  const progress = (currentIndex / items.length) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6 md:py-10 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-secondary/20">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-[2.5rem] border-none">
            <AlertDialogHeader>
              <AlertDialogTitle>Lernen abbrechen?</AlertDialogTitle>
              <AlertDialogDescription>Dein aktueller Fortschritt in dieser Sitzung geht verloren.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Bleiben</AlertDialogCancel>
              <AlertDialogAction className="rounded-xl" onClick={() => router.push('/dashboard')}>Beenden</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-2xl font-bold">
            <Zap className="h-4 w-4 fill-current" />
            <span>{sessionStats.streak}</span>
          </div>
          <Button
            variant={isTypedMode ? "default" : "ghost"}
            size="icon"
            className="h-11 w-11 rounded-2xl"
            onClick={() => setIsTypedMode(!isTypedMode)}
          >
            <Pencil className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <Progress value={progress} className="h-3 rounded-full bg-secondary overflow-hidden" />
        <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {currentIndex + 1} / {items.length}
        </p>
      </div>

      {/* Card Stage */}
      <div className="perspective-1000 min-h-[400px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ x: direction * 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -direction * 100, opacity: 0 }}
            className="w-full"
          >
            <div
              className="relative w-full h-[400px] transition-all duration-700 preserve-3d cursor-pointer"
              style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              onClick={() => !isTypedMode && setIsFlipped(!isFlipped)}
            >
              {/* Front */}
              <Card className="absolute inset-0 backface-hidden rounded-[3rem] shadow-2xl border-none flex flex-col items-center justify-center p-8 bg-card text-center">
                <span className="absolute top-8 left-8 text-[0.65rem] font-black uppercase tracking-[0.2em] text-muted-foreground/60 bg-secondary/40 px-3 py-1.5 rounded-full">
                  {currentItem.type === 'vocab' ? 'Vokabel' : 'Verb'}
                </span>

                <div className="absolute top-8 right-8 flex gap-2">
                  {currentItem.data.phonetic && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary/40" onClick={(e) => e.stopPropagation()}>
                          <Info className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="rounded-2xl p-4 w-auto">
                        <p className="font-mono text-sm">{currentItem.data.phonetic}</p>
                      </PopoverContent>
                    </Popover>
                  )}
                  {currentItem.data.notes && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary/40" onClick={(e) => e.stopPropagation()}>
                          <Lightbulb className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="rounded-2xl p-4 max-w-xs">
                        <p className="text-sm">{currentItem.data.notes}</p>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                <h3 className="text-4xl md:text-5xl font-bold font-headline leading-tight">
                  {currentItem.front}
                </h3>
              </Card>

              {/* Back */}
              <Card
                className="absolute inset-0 backface-hidden rounded-[3rem] shadow-2xl border-none flex flex-col items-center justify-center p-8 bg-black text-white text-center"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <div className="absolute top-8 left-8 flex items-center gap-2">
                  <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1.5 rounded-full">
                    Antwort
                  </span>
                  <SpeakerButton
                    text={currentItem.back}
                    languageHint={settings?.vocabQueryDirection ? 'de-DE' : 'en-US'}
                    ttsEnabled={settings?.ttsEnabled ?? true}
                    autoplayEnabled={settings?.ttsAutoplay ?? false}
                    className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white rounded-full border-none"
                  />
                </div>

                {currentItem.data.relatedWord && (
                  <div className="absolute top-8 right-8">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/10 text-white" onClick={(e) => e.stopPropagation()}>
                          <Languages className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="rounded-2xl p-4 w-auto">
                        <p className="text-xs text-muted-foreground uppercase font-bold mb-1">{currentItem.data.relatedWord.language}</p>
                        <p className="font-bold">{currentItem.data.relatedWord.word}</p>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-4xl font-bold font-headline leading-tight">{currentItem.back}</h3>
                  {currentItem.data.phonetic && (
                    <p className="text-xl font-mono opacity-60">{currentItem.data.phonetic}</p>
                  )}
                </div>
              </Card>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Inputs / Actions */}
      <div className="max-w-md mx-auto w-full">
        {!isFlipped ? (
          <Button
            className="w-full h-20 rounded-[2rem] bg-black text-white hover:bg-black/90 text-xl font-black uppercase tracking-widest shadow-2xl"
            onClick={() => setIsFlipped(true)}
          >
            Umdrehen
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center gap-6">
              <Button
                variant="outline"
                className="h-20 flex-1 rounded-[2rem] border-4 border-black text-black hover:bg-black hover:text-white transition-all active:scale-95 text-lg font-bold"
                onClick={() => handleAnswer(false)}
              >
                <X className="mr-2 h-6 w-6" /> Wusste ich nicht
              </Button>
              <Button
                className="h-20 flex-1 rounded-[2rem] bg-black text-white hover:bg-black/80 shadow-2xl active:scale-95 text-lg font-bold"
                onClick={() => handleAnswer(true)}
              >
                <Check className="mr-2 h-6 w-6" /> Wusste ich
              </Button>
            </div>

            {history.length > 0 && (
              <Button
                variant="ghost"
                className="w-full h-12 rounded-2xl text-muted-foreground hover:text-black font-bold"
                onClick={handleGoBack}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Zurück zur vorherigen Karte
              </Button>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
    </div>
  );
}
