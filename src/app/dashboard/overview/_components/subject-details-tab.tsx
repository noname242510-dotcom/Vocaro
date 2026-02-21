'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/firebase/provider';
import type { Subject, Stack, VocabularyItem, Verb, LearningSessionVocabulary, LearningSessionVerbAnswer } from '@/lib/types';
import { DeckCard } from './deck-card';
import { Card } from '@/components/ui/card';
import { Book, WholeWord, Star, Target } from 'lucide-react';
import { WeakPointRadar, WeakPoint } from './weak-point-radar';
import { updateDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


type EnrichedAnswer = (LearningSessionVocabulary | LearningSessionVerbAnswer) & { timestamp: any, type: 'Vokabel' | 'Verb' };

const germanPronounMap: Record<string, string> = {
    "ich": "ich", "du": "du", "er/sie/es": "er/sie/es", "wir": "wir", "ihr": "ihr", "sie/Sie": "sie/Sie",
    "I": "ich", "you": "du", "he/she/it": "er/sie/es", "we": "wir", "they": "sie",
    "je": "ich", "j'": "ich", "tu": "du", "il/elle/on": "er/sie/es", "nous": "wir", "vous": "ihr", "ils/elles": "sie",
    "form": "form", "(tu)": "(du)", "(nous)": "(wir)", "(vous)": "(ihr)",
};

interface SubjectDetailsTabProps {
    subject: Subject;
    stacks: Stack[];
    vocab: VocabularyItem[];
    verbs: Verb[];
    enrichedAnswers: EnrichedAnswer[];
}

export function SubjectDetailsTab({ subject, stacks, vocab, verbs, enrichedAnswers }: SubjectDetailsTabProps) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [localVocab, setLocalVocab] = useState(vocab);
    const [localVerbs, setLocalVerbs] = useState(verbs);

    useEffect(() => {
        setLocalVocab(vocab);
    }, [vocab]);

    useEffect(() => {
        setLocalVerbs(verbs);
    }, [verbs]);

    const handleAiNoteUpdate = async (itemId: string, newNote: string, itemType: 'Vokabel' | 'Verb', stackId?: string, verbId?: string) => {
        if (!user || !firestore) return;
    
        let docRef;
        if (itemType === 'Vokabel' && stackId) {
          docRef = doc(firestore, 'users', user.uid, 'subjects', subject.id, 'stacks', stackId, 'vocabulary', itemId);
        } else if (itemType === 'Verb' && verbId) {
          docRef = doc(firestore, 'users', user.uid, 'subjects', subject.id, 'verbs', verbId);
        } else {
          return;
        }
    
        try {
          await updateDoc(docRef, { aiNote: newNote });
          toast({ title: 'Gespeichert!', description: 'Der KI-Tipp wurde gespeichert.'});
          
          // Optimistic local update
          if (itemType === 'Vokabel') {
            setLocalVocab(prev => prev.map(v => v.id === itemId ? { ...v, aiNote: newNote } : v));
          } else {
            setLocalVerbs(prev => prev.map(v => (v.id === verbId || itemId.startsWith(v.id + '-')) ? { ...v, aiNote: newNote } : v));
          }
        } catch (e) {
          console.error(e);
          toast({ variant: 'destructive', title: 'Fehler', description: 'Der Tipp konnte nicht gespeichert werden.'});
        }
      };


    const subjectWeakPoints = useMemo(() => {
        const answerStats: Map<string, { correct: number; incorrect: number; lastErrorTimestamp: any | null }> = new Map();

        enrichedAnswers.forEach((answer) => {
            const id = answer.type === 'Vokabel' ? (answer as LearningSessionVocabulary).vocabularyId : (answer as LearningSessionVerbAnswer).practiceItemId;
            const stats = answerStats.get(id) || { correct: 0, incorrect: 0, lastErrorTimestamp: null };

            if (answer.correct) {
                stats.correct++;
            } else {
                stats.incorrect++;
                if (!stats.lastErrorTimestamp || answer.timestamp > stats.lastErrorTimestamp) {
                    stats.lastErrorTimestamp = answer.timestamp;
                }
            }
            answerStats.set(id, stats);
        });

        const calculatedWeakPoints: { id: string; errorRate: number; lastErrorTimestamp: any }[] = [];
        answerStats.forEach((stats, id) => {
            if (stats.incorrect > 0) {
                const total = stats.correct + stats.incorrect;
                calculatedWeakPoints.push({ 
                    id, 
                    errorRate: (stats.incorrect / total) * 100, 
                    lastErrorTimestamp: stats.lastErrorTimestamp 
                });
            }
        });

        const sortedWeakPoints = calculatedWeakPoints.sort((a, b) => {
            if (b.errorRate !== a.errorRate) {
                return b.errorRate - a.errorRate;
            }
            if (a.lastErrorTimestamp && b.lastErrorTimestamp) {
                return b.lastErrorTimestamp.toMillis() - a.lastErrorTimestamp.toMillis();
            }
            if (b.lastErrorTimestamp) return 1;
            if (a.lastErrorTimestamp) return -1;
            return 0;
        }).slice(0, 5);

        const enrichedPoints: WeakPoint[] = sortedWeakPoints.map(wp => {
            const vocabItem = localVocab.find(v => v.id === wp.id);
            if (vocabItem) {
                return {
                    id: wp.id, errorRate: wp.errorRate, term: vocabItem.term, definition: vocabItem.definition,
                    subjectName: subject.name, language: '', type: 'Vokabel', stackId: vocabItem.stackId,
                    subjectId: subject.id, aiNote: vocabItem.aiNote
                };
            }

            const [verbId, tense, pronoun] = wp.id.split('-');
            if (!verbId) return null;
            const verbItem = localVerbs.find(v => v.id === verbId);
            if (!verbItem) return null;
            
            if (tense === 'infinitive') {
                return {
                    id: wp.id, verbId: verbId, errorRate: wp.errorRate, term: verbItem.infinitive,
                    definition: verbItem.translation, subjectName: subject.name, language: verbItem.language,
                    type: 'Verb', subjectId: subject.id, aiNote: verbItem.aiNote
                };
            }

            const foreignForm = verbItem.forms?.[tense]?.[pronoun];
            const germanPronoun = germanPronounMap[pronoun] || pronoun;
            const germanForm = verbItem.germanForms?.[tense]?.[germanPronoun];
            if (!foreignForm || !germanForm) return null;

            return {
                id: wp.id, verbId: verbId, errorRate: wp.errorRate,
                term: `${pronoun.startsWith('(') ? '' : pronoun + ' '}${foreignForm}`.trim(),
                definition: `${germanPronoun.startsWith('(') ? '' : germanPronoun + ' '}${germanForm}`.trim(),
                subjectName: subject.name, language: verbItem.language, type: 'Verb',
                subjectId: subject.id, aiNote: verbItem.aiNote
            };
        }).filter((p): p is WeakPoint => p !== null);
        
        return enrichedPoints;
    }, [enrichedAnswers, localVocab, localVerbs, subject.name, subject.id]);


    const masteredVocabCount = localVocab.filter(v => v.isMastered).length;
    const masteredVerbsCount = localVerbs.filter(v => v.isMastered).length;
    const totalItems = localVocab.length + localVerbs.length;
    const totalMastered = masteredVocabCount + masteredVerbsCount;
    const overallMasteryPercentage = totalItems > 0 ? (totalMastered / totalItems) * 100 : 0;
    
    return (
        <>
            <Card className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                        <Book className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-2xl font-bold">{localVocab.length}</p>
                        <p className="text-sm text-muted-foreground">Vokabeln</p>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <WholeWord className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-2xl font-bold">{localVerbs.length}</p>
                        <p className="text-sm text-muted-foreground">Verben</p>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <Star className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-2xl font-bold">{totalMastered}</p>
                        <p className="text-sm text-muted-foreground">Gemeistert</p>
                    </div>
                     <div className="flex flex-col items-center justify-center">
                        <Target className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-2xl font-bold">{Math.round(overallMasteryPercentage)}%</p>
                        <p className="text-sm text-muted-foreground">Fortschritt</p>
                    </div>
                </div>
            </Card>
            
            <WeakPointRadar weakPoints={subjectWeakPoints} onUpdate={handleAiNoteUpdate} />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {stacks.map(stack => {
                    const vocabForStack = localVocab.filter(v => v.stackId === stack.id);
                    const masteredInStack = vocabForStack.filter(v => v.isMastered).length;
                    const masteryPercentage = vocabForStack.length > 0 ? (masteredInStack / vocabForStack.length) * 100 : 0;
                    
                    return (
                        <DeckCard 
                            key={stack.id} 
                            stack={stack}
                            subject={subject}
                            vocab={vocabForStack}
                            masteryPercentage={masteryPercentage}
                        />
                    );
                })}
            </div>
        </>
    );
}
