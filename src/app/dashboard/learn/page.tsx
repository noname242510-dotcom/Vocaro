"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { X, Check, RotateCcw, Lightbulb, ArrowLeft, Pencil, ChevronLeft, Smile, Frown, Meh, Languages } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/confetti';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, where, documentId, collectionGroup, getDoc, doc, updateDoc, QuerySnapshot, DocumentData, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
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
import { VocabDialog } from '../subjects/[subjectId]/_components/vocab-dialog';
import { SpeakerButton } from '@/components/speaker-button';
import { LoadingSpinner } from '@/components/loading-spinner';

// Function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect' | 'accepted' | 'omitted-correct';

interface LearnState {
  vocabulary: VocabularyItem[];
  currentIndex: number;
  incorrectlyAnsweredIds: Set<string>;
  answeredIds: Map<string, AnswerStatus>;
  userInput: string;
}

const SESSION_STATE_KEY = 'learn-session-vocab-state';

// JSON replacer/reviver to handle Map and Set
const replacer = (key: string, value: any) => {
  if(value instanceof Map) {
    return { __type: 'Map', value: Array.from(value.entries()) };
  }
  if(value instanceof Set) {
    return { __type: 'Set', value: Array.from(value.values()) };
  }
  return value;
};

const reviver = (key: string, value: any) => {
    if(typeof value === 'object' && value !== null) {
      if (value.__type === 'Map') {
        return new Map(value.value);
      }
      if (value.__type === 'Set') {
        return new Set(value.value);
      }
    }
    return value;
  };


const AnswerFeedback = ({ userInput, correctAnswer, status }: { userInput: string, correctAnswer: string, status: AnswerStatus }) => {
    if (status === 'incorrect') {
        const areWordsEqual = (userWordLower: string, correctWordLower: string) => {
            // Treat "(to)" and "to" as equal
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
            const diff: { type: 'correct' | 'extra' | 'missing' | 'substitution', value: string, original?: string }[] = [];
            const userWordsCopy = [...a];
            const correctWordsCopy = [...b];
            
            while (i > 0 || j > 0) {
                 if (i > 0 && j > 0 && areWordsEqual(userWordsCopy[i-1], correctWordsCopy[j-1])) {
                    diff.unshift({ type: 'correct', value: userWordsCopy[i-1] });
                    i--;
                    j--;
                } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                    diff.unshift({ type: 'missing', value: correctWordsCopy[j-1] });
                    j--;
                } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
                    diff.unshift({ type: 'extra', value: userWordsCopy[i-1] });
                    i--;
                } else {
                    // This case handles substitutions.
                    if (i > 0 && j > 0) {
                        diff.unshift({ type: 'substitution', value: userWordsCopy[i-1], original: correctWordsCopy[j-1] });
                        i--;
                        j--;
                    } else {
                        break;
                    }
                }
            }
            
            const finalDiff: { type: 'correct' | 'extra' | 'missing' | 'substitution', value: string, original?: string }[] = [];
            for(let k = 0; k < diff.length; k++) {
                if (diff[k].type === 'substitution') {
                    // When we have a substitution, we show the user's incorrect word (extra)
                    // and indicate the correct word was missing.
                    finalDiff.push({ type: 'extra', value: diff[k].value });
                    // finalDiff.push({ type: 'missing', value: diff[k].original! });
                } else {
                    finalDiff.push(diff[k]);
                }
            }


            return finalDiff;
        };
        
        const userWords = userInput.trim().split(/\s+/).filter(w => w);
        const correctWords = correctAnswer.trim().split(/\s+/).filter(w => w);
        const diff = lcs(userWords, correctWords);

        const displayParts: React.ReactNode[] = [];
        diff.forEach((part, i) => {
            if (part.type === 'correct') {
                displayParts.push(<span key={`c-${i}`} className="px-1">{part.value}</span>);
            } else if (part.type === 'extra') {
                displayParts.push(<span key={`e-${i}`} className="px-1 text-destructive line-through">{part.value}</span>);
            } else if (part.type === 'missing') {
                displayParts.push(<span key={`m-${i}`} className="inline-block self-end h-6 w-8 border-b-2 border-destructive mx-1" title={`Fehlendes Wort: ${part.value}`}></span>);
            } else if (part.type === 'substitution') {
                displayParts.push(<span key={`s-${i}`} className="px-1 text-destructive line-through">{part.value}</span>);
            }
        })


        return (
            <>
                <div className="text-xl font-mono text-center mb-1 flex flex-wrap justify-center items-center leading-relaxed">
                    {displayParts}
                </div>
                <p className={cn("font-bold mt-4 break-words", "text-3xl md:text-4xl line-clamp-4")}>{correctAnswer}</p>
            </>
        );
    }
    
    // Omitted-correct case: show correct answer with yellow underline for optional part
    if (status === 'omitted-correct') {
        const optionalPartRegex = /(\([^)]+\))/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = optionalPartRegex.exec(correctAnswer)) !== null) {
            if (match.index > lastIndex) {
                parts.push(correctAnswer.substring(lastIndex, match.index));
            }
            parts.push(<span key={match.index} className="border-b-2 border-yellow-400">{match[0]}</span>);
            lastIndex = optionalPartRegex.lastIndex;
        }

        if (lastIndex < correctAnswer.length) {
            parts.push(correctAnswer.substring(lastIndex));
        }

        return <p className={cn("font-bold mt-4 break-words", "text-3xl md:text-4xl line-clamp-4")}>{parts}</p>;
    }
    
    // Fully correct or accepted: just show the correct answer
    if (status === 'correct' || status === 'accepted') {
        return <p className={cn("font-bold mt-4 break-words", "text-3xl md:text-4xl line-clamp-4")}>{correctAnswer}</p>;
    }

    // Default: nothing
    return null;
}


