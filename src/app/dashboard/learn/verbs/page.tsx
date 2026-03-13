'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Check, RotateCcw, X, Lightbulb, Pencil, ChevronLeft, Smile, Frown, Meh } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Verb, VerbTense, Subject } from '@/lib/types';
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
import confetti from 'canvas-confetti';
import { Input } from '@/components/ui/input';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc, collection, addDoc, serverTimestamp, writeBatch, updateDoc } from 'firebase/firestore';
import { SpeakerButton } from '@/components/speaker-button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useSettings } from '@/contexts/settings-context';


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
    id: string; // Composite ID: verbId-tense-pronoun
    verbId: string;
    verbInfinitive: string;
    isConjugation: boolean; // Flag to identify if it's a conjugation or infinitive translation
    front: string;
    back: string;
    hint?: string; // Tense can be a hint now
}

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect' | 'accepted' | 'omitted-correct';

interface VerbLearnState {
  practiceItems: PracticeItem[];
  currentIndex: number;
  incorrectlyAnsweredIds: Set<string>;
  answeredIds: Map<string, AnswerStatus>;
  userInput: string;
}

const SESSION_STATE_KEY = 'learn-session-verb-state';

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
                    finalDiff.push({ type: 'extra', value: diff[k].value });
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
                <p className={cn("font-bold mt-4 break-words", "text-2xl md:text-3xl line-clamp-4")}>{correctAnswer}</p>
            </>
        );
    }
    
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

        return <p className={cn("font-bold mt-4 break-words", "text-2xl md:text-3xl line-clamp-4")}>{parts}</p>;
    }
    
    if (status === 'correct' || status === 'accepted') {
        return <p className={cn("font-bold mt-4 break-words", "text-2xl md:text-3xl line-clamp-4")}>{correctAnswer}</p>;
    }

    return null;
}

const germanPronounMap: Record<string, string> = {
    "ich": "ich",
    "du": "du",
    "er/sie/es": "er/sie/es",
    "wir": "wir",
    "ihr": "ihr",
    "sie/Sie": "sie/Sie",
    "I": "ich",
    "you": "du",
    "he/she/it": "er/sie/es",
    "we": "wir",
    "they": "sie",
    "je": "ich",
    "j'": "ich",
    "tu": "du",
    "il/elle/on": "er/sie/es",
    "nous": "wir",
    "vous": "ihr",
    "ils/elles": "sie",
    "form": "form",
    "(tu)": "(du)",
    "(nous)": "(wir)",
    "(vous)": "(ihr)",
};


