'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Check, Loader2, RotateCcw, X, Lightbulb, Pencil, ChevronLeft, Smile, Frown, Meh } from 'lucide-react';
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
import { Confetti } from '@/components/confetti';
import { Input } from '@/components/ui/input';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, writeBatch, updateDoc } from 'firebase/firestore';
import { SpeakerButton } from '@/components/speaker-button';


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
                <p className={cn("font-bold mt-4 break-words", "text-2xl md:text-3xl line-clamp-4")}>{correctAnswer}</p>
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

        return <p className={cn("font-bold mt-4 break-words", "text-2xl md:text-3xl line-clamp-4")}>{parts}</p>;
    }
    
    // Fully correct or accepted: just show the correct answer
    if (status === 'correct' || status === 'accepted') {
        return <p className={cn("font-bold mt-4 break-words", "text-2xl md:text-3xl line-clamp-4")}>{correctAnswer}</p>;
    }

    // Default: nothing
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
    const { firestore, user } = useFirebase();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const speakerRef = useRef<{ play: () => void }>(null);
    const { triggerHapticFeedback } = useHapticFeedback();
    
    const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
    const [initialItems, setInitialItems] = useState<PracticeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
    const [isExiting, setIsExiting] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const [isGermanFirst, setIsGermanFirst] = useState(true);
    const [shouldShowHints, setShouldShowHints] = useState(true);

    const [history, setHistory] = useState<VerbLearnState[]>([]);
    
    // Typed Input Mode State
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
                    const newDocRef = doc(sessionVerbsRef); // Auto-generate ID
                    batch.set(newDocRef, {
                        learningSessionId: sessionId,
                        practiceItemId: practiceItemId,
                        verbId: verbId,
                        correct: isCorrect,
                    });
                }
            });

            // Also update the session end time
            const sessionDocRef = doc(firestore, 'users', user.uid, 'learningSessions', sessionId);
            batch.update(sessionDocRef, { endTime: serverTimestamp() });

            await batch.commit();
        }

        const incorrectCount = incorrectlyAnsweredIds.size;
        const correctCount = totalItemCount - incorrectCount;
        const finalScore = totalItemCount > 0 ? Math.round((correctCount / totalItemCount) * 100) : 0;
        
        const confettiEnabled = localStorage.getItem('enable-confetti') !== 'false';
        if (finalScore >= 90 && confettiEnabled) {
            setShowConfetti(true);
        }
        setShowResults(true);
    };

    const goToNextCard = (isCorrect: boolean) => {
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
      
        if (remainingCards.length === 0) {
          finishSession();
        } else {
          const newIndex = currentIndex >= remainingCards.length ? 0 : currentIndex;
          
          setPracticeItems(remainingCards);
          setCurrentIndex(newIndex);
        }
    };

    const handleCheckAnswer = () => {
        if (isFlipped) {
          const isCorrect = answerStatus === 'correct' || answerStatus === 'accepted' || answerStatus === 'omitted-correct';
          setIsExiting(true);
          setTimeout(() => {
            setIsFlipped(false);
            goToNextCard(isCorrect);
            setIsExiting(false);
          }, 500); // Duration matches animation
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
                updateDoc(verbDocRef, { isMastered: true }).catch(console.error); // Non-blocking update
            }
          triggerHapticFeedback('light');
        } else {
          setAnswerStatus('incorrect');
          if (!incorrectlyAnsweredIds.has(currentCard.id)) {
            setIncorrectlyAnsweredIds(prev => new Set(prev).add(currentCard.id));
          }
          setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'incorrect'));
          triggerHapticFeedback('heavy', 'heavy'); // Double tap
        }
    };

    const handleCheckAnswerRef = useRef(handleCheckAnswer);
    handleCheckAnswerRef.current = handleCheckAnswer;
    
    const handleClassicAnswer = (knewIt: boolean) => {
        if (!isFlipped || isExiting) return;

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
            triggerHapticFeedback('light');
        } else {
            if (!incorrectlyAnsweredIds.has(currentCard.id)) {
                setIncorrectlyAnsweredIds(prev => new Set(prev).add(currentCard.id));
            }
            setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'incorrect'));
            triggerHapticFeedback('heavy');
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
        saveToHistory();
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
        const persistedQueryDirectionVerbs = localStorage.getItem('query-direction-verbs');
        if (persistedQueryDirectionVerbs !== null) {
            setIsGermanFirst(persistedQueryDirectionVerbs === 'true');
        } else {
            setIsGermanFirst(true); // Default to German first
        }

        const showHintsSetting = localStorage.getItem('show-verb-hints') !== 'false';
        setShouldShowHints(showHintsSetting);
        
        const typedModeSetting = localStorage.getItem('learn-mode-typed') === 'true';
        setIsTypedMode(typedModeSetting);

        if (!firestore || !user) return;

        const createSession = async () => {
            const sessionRef = await addDoc(collection(firestore, 'users', user.uid, 'learningSessions'), {
              userId: user.uid,
              startTime: serverTimestamp(),
              endTime: null
            });
            setSessionId(sessionRef.id);
        };
        createSession();

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

                verbs.forEach((verb) => {
                    // If no tenses are selected, practice the infinitive translation
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
                        // Practice selected tenses
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
                
                // Apply German-first setting after generation
                const finalItems = items.map(item => {
                    if (isGermanFirst) {
                        return { ...item, front: item.back, back: item.front };
                    }
                    return item;
                })

                if (finalItems.length === 0) {
                    setError('Keine gültigen Übungseinheiten gefunden. Überprüfe deine Auswahl.');
                    setIsLoading(false);
                    return;
                }

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

    }, [user, firestore, isGermanFirst]);

    useEffect(() => {
        if (!isExiting && isTypedMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [currentIndex, isExiting, isTypedMode]);
    
    const currentCard = practiceItems[currentIndex];
    const languageHint = subject?.name || 'English';

    useEffect(() => {
        if (currentCard && !isFlipped) {
            const isEnabled = localStorage.getItem('tts-enabled') !== 'false';
            if (isEnabled) {
                speakerRef.current?.play();
            }
        }
    }, [isFlipped, currentIndex, currentCard]);


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
        }
    };
    
    const handleMarkAsCorrect = () => {
        setAnswerStatus('accepted');
        const currentCard = practiceItems[currentIndex];
        setAnsweredIds(prev => new Map(prev).set(currentCard.id, 'accepted'));
        triggerHapticFeedback('light');
    };
    
    const resetSession = () => {
        setPracticeItems(shuffleArray(initialItems));
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

    const handleBackToSubject = () => {
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
    
    // Check if the original 'front' of the item was German
    const frontIsGerman = isGermanFirst;

    // The flag for the foreign language is the subject's emoji.
    const foreignWordFlag = subject?.emoji || '🌐';
    const germanFlag = '🇩🇪';

    // Assign flags based on whether the content is German or foreign.
    const frontFlag = frontIsGerman ? germanFlag : foreignWordFlag;
    const backFlag = frontIsGerman ? foreignWordFlag : germanFlag;

    // The text to be spoken is always the foreign language text.
    // If the front is German, the back is foreign, and vice-versa.
    const textToSpeak = frontIsGerman ? currentCard.back : currentCard.front;

    return (
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
                    <Button variant={isTypedMode ? 'default' : 'ghost'} size="icon" onClick={toggleInputMode}>
                        <Pencil className="h-5 w-5" />
                    </Button>
                </div>
                <Progress value={progress} className="h-2 w-full" />
                <p className="text-sm text-muted-foreground text-center mt-1">
                    ({correctAnswersCount}/{totalItemCount})
                </p>
            </div>

            <div className={cn(
                "w-full mx-auto flex-grow flex flex-col sm:justify-center gap-2 sm:gap-4 px-4 sm:px-0",
                isTypedMode ? "justify-end" : "justify-center"
            )}>
                <div
                    key={currentCard.id}
                    className={cn(
                        "relative w-full min-h-[20rem] flex flex-col items-center justify-center p-2 md:p-4 rounded-2xl glass-effect border transition-opacity duration-300",
                         !isExiting ? 'opacity-100' : 'opacity-0'
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
                    

                     <div className="absolute top-4 right-4 h-10 w-10 [perspective:1000px]">
                        <div className={cn("relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]", isFlipped && "[transform:rotateY(180deg)]")}>
                            <div className={cn("absolute inset-0 [backface-visibility:hidden]", frontIsGerman && "opacity-0")}>
                                <SpeakerButton ref={speakerRef} text={textToSpeak} languageHint={languageHint} />
                            </div>
                            <div className={cn("absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]", !frontIsGerman && "opacity-0")}>
                                <SpeakerButton ref={speakerRef} text={textToSpeak} languageHint={languageHint} />
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-4 right-4 h-10 w-10 [perspective:1000px]">
                        <div className={cn("relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]", isFlipped && "[transform:rotateY(180deg)]")}>
                            <div className="[backface-visibility:hidden] w-full h-full flex items-center justify-center">
                                {/* Empty on front, hint on back */}
                            </div>
                            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center">
                               {shouldShowHints && currentCard.isConjugation && (
                                    <Popover open={isHintPopoverOpen} onOpenChange={setIsHintPopoverOpen}>
                                        <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); }}>
                                            <Lightbulb className="h-5 w-5" />
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto max-w-xs sm:max-w-sm"
                                            side="top"
                                        >
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
                        </div>
                    </div>
                     <div className="grid grid-cols-1 [grid-template-areas:_'center'] justify-center items-center [perspective:1000px] w-full px-4 sm:px-8 md:px-12">
                        <div className={cn(
                            "col-start-1 row-start-1 [grid-area:center] transition-transform duration-700 [transform-style:preserve-3d]",
                            isFlipped && "[transform:rotateY(180deg)]"
                        )}>
                            <div className="[backface-visibility:hidden] flex flex-col items-center justify-center">
                                <p className="font-bold text-3xl md:text-4xl text-center break-words">{currentCard.front}</p>
                            </div>
                           <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center">
                                {isTypedMode && answerStatus !== 'unanswered' ? (
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <AnswerFeedback userInput={userInput} correctAnswer={currentCard.back} status={answerStatus} />
                                        <div className="mt-4">
                                            <FeedbackIcon status={answerStatus} />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="font-bold text-3xl md:text-4xl text-center break-words">{currentCard.back}</p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {isTypedMode && answerStatus === 'incorrect' && isFlipped && (
                        <div className="absolute bottom-4 text-center opacity-75 transition-opacity duration-300">
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
    );
}


    



    