export default function LearnPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const speakerRef = useRef<{ play: () => void }>(null);
  const { triggerHapticFeedback } = useHapticFeedback();
  
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [initialVocab, setInitialVocab] = useState<VocabularyItem[]>([]);
  const [totalVocabCount, setTotalVocabCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [incorrectlyAnsweredIds, setIncorrectlyAnsweredIds] = useState<Set<string>>(new Set());
  const [answeredIds, setAnsweredIds] = useState<Map<string, AnswerStatus>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [animationResetToken, setAnimationResetToken] = useState(0);

  const [subject, setSubject] = useState<Subject | null>(null);

  const [isExiting, setIsExiting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [isTermFirst, setIsTermFirst] = useState(true);
  const [shouldShowHints, setShouldShowHints] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const [history, setHistory] = useState<LearnState[]>([]);
  
  const [isTypedMode, setIsTypedMode] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');
  const [isHintPopoverOpen, setIsHintPopoverOpen] = useState(false);
  
  const [editingVocab, setEditingVocab] = useState<VocabularyItem | null>(null);
  const [isVocabDialogOpen, setIsVocabDialogOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isAutoplayOn, setIsAutoplayOn] = useState(true);


  useEffect(() => {
    setIsMounted(true);
    setTtsEnabled(localStorage.getItem('tts-enabled') === 'true');
    const autoplaySetting = localStorage.getItem('tts-autoplay-enabled');
    setIsAutoplayOn(autoplaySetting === null ? true : autoplaySetting === 'true');
  }, []);

  const finishSession = async () => {
    if (firestore && user && sessionId && answeredIds.size > 0) {
        const batch = writeBatch(firestore);
        const sessionVocabRef = collection(firestore, 'users', user.uid, 'learningSessions', sessionId, 'vocabulary');
        
        answeredIds.forEach((status, vocabId) => {
            const isCorrect = status === 'correct' || status === 'accepted' || status === 'omitted-correct';
            const newDocRef = doc(sessionVocabRef); // Auto-generate ID
            batch.set(newDocRef, {
                learningSessionId: sessionId,
                vocabularyId: vocabId,
                correct: isCorrect,
            });
        });

        // Also update the session end time
        const sessionDocRef = doc(firestore, 'users', user.uid, 'learningSessions', sessionId);
        batch.update(sessionDocRef, { endTime: serverTimestamp() });

        await batch.commit();
    }
    
    sessionStorage.removeItem(SESSION_STATE_KEY);

    const incorrectCount = incorrectlyAnsweredIds.size;
    const correctCount = totalVocabCount - incorrectCount;
    const finalScore = totalVocabCount > 0 ? Math.round((correctCount / totalVocabCount) * 100) : 0;
    
    const confettiEnabled = localStorage.getItem('enable-confetti') !== 'false';
    if (finalScore >= 90 && confettiEnabled) {
        setShowConfetti(true);
    }
    setShowResults(true);
  };

  const saveToHistory = () => {
    setHistory(prev => [...prev, { vocabulary, currentIndex, incorrectlyAnsweredIds, answeredIds, userInput }]);
  };

  const goToNextCard = (isCorrect: boolean) => {
    saveToHistory(); // Save state before moving to the next card
    
    if (vocabulary.length === 1 && isCorrect) {
        finishSession();
        return;
    }

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
  
    // If we're repeating the last card, force a re-mount to reset animation state
    if (remainingCards.length === 1 && !isCorrect) {
      setAnimationResetToken(c => c + 1);
    }

    if (remainingCards.length === 0) {
      finishSession();
    } else {
      const newIndex = currentIndex >= remainingCards.length ? 0 : currentIndex;
      
      setVocabulary(remainingCards);
      setCurrentIndex(newIndex);
    }
  };

  const handleCheckAnswer = () => {
    if (isFlipped) {
      const isCorrect = answerStatus === 'correct' || answerStatus === 'accepted' || answerStatus === 'omitted-correct';
      if (vocabulary.length <= 1 && isCorrect) {
        finishSession();
        return;
      }
      
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

    const normalize = (str: string) => str.replace(/['´`]/g, "'").toLowerCase();

    const userInputClean = normalize(userInput.trim());
    const expectedAnswerOriginal = expectedAnswer.trim();
    const expectedAnswerClean = normalize(expectedAnswerOriginal);
    
    let isCorrect = false;
    let partialMatch = false;

    const optionalPartRegex = /\(([^)]+)\)/g;
    const match = expectedAnswerClean.match(optionalPartRegex);
    
    if (match) {
        const withParens = expectedAnswerClean;
        const withoutParens = expectedAnswerClean.replace(/[()]/g, '');
        const withoutOptionalPart = expectedAnswerClean.replace(optionalPartRegex, '').replace(/\s+/g, ' ').trim();
        
        const possibleAnswers = [withParens, withoutParens, withoutOptionalPart].map(v => normalize(v));
        
        if (possibleAnswers.includes(userInputClean)) {
            isCorrect = true;
            if (userInputClean === normalize(withoutOptionalPart) && withParens !== withoutOptionalPart) {
                partialMatch = true;
            }
        }
    } else {
        isCorrect = userInputClean === expectedAnswerClean;
    }

    if (isCorrect) {
      setAnswerStatus(partialMatch ? 'omitted-correct' : 'correct');
      if (!answeredIds.has(currentCard.id) || answeredIds.get(currentCard.id) === 'incorrect') {
        setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'correct'));
      }
      if (!currentCard.isMastered && firestore && user && subjectId && currentCard.stackId) {
        const vocabDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', currentCard.stackId, 'vocabulary', currentCard.id);
        updateDoc(vocabDocRef, { isMastered: true }).catch(console.error); // Non-blocking update
      }
      if (hapticsEnabled) triggerHapticFeedback('light');
    } else {
      setAnswerStatus('incorrect');
      if (!incorrectlyAnsweredIds.has(currentCard.id)) {
        setIncorrectlyAnsweredIds(prev => new Set(prev).add(currentCard.id));
      }
      setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'incorrect'));
      if (hapticsEnabled) triggerHapticFeedback('heavy', 'heavy');
    }
  };

  const handleCheckAnswerRef = useRef(handleCheckAnswer);
  handleCheckAnswerRef.current = handleCheckAnswer;
  
  const handleClassicAnswer = (knewIt: boolean) => {
    if (!isFlipped || isExiting) return;

    if (vocabulary.length <= 1 && knewIt) {
        finishSession();
        return;
    }
    
    const currentCard = vocabulary[currentIndex];
    
    if (knewIt) {
        if (!answeredIds.has(currentCard.id) || answeredIds.get(currentCard.id) === 'incorrect') {
            setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'correct'));
        }
        if (!currentCard.isMastered && firestore && user && subjectId && currentCard.stackId) {
            const vocabDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', currentCard.stackId, 'vocabulary', currentCard.id);
            updateDoc(vocabDocRef, { isMastered: true }).catch(console.error); // Non-blocking update
        }
        if (hapticsEnabled) triggerHapticFeedback('light');
    } else {
        if (!incorrectlyAnsweredIds.has(currentCard.id)) {
            setIncorrectlyAnsweredIds(prev => new Set(prev).add(currentCard.id));
        }
        setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'incorrect'));
        if (hapticsEnabled) triggerHapticFeedback('heavy');
    }
    
    setIsExiting(true);
    setTimeout(() => {
        setIsFlipped(false);
        goToNextCard(knewIt);
        setIsExiting(false);
    }, 500); // Duration matches animation
  };

  const handleClassicAnswerRef = useRef(handleClassicAnswer);
  handleClassicAnswerRef.current = handleClassicAnswer;

  const handleFlipCard = () => {
    setIsFlipped(true);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (event.key === 'Enter' && !isExiting) {
        if (isTypedMode) {
            handleCheckAnswerRef.current();
        } else {
            if (!isFlipped) {
                handleFlipCard();
            } else {
                handleClassicAnswerRef.current(true); // Assume 'knew it'
            }
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isFlipped, isTypedMode, isExiting]);
  
    useEffect(() => {
        // Save state on change
        if (!isLoading && vocabulary.length > 0) {
            const stateToSave = {
                vocabulary,
                initialVocab,
                currentIndex,
                incorrectlyAnsweredIds,
                answeredIds,
                sessionId,
                history,
                totalVocabCount,
            };
            sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(stateToSave, replacer));
        }
    }, [vocabulary, currentIndex, answeredIds, incorrectlyAnsweredIds, history, sessionId, totalVocabCount, initialVocab, isLoading]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => {
        setShowSpinner(true);
      }, 300);
    } else {
      setShowSpinner(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    // Load settings from local storage
    const queryDirectionSetting = localStorage.getItem('query-direction-flashcards');
    if (queryDirectionSetting !== null) {
        setIsTermFirst(queryDirectionSetting === 'false');
    } else {
        setIsTermFirst(false); // Default to German -> Foreign
    }
    
    const showHintsSetting = localStorage.getItem('show-vocab-hints') !== 'false';
    setShouldShowHints(showHintsSetting);
    
    const typedModeSetting = localStorage.getItem('learn-mode-typed') === 'true';
    setIsTypedMode(typedModeSetting);

    const hapticsSetting = localStorage.getItem('haptic-feedback-enabled') !== 'false';
    setHapticsEnabled(hapticsSetting);

    if (!firestore || !user) return;
    
    // Check for saved session state
    const savedStateJSON = sessionStorage.getItem(SESSION_STATE_KEY);

    if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON, reviver);
        const storedSubjectId = sessionStorage.getItem('learn-session-subject');
        
        if (storedSubjectId) {
            setVocabulary(savedState.vocabulary);
            setInitialVocab(savedState.initialVocab);
            setCurrentIndex(savedState.currentIndex);
            setIncorrectlyAnsweredIds(savedState.incorrectlyAnsweredIds);
            setAnsweredIds(savedState.answeredIds);
            setSessionId(savedState.sessionId);
            setHistory(savedState.history || []);
            setTotalVocabCount(savedState.totalVocabCount);
            setSubjectId(storedSubjectId);

            getDoc(doc(firestore, 'users', user.uid, 'subjects', storedSubjectId)).then(docSnap => {
                if (docSnap.exists()) {
                    setSubject({ ...docSnap.data(), id: docSnap.id } as Subject);
                }
            });
            
            setIsLoading(false);
            return;
        } else {
            // If subject is missing, the saved state is invalid. Clear it.
             sessionStorage.removeItem(SESSION_STATE_KEY);
        }
    }

    const createSession = async () => {
        const sessionRef = await addDoc(collection(firestore, 'users', user.uid, 'learningSessions'), {
          userId: user.uid,
          startTime: serverTimestamp(),
          endTime: null
        });
        setSessionId(sessionRef.id);
    };

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
        const queryPromisesPerStack: Promise<{snapshot: QuerySnapshot<DocumentData>, stackId: string}>[] = [];

        for (const stackDoc of stacksSnapshot.docs) {
          const vocabCollectionRef = collection(stackDoc.ref, 'vocabulary');
          
          for (let i = 0; i < vocabIds.length; i += CHUNK_SIZE) {
            const chunk = vocabIds.slice(i, i + CHUNK_SIZE);
            if (chunk.length > 0) {
              const vocabQuery = query(vocabCollectionRef, where(documentId(), 'in', chunk));
              queryPromisesPerStack.push(getDocs(vocabQuery).then(snapshot => ({ snapshot, stackId: stackDoc.id })));
            }
          }
        }

        const allSnapshots = await Promise.all(queryPromisesPerStack);
        allSnapshots.forEach(({ snapshot, stackId }) => {
          snapshot.forEach((doc: any) => {
            if (vocabIds.includes(doc.id)) {
               allVocab.push({ ...doc.data(), id: doc.id, stackId: stackId } as VocabularyItem);
            }
          });
        });
        
        const uniqueVocab = Array.from(new Map(allVocab.map(item => [item.id, item])).values());


        if (uniqueVocab.length === 0 && vocabIds.length > 0) {
          setError('Ausgewählte Vokabeln konnten nicht geladen werden.');
        } else {
          createSession();
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
  
  const languageHint = subject?.name || 'English';

  const correctAnswersCount = Array.from(answeredIds.values()).filter(status => status === 'correct' || status === 'accepted' || status === 'omitted-correct').length;
  const progress = totalVocabCount > 0 ? (correctAnswersCount / totalVocabCount) * 100 : 0;

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
  
  const handleMarkAsCorrect = () => {
    setAnswerStatus('accepted');
    const currentCard = vocabulary[currentIndex];
    setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'accepted'));
    if (hapticsEnabled) triggerHapticFeedback('light');
  }

  const resetSession = () => {
    sessionStorage.removeItem(SESSION_STATE_KEY);
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
    sessionStorage.removeItem(SESSION_STATE_KEY);
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
  
    if (isFlipped && (answerStatus === 'correct' || answerStatus === 'accepted' || answerStatus === 'omitted-correct')) {
        return;
    }
  
    setUserInput('');
    setAnswerStatus('unanswered');
    setIsFlipped(false);
  };
  
  const handleEditVocab = () => {
    setEditingVocab(vocabulary[currentIndex]);
    setIsVocabDialogOpen(true);
  };
  
  const handleSaveVocab = async (stackId: string, vocabId: string, data: Partial<VocabularyItem>) => {
    if (!user || !firestore || !subjectId) return;

    const vocabDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stackId, 'vocabulary', vocabId);
    try {
        await updateDoc(vocabDocRef, data);
        // Optimistically update local state
        setVocabulary(current => current.map(v => v.id === vocabId ? { ...v, ...data } : v));
        setInitialVocab(current => current.map(v => v.id === vocabId ? { ...v, ...data } : v));
    } catch (e) {
        console.error("Failed to update vocab:", e);
    }
  };


  const getMotivationMessage = (score: number) => {
    if (score >= 90) return "Exzellente Leistung. Halte das Niveau.";
    if (score >= 70) return "Gut gemacht. Ein paar Lücken gibt es noch, die du schließen kannst.";
    if (score >= 50) return "Halb geschafft – konzentriere dich beim nächsten Durchgang auf die Fehler.";
    if (score >= 30) return "Kein Grund zur Sorge. Lerne gezielt die Fehler, dann kommst du schnell voran.";
    return "Das Fundament fehlt noch – wiederhole regelmäßig, um Fortschritt zu sehen.";
  };

  if (showSpinner) {
    return (
        <div className="absolute inset-0 flex h-full items-center justify-center">
            <LoadingSpinner />
        </div>
    );
  }

  if (isLoading) {
    return null;
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
        case 'correct':
        case 'omitted-correct':
            return <Smile className="h-10 w-10" />;
        case 'incorrect': return <Frown className="h-10 w-10" />;
        case 'accepted': return <Meh className="h-10 w-10" />;
        default: return <div className="h-10 w-10" />;
    }
  };
  
  const expectedAnswer = isTermFirst ? currentCard.definition : currentCard.term;

  const frontIsForeign = isTermFirst;
  const backIsForeign = !isTermFirst;

  const frontWord = frontIsForeign ? currentCard.term : currentCard.definition;
  const frontFlag = frontIsForeign ? subject?.emoji || '🌐' : '🇩🇪';

  const backWord = backIsForeign ? currentCard.term : currentCard.definition;
  const backFlag = backIsForeign ? subject?.emoji || '🌐' : '🇩🇪';
  
  const formattedPhonetic = currentCard.phonetic ? currentCard.phonetic.replace(/^\/|\/$/g, '') : '';

  const autoplayFront = isAutoplayOn && !isFlipped && frontIsForeign;
  const autoplayBack = isAutoplayOn && isFlipped && backIsForeign;


  return (
    <>
      <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-9rem)] -mx-4 sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="w-full px-4 sm:px-0 mx-auto">
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
          <Progress value={progress} className="h-2 w-full" />
          <p className="text-sm text-muted-foreground text-center mt-1">
            ({correctAnswersCount}/{totalVocabCount})
          </p>
        </div>

        <div className={cn(
          "w-full mx-auto flex-grow flex flex-col sm:justify-center gap-2 sm:gap-4 px-4 sm:px-0",
          isTypedMode ? "justify-end" : "justify-center"
        )}>
          <div
            key={`${currentCard.id}-${animationResetToken}`}
            className={cn(
              "relative w-full min-h-[20rem] flex flex-col items-center justify-center p-2 md:p-4 rounded-2xl glass-effect border transition-opacity duration-300",
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
            
            {ttsEnabled && (
                <div className="absolute top-4 right-4 h-10 w-10 [perspective:1000px]">
                <div className={cn("relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]", isFlipped && "[transform:rotateY(180deg)]")}>
                    {/* Speaker for the foreign word */}
                    <div className={cn("absolute inset-0 [backface-visibility:hidden]", !frontIsForeign && "opacity-0")}>
                        <SpeakerButton ref={speakerRef} text={currentCard.term} languageHint={languageHint} autoplay={autoplayFront} />
                    </div>
                    <div className={cn("absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]", !backIsForeign && "opacity-0")}>
                        <SpeakerButton ref={speakerRef} text={currentCard.term} languageHint={languageHint} autoplay={autoplayBack} />
                    </div>
                </div>
                </div>
            )}
            
             <div className="grid grid-cols-1 [grid-template-areas:_'center'] justify-center items-center [perspective:1000px] w-full px-4 sm:px-8 md:px-12">
                <div className={cn(
                    "col-start-1 row-start-1 [grid-area:center] transition-transform duration-700 [transform-style:preserve-3d] flex flex-col items-center justify-center",
                    isFlipped && "[transform:rotateY(180deg)]"
                )}>
                    {/* Front Side */}
                    <div className="[backface-visibility:hidden] w-full">
                        <div className="flex flex-col items-center justify-center text-center">
                            <p className="font-bold text-3xl md:text-4xl break-words">{frontWord}</p>
                            {frontIsForeign && formattedPhonetic && (
                                <p className="mt-2 text-lg md:text-xl text-muted-foreground font-mono">{formattedPhonetic}</p>
                            )}
                        </div>
                    </div>
                    {/* Back Side */}
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] w-full flex flex-col items-center justify-center">
                        {isTypedMode && answerStatus !== 'unanswered' ? (
                            <div className="flex flex-col items-center justify-center text-center">
                                <AnswerFeedback userInput={userInput} correctAnswer={expectedAnswer} status={answerStatus} />
                                <div className="mt-4">
                                    <FeedbackIcon status={answerStatus} />
                                </div>
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center text-center break-words">
                                <p className={cn("font-bold break-words", "text-3xl md:text-4xl line-clamp-4")}>{backWord}</p>
                                {backIsForeign && formattedPhonetic && (
                                    <p className="mt-2 text-lg md:text-xl text-muted-foreground font-mono">{formattedPhonetic}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {currentCard.relatedWord && (
                <div className="absolute bottom-4 left-4 h-10 w-10 [perspective:1000px]">
                    <div className={cn("relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]", isFlipped && "[transform:rotateY(180deg)]")}>
                        <div className="[backface-visibility:hidden] w-full h-full"></div>
                        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Languages className="h-6 w-6" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" side="top">
                                    <div className="text-sm">
                                        <span className="font-semibold">{currentCard.relatedWord.language}:</span> {currentCard.relatedWord.word}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>
            )}
            {shouldShowHints && currentCard.notes && (
                <div className="absolute bottom-4 right-4 h-10 w-10 [perspective:1000px]">
                    <div className={cn("relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]", isFlipped && "[transform:rotateY(180deg)]")}>
                        <div className="[backface-visibility:hidden] w-full h-full"></div>
                        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center">
                            <Popover open={isHintPopoverOpen} onOpenChange={setIsHintPopoverOpen}>
                                <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); }}>
                                    <Lightbulb className="h-6 w-6" />
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto max-w-xs sm:max-w-sm" side="top">
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
            {isTypedMode && answerStatus === 'incorrect' && isFlipped && (
                <div className="absolute bottom-4 w-full text-center opacity-75 transition-opacity duration-300">
                    <Button variant="link" className="text-muted-foreground" onClick={handleMarkAsCorrect}>
                        Ich hab's gewusst
                    </Button>
                </div>
            )}
          </div>
          
          <div className="w-full max-w-2xl mx-auto sm:mt-2">
            <div className="h-12 mb-2 sm:mb-4">
                <div
                    className={cn(
                        'flex justify-center items-center transition-all duration-300',
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
                                className="text-center text-lg md:text-xl h-12 rounded-full"
                                autoFocus
                            />
                            <Button size="lg" onClick={handleCheckAnswer}>Überprüfen</Button>
                        </div>
                    ) : (
                        <Button size="lg" className="w-full h-12" onClick={handleFlipCard}>Umdrehen</Button>
                    )}
                </div>
                <div
                    className={cn(
                        'flex justify-center items-center gap-2 transition-all duration-300',
                        (!isFlipped || isExiting) && 'opacity-0 scale-90 hidden'
                    )}
                >
                    {isTypedMode ? (
                       <Button size="lg" className="w-full h-12" onClick={handleCheckAnswer}>
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
            <div className="w-full text-center h-[36px]">
                {history.length > 0 && !isExiting && (
                  <Button variant="link" onClick={handleGoBack} className="text-muted-foreground">
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Zurück
                  </Button>
                )}
            </div>
          </div>
        </div>
      </div>
      {editingVocab && subjectId && (
        <VocabDialog 
            isOpen={isVocabDialogOpen}
            onOpenChange={setIsVocabDialogOpen}
            vocabItem={editingVocab}
            subjectId={subjectId}
            onSave={handleSaveVocab}
        />
      )}
    </>
  );
}
