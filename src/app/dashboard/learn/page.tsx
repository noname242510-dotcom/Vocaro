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

  const handleCheckAnswer = () => {
    if (answerStatus !== 'unanswered') {
      handleAnswer(answerStatus === 'correct' || answerStatus === 'accepted' || answerStatus === 'omitted-correct');
      return;
    }

    const currentItem = items[currentIndex];
    const normalize = (s: string) => s.trim().toLowerCase().replace(/[()]/g, '');

    if (normalize(userInput) === normalize(currentItem.back)) {
      setAnswerStatus('correct');
      setIsFlipped(true);
    } else {
      setAnswerStatus('incorrect');
      setIsFlipped(true);
    }
  };

  const progress = (currentIndex / items.length) * 100;

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>;

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
      <h2 className="text-2xl font-bold font-headline">Keine Vokabeln gefunden</h2>
      <Button asChild className="rounded-2xl"><Link href="/dashboard">Zurück</Link></Button>
    </div>
  );

  if (isFinished) return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-8">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card p-10 rounded-[3.5rem] text-center shadow-2xl space-y-8 border-none"
      >
        <div className="inline-flex p-6 bg-primary/10 rounded-[2.5rem]">
          <Trophy className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-4xl font-bold font-headline">Lektion beendet!</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-secondary/30 p-6 rounded-[2rem]">
            <p className="text-sm font-bold text-muted-foreground uppercase mb-1">Richtig</p>
            <p className="text-3xl font-black text-emerald-500">{sessionStats.correct}</p>
          </div>
          <div className="bg-secondary/30 p-6 rounded-[2rem]">
            <p className="text-sm font-bold text-muted-foreground uppercase mb-1">Streak</p>
            <p className="text-3xl font-black text-orange-500">{sessionStats.maxStreak}</p>
          </div>
        </div>

        <Button size="lg" className="w-full h-14 rounded-2xl text-lg font-bold" asChild>
          <Link href="/dashboard">Zur Übersicht</Link>
        </Button>
      </motion.div>
    </div>
  );

  const currentItem = items[currentIndex];

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
                <h3 className="text-4xl md:text-5xl font-bold font-headline leading-tight">
                  {currentItem.front}
                </h3>
                {!isTypedMode && (
                  <div className="absolute bottom-8 text-primary/40 font-bold flex items-center gap-2 animate-bounce">
                    <span className="text-xs uppercase tracking-widest">Umdrehen</span>
                    <RotateCcw className="h-4 w-4" />
                  </div>
                )}
              </Card>

              {/* Back */}
              <Card
                className="absolute inset-0 backface-hidden rounded-[3rem] shadow-2xl border-none flex flex-col items-center justify-center p-8 bg-primary text-primary-foreground text-center"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <span className="absolute top-8 left-8 text-[0.65rem] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1.5 rounded-full">
                  Antwort
                </span>
                {isTypedMode ? (
                  <AnswerFeedback userInput={userInput} correctAnswer={currentItem.back} status={answerStatus} />
                ) : (
                  <h3 className="text-4xl font-bold font-headline leading-tight">{currentItem.back}</h3>
                )}
              </Card>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Inputs / Actions */}
      <div className="max-w-md mx-auto w-full">
        {isTypedMode && answerStatus === 'unanswered' ? (
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              autoFocus
              placeholder="Antwort tippen..."
              className="h-14 rounded-2xl text-lg px-6 border-none bg-secondary/30 focus-visible:ring-primary"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCheckAnswer()}
            />
            <Button size="icon" className="h-14 w-14 rounded-2xl shrink-0" onClick={handleCheckAnswer}>
              <ArrowRight className="h-6 w-6" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center gap-6">
            <Button
              variant="outline"
              className="h-20 flex-1 rounded-[2rem] border-4 border-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all active:scale-95 text-lg font-bold"
              onClick={() => handleAnswer(false)}
            >
              <X className="mr-2 h-6 w-6" /> Falsch
            </Button>
            <Button
              className="h-20 flex-1 rounded-[2rem] bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 active:scale-95 text-lg font-bold"
              onClick={() => handleAnswer(true)}
            >
              <Check className="mr-2 h-6 w-6" /> Richtig
            </Button>
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