export default function VerbPracticePage() {
    const { firestore, user } = useFirebase();
    const { settings } = useSettings();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const speakerRef = useRef<{ play: () => void }>(null);
    const { triggerHapticFeedback } = useHapticFeedback();
    
    const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
    const [initialItems, setInitialItems] = useState<PracticeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSpinner, setShowSpinner] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [subjectId, setSubjectId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const [subject, setSubject] = useState<Subject | null>(null);
    const [totalItemCount, setTotalItemCount] = useState(0);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [incorrectlyAnsweredIds, setIncorrectlyAnsweredIds] = useState<Set<string>>(new Set());
    const [answeredIds, setAnsweredIds] = useState<Map<string, AnswerStatus>>(new Map());
    const [showResults, setShowResults] = useState(false);
    const [animationResetToken, setAnimationResetToken] = useState(0);
    const [exitAnimation, setExitAnimation] = useState<'correct' | 'incorrect' | null>(null);
    
    const [shouldShowHints, setShouldShowHints] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(true);

    const [history, setHistory] = useState<VerbLearnState[]>([]);
    
    const [isTypedMode, setIsTypedMode] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');
    const [isHintPopoverOpen, setIsHintPopoverOpen] = useState(false);


    const finishSession = async () => {
        if (firestore && user && sessionId && answeredIds.size > 0) {
            const batch = writeBatch(firestore);
            const sessionVerbsRef = collection(firestore, 'users', user.uid, 'learningSessions', sessionId, 'verbAnswers');
            
            answeredIds.forEach((status, practiceItemId) => {
                const isCorrect = status === 'correct' || status === 'accepted' || status === 'omitted-correct';
                const verbId = practiceItemId.split('-')[0];
                if (verbId) {
                    const newDocRef = doc(sessionVerbsRef);
                    batch.set(newDocRef, {
                        learningSessionId: sessionId,
                        practiceItemId: practiceItemId,
                        verbId: verbId,
                        correct: isCorrect,
                    });
                }
            });

            const sessionDocRef = doc(firestore, 'users', user.uid, 'learningSessions', sessionId);
            batch.update(sessionDocRef, { endTime: serverTimestamp() });

            await batch.commit();
        }

        sessionStorage.removeItem(SESSION_STATE_KEY);

        setShowResults(true);
    };

    const goToNextCard = (isCorrect: boolean) => {
        
        if (practiceItems.length === 1 && isCorrect) {
            finishSession();
            return;
        }

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

        if (remainingCards.length === 1 && !isCorrect) {
            setAnimationResetToken(c => c + 1);
        }
      
        if (remainingCards.length === 0) {
          finishSession();
        } else {
          const newIndex = currentIndex >= remainingCards.length ? 0 : currentIndex;
          
          setPracticeItems(remainingCards);
          setCurrentIndex(newIndex);
        }
    };

    const handleCheckAnswer = () => {
        if (exitAnimation) return;
        if (isFlipped) {
          const isCorrect = answerStatus === 'correct' || answerStatus === 'accepted' || answerStatus === 'omitted-correct';
          if (practiceItems.length <= 1 && isCorrect) {
            finishSession();
            return;
          }
          
          setExitAnimation(isCorrect ? 'correct' : 'incorrect');
          setTimeout(() => {
            setIsFlipped(false);
            goToNextCard(isCorrect);
            setExitAnimation(null);
          }, 500);
          return;
        }

        saveToHistory();
        setIsFlipped(true);

        const currentCard = practiceItems[currentIndex];
        const expectedAnswer = currentCard.back;
        
        const normalize = (str: string) => str.replace(/['´`]/g, "'");

        const userInputClean = normalize(userInput.trim()).toLowerCase();
        const expectedAnswerOriginal = expectedAnswer.trim();
        const expectedAnswerClean = normalize(expectedAnswerOriginal).toLowerCase();
        
        let isCorrect = false;
        let partialMatch = false;

        const optionalPartRegex = /\(([^)]+)\)/g;
        const match = expectedAnswerClean.match(optionalPartRegex);
        
        if (match) {
            const withParens = expectedAnswerClean;
            const withoutParens = expectedAnswerClean.replace(/[()]/g, '');
            const withoutOptionalPart = expectedAnswerClean.replace(optionalPartRegex, '').replace(/\s+/g, ' ').trim();
            
            const possibleAnswers = [withParens, withoutParens, withoutOptionalPart].map(normalize);
            
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
           if (!currentCard.isConjugation && firestore && user && subjectId) {
                const verbDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'verbs', currentCard.verbId);
                updateDoc(verbDocRef, { isMastered: true }).catch(console.error);
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
        if (!isFlipped || exitAnimation) return;

        if (practiceItems.length <= 1 && knewIt) {
            finishSession();
            return;
        }
        
        saveToHistory();
    
        const currentCard = practiceItems[currentIndex];

        if (knewIt) {
            if (!answeredIds.has(currentCard.id) || answeredIds.get(currentCard.id) === 'incorrect') {
                setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'correct'));
            }
            if (!currentCard.isConjugation && firestore && user && subjectId) {
                const verbDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'verbs', currentCard.verbId);
                updateDoc(verbDocRef, { isMastered: true }).catch(console.error);
            }
            if (hapticsEnabled) triggerHapticFeedback('light');
        } else {
            if (!incorrectlyAnsweredIds.has(currentCard.id)) {
                setIncorrectlyAnsweredIds(prev => new Set(prev).add(currentCard.id));
            }
            setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'incorrect'));
            if (hapticsEnabled) triggerHapticFeedback('heavy');
        }
        
        setExitAnimation(knewIt ? 'correct' : 'incorrect');
        setTimeout(() => {
          setIsFlipped(false);
          goToNextCard(knewIt);
          setExitAnimation(null);
        }, 500);
    };
    
    const handleClassicAnswerRef = useRef(handleClassicAnswer);
    handleClassicAnswerRef.current = handleClassicAnswer;

    const handleFlipCard = () => {
        saveToHistory();
        setIsFlipped(true);
    };

    useEffect(() => {
      const handleGlobalKeyDown = (event: KeyboardEvent) => {
        if (document.querySelector('[role="dialog"]')) return;
        if (event.key === 'Enter' && !exitAnimation) {
          if (isTypedMode) {
              handleCheckAnswerRef.current();
          } else {
              if (!isFlipped) {
                  handleFlipCard();
              } else {
                  handleClassicAnswerRef.current(true);
              }
          }
        }
      };
  
      document.addEventListener('keydown', handleGlobalKeyDown);
      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown);
      };
    }, [isFlipped, isTypedMode, exitAnimation]);

     useEffect(() => {
        if (!isLoading && practiceItems.length > 0) {
            const stateToSave = {
                practiceItems,
                initialItems,
                currentIndex,
                incorrectlyAnsweredIds,
                answeredIds,
                sessionId,
                history,
                totalItemCount,
            };
            sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(stateToSave, replacer));
        }
    }, [practiceItems, currentIndex, answeredIds, incorrectlyAnsweredIds, history, sessionId, totalItemCount, initialItems, isLoading]);

    
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
        if (!settings || !user || !firestore) {
            return;
        }

        const typedModeSetting = localStorage.getItem('learn-mode-typed') === 'true';
        setIsTypedMode(typedModeSetting);

        setShouldShowHints(settings.verbShowHints);
        setHapticsEnabled(settings.hapticFeedback);
        
        const savedStateJSON = sessionStorage.getItem(SESSION_STATE_KEY);
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON, reviver);
            const storedSubjectId = sessionStorage.getItem('verb-practice-subject-id');
            
            if (storedSubjectId) {
                setPracticeItems(savedState.practiceItems);
                setInitialItems(savedState.initialItems);
                setCurrentIndex(savedState.currentIndex);
                setIncorrectlyAnsweredIds(savedState.incorrectlyAnsweredIds);
                setAnsweredIds(savedState.answeredIds);
                setSessionId(savedState.sessionId);
                setHistory(savedState.history || []);
                setTotalItemCount(savedState.totalItemCount);
                setSubjectId(storedSubjectId);
                
                getDoc(doc(firestore, 'users', user.uid, 'subjects', storedSubjectId)).then(docSnap => {
                    if (docSnap.exists()) {
                        setSubject({ ...docSnap.data(), id: docSnap.id } as Subject);
                    }
                });

                setIsLoading(false);
                return;
            } else {
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
        

        const sessionData = sessionStorage.getItem('verb-practice-session');
        const subjectIdData = sessionStorage.getItem('verb-practice-subject-id');

        if (!sessionData || !subjectIdData) {
            setError('Keine Übungsdaten gefunden. Bitte gehe zurück und wähle Verben aus.');
            setIsLoading(false);
            return;
        }

        setSubjectId(subjectIdData);


        const loadData = async () => {
            try {
                if (user && firestore) {
                    const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectIdData);
                    const subjectDoc = await getDoc(subjectDocRef);
                    if (subjectDoc.exists()) {
                        setSubject({ ...subjectDoc.data(), id: subjectDoc.id } as Subject);
                    }
                }
                
                const verbs: (Verb & { selectedTenses: string[] })[] = JSON.parse(sessionData);
                const items: PracticeItem[] = [];
                const germanFirst = settings.verbQueryDirection;


                verbs.forEach((verb) => {
                    if (verb.selectedTenses.length === 0) {
                        items.push({
                            id: `${verb.id}-infinitive`,
                            verbId: verb.id,
                            verbInfinitive: verb.infinitive,
                            isConjugation: false,
                            front: verb.infinitive,
                            back: verb.translation,
                        });
                    } else {
                        verb.selectedTenses.forEach((tense) => {
                            const foreignTenseForms = verb.forms[tense] as VerbTense;
                            const germanTenseForms = verb.germanForms?.[tense] as VerbTense;
                            
                            if (foreignTenseForms && germanTenseForms) {
                                Object.entries(foreignTenseForms).forEach(([pronoun, foreignForm]) => {
                                    const germanPronoun = germanPronounMap[pronoun] || pronoun;
                                    const germanForm = germanTenseForms[germanPronoun];

                                    if (germanForm) {
                                        items.push({
                                            id: `${verb.id}-${tense}-${pronoun}`,
                                            verbId: verb.id,
                                            verbInfinitive: verb.infinitive,
                                            isConjugation: true,
                                            front: `${pronoun.startsWith('(') ? '' : pronoun + ' '}${foreignForm}`,
                                            back: `${germanPronoun.startsWith('(') ? '' : germanPronoun + ' '}${germanForm}`,
                                            hint: tense,
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
                
                const finalItems = items.map(item => {
                    if (germanFirst) {
                        return { ...item, front: item.back, back: item.front };
                    }
                    return item;
                })

                if (finalItems.length === 0) {
                    setError('Keine gültigen Übungseinheiten gefunden. Überprüfe deine Auswahl.');
                    setIsLoading(false);
                    return;
                }

                createSession();
                const shuffledItems = shuffleArray(finalItems);
                setPracticeItems(shuffledItems);
                setInitialItems(shuffledItems);
                setTotalItemCount(shuffledItems.length);

            } catch (e) {
                console.error(e);
                setError('Fehler beim Verarbeiten der Übungsdaten.');
            } finally {
                setIsLoading(false);
            }
        }
        
        loadData();

    }, [user, firestore, settings]);

    useEffect(() => {
        if (!exitAnimation && isTypedMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [currentIndex, exitAnimation, isTypedMode]);
    
    const languageHint = subject?.name || 'English';
    const isGermanFirst = settings?.verbQueryDirection ?? false;


    const correctAnswersCount = Array.from(answeredIds.values()).filter(status => status === 'correct' || status === 'accepted' || status === 'omitted-correct').length;
    const progress = totalItemCount > 0 ? (correctAnswersCount / totalItemCount) * 100 : 0;

    const saveToHistory = () => {
        setHistory(prev => [...prev, { practiceItems, currentIndex, incorrectlyAnsweredIds, answeredIds, userInput }]);
    };
    
    const handleGoBack = () => {
        if (isFlipped) {
            setIsFlipped(false);
            setUserInput('');
            setAnswerStatus('unanswered');
            return;
        }

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
          setExitAnimation(null);
        }
    };
    
    const handleMarkAsCorrect = () => {
        setAnswerStatus('accepted');
        const currentCard = practiceItems[currentIndex];
        setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'accepted'));
        if (hapticsEnabled) triggerHapticFeedback('light');
    };
    
    const resetSession = () => {
        sessionStorage.removeItem(SESSION_STATE_KEY);
        setPracticeItems(shuffleArray(initialItems));
        setCurrentIndex(0);
        setIsFlipped(false);
        setShowResults(false);
        setIncorrectlyAnsweredIds(new Set());
        setAnsweredIds(new Map());
        setHistory([]);
        setUserInput('');
        setAnswerStatus('unanswered');
    };

    const handleBackToSubject = () => {
        sessionStorage.removeItem(SESSION_STATE_KEY);
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
        
        if (isFlipped && (answerStatus === 'correct' || answerStatus === 'accepted' || answerStatus === 'omitted-correct')) {
            return;
        }

        setUserInput('');
        setAnswerStatus('unanswered');
        setIsFlipped(false);
    };

    if (showSpinner) {
        return <LoadingSpinner fullPage />;
    }

    if (isLoading) {
        return null;
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
        const correctCount = totalItemCount > 0 ? totalItemCount - incorrectCount : 0;
        const finalScore = totalItemCount > 0 ? Math.round((correctCount / totalItemCount) * 100) : 0;
        
        if(finalScore >= 80 && settings?.enableConfetti) {
             confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 },
                colors: document.documentElement.classList.contains('dark') ? ['#ffffff'] : ['#000000'],
            });
        }
        
        return (
             <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-12 px-6 animate-in fade-in zoom-in duration-1000">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
                    <div className="relative bg-card shadow-2xl shadow-primary/10 rounded-full p-16 border-none w-80 h-80 flex flex-col justify-center">
                    <p className="font-headline text-8xl font-black leading-none text-primary">{finalScore}<span className="text-4xl align-top">%</span></p>
                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground opacity-60 mt-2">Gemeistert</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 max-w-md w-full">
                    <div className="space-y-2">
                    <p className="text-5xl font-black font-headline text-foreground">{correctCount}</p>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Richtige Antworten</p>
                    </div>
                    <div className="space-y-2">
                    <p className="text-5xl font-black font-headline text-destructive">{incorrectCount}</p>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Falsche Antworten</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl">
                    <Button className="h-20 flex-1 text-xl font-black rounded-full shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all" onClick={resetSession}>
                        Nochmal lernen
                    </Button>
                    <Button variant="outline" className="h-20 flex-1 text-xl font-black rounded-full border-4 shadow-lg hover:scale-[1.02] transition-all" onClick={handleBackToSubject}>
                        Zurück zum Fach
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
    
    const frontIsGerman = isGermanFirst;
    const textToSpeak = frontIsGerman ? currentCard.back : currentCard.front;
    const autoplayFront = (settings?.ttsAutoplay ?? true) && !isFlipped && !frontIsGerman;
    const autoplayBack = (settings?.ttsAutoplay ?? true) && isFlipped && frontIsGerman;

    return (
        <div className="h-screen flex flex-col justify-between py-6 px-4 overflow-hidden">
             <div className="flex items-center gap-4 w-full max-w-2xl mx-auto">
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-14 w-14 rounded-full"><ChevronLeft className="h-8 w-8" /></Button></AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[3rem] p-10"><AlertDialogHeader><AlertDialogTitle className="text-3xl font-black font-headline">Lernen unterbrechen?</AlertDialogTitle><AlertDialogDescription className="text-lg mt-4 font-medium">Dein Fokus geht verloren. Du kannst aber später genau hier weitermachen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-4 mt-8"><AlertDialogCancel className="h-14 rounded-full font-bold border-2">Bleiben</AlertDialogCancel><AlertDialogAction className="h-14 rounded-full font-bold bg-destructive hover:bg-destructive/90" onClick={handleBackToSubject}>Unterbrechen</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
                 <div className="flex-1 space-y-1.5">
                    <p className="text-center font-black text-xs uppercase tracking-widest text-muted-foreground/70">{correctAnswersCount} / {totalItemCount}</p>
                    <Progress value={progress} className="h-2"/>
                </div>
                <Button variant={isTypedMode ? 'secondary' : 'ghost'} size="icon" className="h-14 w-14 rounded-full" onClick={toggleInputMode}>
                    <Pencil className="h-6 w-6" />
                </Button>
            </div>
            
            <div
                key={`${currentCard.id}-${animationResetToken}`}
                className={cn("w-full max-w-2xl mx-auto flex-grow flex flex-col justify-center", 
                    exitAnimation === 'correct' && 'animate-fly-out-correct',
                    exitAnimation === 'incorrect' && 'animate-fly-out-incorrect'
                )}
            >
                <div
                    className="relative w-full aspect-[4/2.5] max-h-[60vh] rounded-[3rem] bg-card shadow-2xl shadow-primary/10 border-none [perspective:2000px]"
                >
                     <div className={cn("relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]", isFlipped && "[transform:rotateX(180deg)]")}>
                        {/* Front Side */}
                        <div className="absolute w-full h-full [backface-visibility:hidden] flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden rounded-[3rem]">
                             <div className="absolute top-8 right-8">
                                {!isFlipped && settings?.ttsEnabled && !frontIsGerman && (
                                    <SpeakerButton
                                        text={textToSpeak}
                                        languageHint={languageHint}
                                        autoplay={autoplayFront}
                                        ttsEnabled={settings?.ttsEnabled}
                                        autoplayEnabled={settings?.ttsAutoplay}
                                        className="h-14 w-14 rounded-full bg-secondary hover:bg-secondary/80 border-none transition-all"
                                    />
                                )}
                            </div>
                            <p className="font-bold text-4xl md:text-5xl text-center break-words">{currentCard.front}</p>
                        </div>
                        {/* Back Side */}
                        <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateX(180deg)] flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden rounded-[3rem]">
                             <div className="absolute top-8 right-8 flex gap-3">
                                {isFlipped && settings?.ttsEnabled && frontIsGerman && (
                                    <SpeakerButton
                                        text={textToSpeak}
                                        languageHint={languageHint}
                                        autoplay={autoplayBack}
                                        ttsEnabled={settings.ttsEnabled}
                                        autoplayEnabled={settings.ttsAutoplay}
                                        className="h-14 w-14 rounded-full bg-secondary hover:bg-secondary/80 border-none transition-all"
                                    />
                                )}
                                {shouldShowHints && currentCard.isConjugation && (
                                     <Popover open={isHintPopoverOpen} onOpenChange={setIsHintPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-secondary" onClick={(e) => e.stopPropagation()}>
                                                <Lightbulb className="h-6 w-6" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto max-w-xs sm:max-w-sm" side="top">
                                            <div className="flex items-start gap-2">
                                                <Lightbulb className="h-4 w-4 mt-1 flex-shrink-0" />
                                                <div className="text-sm">
                                                    <p className="font-semibold">{currentCard.verbInfinitive}</p>
                                                    <p className="text-muted-foreground">{currentCard.hint}</p>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>
                           
                            {isTypedMode && answerStatus !== 'unanswered' ? (
                                <div className="flex flex-col items-center justify-center text-center">
                                    <AnswerFeedback userInput={userInput} correctAnswer={currentCard.back} status={answerStatus} />
                                    <div className="mt-4">
                                        <FeedbackIcon status={answerStatus} />
                                    </div>
                                </div>
                            ) : (
                                <p className="font-bold text-4xl md:text-5xl text-center break-words">{currentCard.back}</p>
                            )}

                             {isTypedMode && answerStatus === 'incorrect' && isFlipped && (
                                <div className="absolute bottom-4 text-center opacity-75 transition-opacity duration-300">
                                    <Button variant="link" className="text-muted-foreground" onClick={handleMarkAsCorrect}>
                                        Ich hab's gewusst
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto w-full pt-4">
                <div className="w-full min-h-[144px]">
                    {!isFlipped ? (
                        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                            {isTypedMode ? (
                                 <div className="flex gap-4 w-full">
                                    <Input
                                        ref={inputRef}
                                        placeholder="Antwort tippen..."
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCheckAnswer()}
                                        className="text-center text-xl h-24 rounded-full"
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <Button className="w-full h-24 text-3xl font-black rounded-full bg-primary shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all" onClick={handleFlipCard}>Umdrehen</Button>
                            )}
                            {history.length > 0 && (
                                <Button variant="ghost" className="h-12 rounded-full font-bold text-muted-foreground/60 hover:text-foreground hover:bg-transparent" onClick={handleGoBack}>
                                    <ChevronLeft className="mr-2 h-5 w-5" />Karte zurück
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             {isTypedMode ? (
                                <Button className="w-full h-24 text-3xl font-black rounded-full" onClick={handleCheckAnswer}>Weiter</Button>
                            ) : (
                                <div className="flex gap-6">
                                    <Button variant="outline" className="h-24 flex-1 rounded-full border-4 text-2xl font-black hover:bg-destructive/5 hover:border-destructive hover:text-destructive active:scale-95 transition-all" onClick={() => handleClassicAnswer(false)}><X className="mr-4 h-8 w-8" />Nicht gewusst</Button>
                                    <Button className="h-24 flex-1 rounded-full bg-primary shadow-2xl shadow-primary/30 text-2xl font-black active:scale-95 transition-all" onClick={() => handleClassicAnswer(true)}><Check className="mr-4 h-8 w-8" />Gewusst</Button>
                                </div>
                            )}
                           {history.length > 0 && (
                              <Button variant="ghost" className="h-12 rounded-full font-bold text-muted-foreground/60 hover:text-foreground hover:bg-transparent" onClick={handleGoBack}>
                                <ChevronLeft className="mr-2 h-5 w-5" />Karte zurück
                              </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

    