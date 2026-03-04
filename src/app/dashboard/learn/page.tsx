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
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 px-4">
      <div className="space-y-2">
        <p className="text-7xl font-black">{pct}%</p>
        <p className="text-xl text-muted-foreground font-medium">korrekte Antworten</p>
      </div>
      <div className="flex gap-6 text-center">
        <div className="space-y-1">
          <p className="text-3xl font-bold">{stats.correct}</p>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gewusst</p>
        </div>
        <div className="w-px bg-border" />
        <div className="space-y-1">
          <p className="text-3xl font-bold">{stats.incorrect}</p>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nicht gewusst</p>
        </div>
        <div className="w-px bg-border" />
        <div className="space-y-1">
          <p className="text-3xl font-bold">{stats.maxStreak}</p>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Maximalstreak</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button className="h-14 text-lg font-bold" onClick={onRestart}>
          Nochmal lernen
        </Button>
        <Button variant="outline" className="h-14 text-lg font-bold" onClick={() => window.location.href = '/dashboard'}>
          Zurück zum Dashboard
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
                className="w-3 h-3 rounded-full bg-foreground animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
            Lade Vokabeln…
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
        <p className="text-2xl font-bold">Keine Vokabeln gefunden</p>
        <p className="text-muted-foreground">Bitte wähle zunächst ein Fach mit Vokabeln zum Lernen.</p>
        <Button onClick={() => router.push('/dashboard')}>Zum Dashboard</Button>
      </div>
    );
  }

  if (isFinished) {
    return <FinishedScreen stats={sessionStats} onRestart={handleRestart} />;
  }

  // The foreign word is always `currentItem.front`
  // The language hint for TTS: if vocabQueryDirection=true (definition first), front=definition (German) else front=foreign
  const ttsLanguage = settings?.vocabQueryDirection ? 'de-DE' : subjectLanguage;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 md:py-10 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl bg-secondary/50">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl border-none" aria-describedby="quit-dialog-description">
            <AlertDialogHeader>
              <AlertDialogTitle>Lernen abbrechen?</AlertDialogTitle>
              <AlertDialogDescription id="quit-dialog-description">
                Dein aktueller Fortschritt in dieser Sitzung geht verloren.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Bleiben</AlertDialogCancel>
              <AlertDialogAction className="rounded-xl" onClick={() => router.push('/dashboard')}>Beenden</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex gap-3">
          {/* Streak counter */}
          <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-xl font-bold text-sm">
            <Zap className="h-4 w-4 fill-current" />
            <span>{sessionStats.streak}</span>
          </div>
          {/* Typing mode toggle */}
          <Button
            variant={isTypedMode ? "default" : "ghost"}
            size="icon"
            className="h-11 w-11 rounded-xl"
            title="Tipp-Modus"
            onClick={() => { setIsTypedMode(!isTypedMode); setIsFlipped(false); setAnswerStatus('unanswered'); setUserInput(''); }}
          >
            <Pencil className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2 relative" id="streak-progress">
        <Progress value={progress} className="h-2 rounded-full bg-secondary transition-all" />
        <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {currentIndex + 1} / {items.length}
        </p>
      </div>

      {/* Card */}
      <div className="relative w-full" style={{ perspective: '1200px' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="w-full"
          >
            <div className="relative w-full" style={{ height: '400px', transformStyle: 'preserve-3d' }}>
              <motion.div
                className="w-full h-full relative"
                style={{ transformStyle: 'preserve-3d' }}
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
              >
                {/* ===== FRONT SIDE ===== */}
                <Card
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-white dark:bg-zinc-900 border border-border rounded-2xl shadow-xl overflow-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {/* Top-right: TTS (foreign word) + Hint */}
                  <div className="absolute top-5 right-5 flex gap-2">
                    <SpeakerButton
                      text={currentItem.front}
                      languageHint={ttsLanguage}
                      ttsEnabled={settings?.ttsEnabled ?? true}
                      autoplayEnabled={settings?.ttsAutoplay ?? false}
                      autoplay={!isFlipped}
                      className="h-10 w-10 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border-none"
                    />
                    {currentItem.data.notes && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg bg-secondary hover:bg-secondary/80" onClick={(e) => e.stopPropagation()}>
                            <Lightbulb className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="rounded-xl p-4 shadow-xl max-w-xs">
                          <p className="text-sm leading-relaxed">{currentItem.data.notes}</p>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  {/* Main word */}
                  <div className="flex flex-col items-center gap-3 text-center px-4">
                    <h3 className="text-4xl md:text-5xl font-black font-headline tracking-tight leading-tight text-foreground">
                      {currentItem.front}
                    </h3>
                    {/* Phonetics - always visible */}
                    {currentItem.data.phonetic && (
                      <p className="text-base font-mono text-muted-foreground tracking-wide">
                        {currentItem.data.phonetic}
                      </p>
                    )}
                  </div>
                </Card>

                {/* ===== BACK SIDE ===== */}
                <Card
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-foreground text-background rounded-2xl shadow-xl overflow-hidden"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <div className="flex flex-col items-center gap-4 text-center px-4">
                    <h3 className="text-4xl md:text-5xl font-black font-headline tracking-tight leading-tight">
                      {currentItem.back}
                    </h3>
                    {currentItem.data.relatedWord && (
                      <div className="mt-2 px-5 py-2.5 rounded-xl bg-white/10 text-sm">
                        <span className="opacity-60 text-xs uppercase tracking-widest font-bold">{currentItem.data.relatedWord.language}: </span>
                        <span className="font-semibold">{currentItem.data.relatedWord.word}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ===== ACTION AREA ===== */}
      <div className="max-w-md mx-auto w-full space-y-3">
        {isTypedMode ? (
          /* --- TYPING MODE --- */
          <div className="space-y-3">
            {answerStatus === 'unanswered' ? (
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTypingSubmit()}
                  placeholder="Übersetzung eingeben…"
                  className="h-14 text-lg rounded-xl px-4 flex-1"
                  autoComplete="off"
                />
                <Button
                  className="h-14 px-5 rounded-xl"
                  onClick={handleTypingSubmit}
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              /* Show feedback after submit */
              <div className="space-y-3">
                <div className={cn(
                  "rounded-xl p-5 text-center",
                  (answerStatus === 'correct' || answerStatus === 'accepted') ? "bg-secondary" : "bg-secondary"
                )}>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    {answerStatus === 'correct' ? '✓ Richtig!' : answerStatus === 'accepted' ? '✓ Akzeptiert' : '✗ Falsch'}
                  </p>
                  <AnswerFeedback userInput={userInput} correctAnswer={currentItem.back} status={answerStatus} />
                </div>
                <Button
                  className="w-full h-14 text-lg font-bold rounded-xl"
                  onClick={() => handleAnswer(answerStatus === 'correct' || answerStatus === 'accepted')}
                >
                  Weiter
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* --- FLIP MODE --- */
          <div className="space-y-3">
            {!isFlipped ? (
              /* Flip button */
              <>
                <Button
                  className="w-full h-16 text-xl font-black rounded-xl bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => setIsFlipped(true)}
                >
                  Umdrehen
                </Button>
                {/* Back button below flip (from 2nd card onwards) */}
                {(currentIndex > 0 || history.length > 0) && (
                  <Button
                    variant="ghost"
                    className="w-full h-11 rounded-xl text-muted-foreground hover:text-foreground font-semibold"
                    onClick={handleGoBack}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Vorherige Karte
                  </Button>
                )}
              </>
            ) : (
              /* Known / Unknown buttons */
              <>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="h-16 flex-1 rounded-xl border-2 border-border text-foreground hover:bg-secondary active:scale-95 text-base font-bold transition-all"
                    onClick={() => handleAnswer(false)}
                  >
                    <X className="mr-2 h-5 w-5" />
                    Wusste ich nicht
                  </Button>
                  <Button
                    className="h-16 flex-1 rounded-xl bg-foreground text-background hover:bg-foreground/80 active:scale-95 text-base font-bold transition-all"
                    onClick={() => handleAnswer(true)}
                  >
                    <Check className="mr-2 h-5 w-5" />
                    Wusste ich
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .preserve-3d { transform-style: preserve-3d; }
        .flash-streak {
          animation: streakPulse 1s ease-out;
        }
        @keyframes streakPulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); filter: brightness(1) scale(1); }
          50% { box-shadow: 0 0 20px 10px rgba(255, 255, 255, 0); filter: brightness(1.5) scale(1.02); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); filter: brightness(1) scale(1); }
        }
        
        .dark .flash-streak {
          animation: streakPulseDark 1s ease-out;
        }
        @keyframes streakPulseDark {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.2); filter: brightness(1) scale(1); }
          50% { box-shadow: 0 0 20px 10px rgba(255, 255, 255, 0); filter: brightness(1.3) scale(1.02); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); filter: brightness(1) scale(1); }
        }
      `}</style>
    </div>
  );
}
