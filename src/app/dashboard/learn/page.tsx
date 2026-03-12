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

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect' | 'accepted';

const AnswerFeedback = ({ userInput, correctAnswer, status }: { userInput: string, correctAnswer: string, status: AnswerStatus }) => {
  if (status === 'incorrect') {
    return <p className="text-3xl font-bold font-headline">{correctAnswer}</p>;
  }
  return <p className="text-3xl font-bold font-headline">{correctAnswer}</p>;
};

function FinishedScreen({ stats, onRestart }: { stats: { correct: number; incorrect: number; mastered: number; initial: number }, onRestart: () => void }) {
  const pct = stats.initial > 0 ? Math.round((stats.mastered / stats.initial) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-12 px-6 animate-in fade-in zoom-in duration-1000">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
        <div className="relative bg-card shadow-2xl shadow-primary/10 rounded-full p-16 border-none w-80 h-80 flex flex-col justify-center">
          <p className="font-headline text-8xl font-black leading-none text-primary">{pct}<span className="text-4xl align-top">%</span></p>
          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground opacity-60 mt-2">Gemeistert</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 max-w-md w-full">
        <div className="space-y-2">
          <p className="text-5xl font-black font-headline text-foreground">{stats.correct}</p>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Richtige Antworten</p>
        </div>
        <div className="space-y-2">
          <p className="text-5xl font-black font-headline text-destructive">{stats.incorrect}</p>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Falsche Antworten</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl">
        <Button className="h-20 flex-1 text-xl font-black rounded-full shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all" onClick={onRestart}>
          Nochmal lernen
        </Button>
        <Button variant="outline" className="h-20 flex-1 text-xl font-black rounded-full border-4 shadow-lg hover:scale-[1.02] transition-all" onClick={() => window.location.href = '/dashboard'}>
          Dashboard
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
  const [initialItemCount, setInitialItemCount] = useState(0);

  const [items, setItems] = useState<LearnItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, mastered: 0, initial: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [isTypedMode, setIsTypedMode] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');
  const [history, setHistory] = useState<LearnItem[][]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subjectLanguage, setSubjectLanguage] = useState('en-US');
  const [cardAnimation, setCardAnimation] = useState<'correct' | 'incorrect' | null>(null);

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
        setItems(shuffledItems);
        setInitialItemCount(shuffledItems.length);
        setSessionStats(prev => ({...prev, initial: shuffledItems.length}));

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
  }, [firestore, user]);

  useEffect(() => {
    if (isTypedMode && !isFlipped && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTypedMode, currentIndex, items]);

  const goToNextCard = () => {
    if (items.length > 0) {
      setCurrentIndex(currentIndex % items.length);
      setIsFlipped(false);
      setAnswerStatus('unanswered');
      setUserInput('');
      setCardAnimation(null);
    } else {
      setIsFinished(true);
      if (sessionId && firestore && user) {
        updateDoc(doc(firestore, 'users', user.uid, 'learningSessions', sessionId), {
          endTime: serverTimestamp(),
          stats: sessionStats,
        });
      }
      const pct = sessionStats.initial > 0 ? (sessionStats.mastered / sessionStats.initial) * 100 : 0;
      if (pct >= 90 && settings?.enableConfetti) {
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#000000', '#ffffff'],
        });
      }
    }
  }

  const handleAnswer = (correct: boolean) => {
    setHistory(prev => [...prev, items]);
    const currentItem = items[currentIndex];
    triggerHapticFeedback(correct ? 'light' : 'heavy');

    if (correct) {
      setSessionStats(prev => ({ ...prev, correct: prev.correct + 1, mastered: prev.mastered + 1 }));
      setCardAnimation('correct');
      if (firestore && user && subjectId && currentItem.stackId && !currentItem.isMastered) {
        const docRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', currentItem.stackId, 'vocabulary', currentItem.id);
        updateDoc(docRef, { isMastered: true }).catch(console.error);
      }
      setTimeout(() => {
        setItems(prevItems => prevItems.filter(item => item.id !== currentItem.id));
        goToNextCard();
      }, 500);

    } else {
      setSessionStats(prev => ({ ...prev, incorrect: prev.incorrect + 1}));
      setCardAnimation('incorrect');
      setTimeout(() => {
        setItems(prevItems => {
          const newItems = [...prevItems];
          const itemToMove = newItems.splice(currentIndex, 1)[0];
          newItems.push(itemToMove);
          return newItems;
        });
        goToNextCard();
      }, 500);
    }
  };

  const handleGoBack = () => {
    if (history.length > 0) {
      const previousItemsState = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setItems(previousItemsState);
      const previousItem = previousItemsState[currentIndex-1] || previousItemsState[previousItemsState.length-1];
      const newIndex = previousItemsState.findIndex(i => i.id === previousItem.id);
      setCurrentIndex(newIndex);
      setIsFlipped(false);
      setAnswerStatus('unanswered');
      setUserInput('');
    }
  };

  const handleTypingSubmit = () => {
    if (answerStatus !== 'unanswered') {
      handleAnswer(answerStatus === 'correct' || answerStatus === 'accepted');
      return;
    }
    const currentItem = items[currentIndex];
    const frontIsForeign = !settings?.vocabQueryDirection;
    const expectedAnswer = frontIsForeign ? currentItem.definition : currentItem.term;
    const normalized = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const isCorrect = normalized(userInput) === normalized(expectedAnswer);

    setAnswerStatus(isCorrect ? 'correct' : 'incorrect');
    setIsFlipped(true);
  };

  const handleRestart = () => {
    // This logic needs to re-fetch the initial set of vocab
    setIsFinished(false);
    setIsLoading(true);
    // Re-trigger the init effect by clearing session storage and reloading, or re-fetching inside this function
    sessionStorage.removeItem('learn-session-vocab');
    sessionStorage.removeItem('learn-session-subject');
    window.location.reload(); // Simple way to restart
  };

  const progress = initialItemCount > 0 ? (sessionStats.mastered / initialItemCount) * 100 : 0;
  
  const currentItem = !isLoading && !isFinished ? items[currentIndex] : null;

  if (isLoading) {
    return <div className="fixed inset-0 flex items-center justify-center bg-background"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-foreground"></div></div>;
  }

  if (items.length === 0 && !isFinished) {
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
    return <FinishedScreen stats={sessionStats} onRestart={handleRestart} />;
  }

  const frontIsForeign = !settings?.vocabQueryDirection;
  const termSide = frontIsForeign ? 'front' : 'back';

  return (
    <div className="max-w-4xl mx-auto h-screen flex flex-col justify-between py-6 px-4 overflow-hidden">
      <div className="flex items-center gap-4 w-full">
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-14 w-14 rounded-full"><ChevronLeft className="h-8 w-8" /></Button></AlertDialogTrigger>
          <AlertDialogContent className="rounded-full p-10"><AlertDialogHeader><AlertDialogTitle className="text-3xl font-black font-headline">Lernen unterbrechen?</AlertDialogTitle><AlertDialogDescription className="text-lg mt-4 font-medium">Dein Fokus geht verloren. Du kannst aber später genau hier weitermachen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-4 mt-8"><AlertDialogCancel className="h-14 rounded-full font-bold border-2">Bleiben</AlertDialogCancel><AlertDialogAction className="h-14 rounded-full font-bold bg-destructive hover:bg-destructive/90" onClick={() => router.push('/dashboard')}>Unterbrechen</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
        <div className="flex-1 space-y-1.5">
          <p className="text-center font-black text-xs uppercase tracking-widest text-muted-foreground/70">{sessionStats.mastered} / {initialItemCount}</p>
          <Progress value={progress} className="h-2"/>
        </div>
        <Button variant="ghost" size="icon" className={cn("h-14 w-14 rounded-full", isTypedMode && "text-primary bg-secondary")} onClick={() => { setIsTypedMode(!isTypedMode); setIsFlipped(false); setAnswerStatus('unanswered'); setUserInput(''); }}><Pencil className="h-6 w-6" /></Button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center w-full max-w-2xl mx-auto" style={{ perspective: '2000px' }}>
          <AnimatePresence>
          {currentItem && (
            <motion.div
              key={currentItem.id}
              className="w-full"
              initial={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              animate={cardAnimation === 'correct' ? { opacity: 0, y: -200, scale: 0.5, rotate: 15 } : cardAnimation === 'incorrect' ? { opacity: 0, y: 200, scale: 0.9, zIndex: -1 } : {}}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            >
              <div className="relative w-full aspect-[4/3] max-h-[50vh]" style={{ transformStyle: 'preserve-3d' }}>
                <motion.div
                  className="w-full h-full relative"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateX: isFlipped ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 250, damping: 30 }}
                >
                  {/* FRONT */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 md:p-12 bg-card rounded-full shadow-2xl shadow-primary/10 border-none overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
                    <div className="absolute top-8 right-8 flex gap-3">
                     { (termSide === 'front' && !isFlipped) && <SpeakerButton text={currentItem.term} languageHint={subjectLanguage} ttsEnabled={settings?.ttsEnabled ?? true} autoplayEnabled={settings?.ttsAutoplay ?? false} autoplay={!isFlipped} className="h-14 w-14 rounded-full bg-secondary hover:bg-secondary/80 border-none transition-all" /> }
                      {currentItem.data.notes && <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-secondary hover:bg-secondary/80 transition-all"><Lightbulb className="h-6 w-6" /></Button></PopoverTrigger><PopoverContent className="rounded-full p-6 shadow-2xl border-none max-w-xs"><p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Notiz / Hilfe</p><p className="text-lg font-medium leading-relaxed">{currentItem.data.notes}</p></PopoverContent></Popover>}
                    </div>
                    <div className="text-center space-y-4">
                      <h3 className={cn("font-headline font-black tracking-tight leading-[1.1]", currentItem[frontIsForeign ? 'term' : 'definition'].length <= 10 ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl")}>{frontIsForeign ? currentItem.term : currentItem.definition}</h3>
                      {currentItem.data.phonetic && frontIsForeign && <div className="inline-block px-6 py-2 bg-secondary/80 rounded-full"><p className="text-lg font-medium text-muted-foreground/80 font-mono tracking-wider italic">{currentItem.data.phonetic}</p></div>}
                    </div>
                  </div>
                  {/* BACK */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 md:p-12 bg-card rounded-full shadow-2xl shadow-primary/10 border-none overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}>
                     <div className="absolute top-8 right-8 flex gap-3">
                       { (termSide === 'back' && isFlipped) && <SpeakerButton text={currentItem.term} languageHint={subjectLanguage} ttsEnabled={settings?.ttsEnabled ?? true} autoplayEnabled={settings?.ttsAutoplay ?? false} autoplay={isFlipped} className="h-14 w-14 rounded-full bg-secondary hover:bg-secondary/80 border-none transition-all" /> }
                     </div>
                    <div className="text-center space-y-6">
                       <h3 className={cn("font-headline font-black tracking-tight leading-[1.1]", currentItem[frontIsForeign ? 'definition' : 'term'].length <= 10 ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl")}>{frontIsForeign ? currentItem.definition : currentItem.term}</h3>
                      {currentItem.data.relatedWord && <div className="inline-flex items-center gap-3 px-8 py-3 rounded-full bg-secondary/80"><span className="text-xs font-black uppercase tracking-[0.2em] opacity-60">{currentItem.data.relatedWord.language}:</span><span className="text-xl font-bold">{currentItem.data.relatedWord.word}</span></div>}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
      </div>

      <div className="max-w-2xl mx-auto w-full pt-4">
        {isTypedMode ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {answerStatus === 'unanswered' ? (
              <div className="flex gap-4"><Input ref={inputRef} value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTypingSubmit()} placeholder="Übersetzung eingeben..." className="h-20 text-2xl font-bold rounded-full px-10 flex-1 border-4 focus:border-primary shadow-xl shadow-primary/5 transition-all" autoComplete="off" /><Button className="h-20 w-20 rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-all" onClick={handleTypingSubmit}><ArrowRight className="h-8 w-8" /></Button></div>
            ) : (
              <div className="space-y-4"><div className="bg-card rounded-full p-10 text-center shadow-xl shadow-primary/5 border-4"><p className={cn("font-black text-xs uppercase tracking-widest mb-6", (answerStatus === 'correct' || answerStatus === 'accepted') ? "text-primary" : "text-destructive")}>{answerStatus === 'correct' ? '✓ Richtig!' : answerStatus === 'accepted' ? '✓ Akzeptiert' : '✗ Falsch'}</p><AnswerFeedback userInput={userInput} correctAnswer={frontIsForeign ? currentItem.definition : currentItem.term} status={answerStatus} /></div><Button className="w-full h-20 text-2xl font-black rounded-full shadow-xl shadow-primary/20" onClick={() => handleAnswer(answerStatus === 'correct' || answerStatus === 'accepted')}>Nächste Karte<ArrowRight className="ml-4 h-8 w-8" /></Button></div>
            )}
          </div>
        ) : (
          <div className="w-full min-h-[144px]">
            {!isFlipped ? (
              <div className="flex flex-col gap-4 animate-in fade-in duration-300"><Button className="w-full h-24 text-3xl font-black rounded-full bg-primary shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all" onClick={() => setIsFlipped(true)}>Umdrehen</Button>{(history.length > 0) && (<Button variant="ghost" className="h-12 rounded-full font-bold text-muted-foreground/60 hover:text-foreground hover:bg-transparent" onClick={handleGoBack}><ChevronLeft className="mr-2 h-5 w-5" />Karte zurück</Button>)}</div>
            ) : (
              <div className="flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500"><Button variant="outline" className="h-24 flex-1 rounded-full border-4 text-2xl font-black hover:bg-destructive/5 hover:border-destructive hover:text-destructive active:scale-95 transition-all" onClick={() => handleAnswer(false)}><X className="mr-4 h-8 w-8" />Nicht gewusst</Button><Button className="h-24 flex-1 rounded-full bg-primary shadow-2xl shadow-primary/30 text-2xl font-black active:scale-95 transition-all" onClick={() => handleAnswer(true)}><Check className="mr-4 h-8 w-8" />Gewusst</Button></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
