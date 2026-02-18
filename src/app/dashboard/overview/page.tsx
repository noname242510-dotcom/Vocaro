'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import type { Subject, Stack, VocabularyItem, Verb, LearningSessionVocabulary, LearningSessionVerbAnswer } from '@/lib/types';
import { collection, getDocs, query, orderBy, limit, where, collectionGroup } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { GlobalMetrics } from './_components/global-metrics';
import { DeckGrid } from './_components/deck-grid';
import { WeakPointRadar } from './_components/weak-point-radar';

export type WeakPoint = {
  id: string;
  term: string;
  definition: string;
  errorRate: number;
  subjectName: string;
  type: 'Vokabel' | 'Verb';
  subjectId: string;
  language: string;
  // For saving AI notes
  stackId?: string;
};

export default function DashboardOverviewPage() {
  const { firestore, user } = useFirebase();

  const subjectsCollection = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects');
  }, [firestore, user]);

  const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsCollection);

  const [allStacks, setAllStacks] = useState<Stack[]>([]);
  const [allVocab, setAllVocab] = useState<VocabularyItem[]>([]);
  const [allVerbs, setAllVerbs] = useState<Verb[]>([]);
  const [readyForTest, setReadyForTest] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);

  useEffect(() => {
    if (!subjects || !firestore || !user) {
        if (!areSubjectsLoading) setIsLoading(false);
        return;
    }
    if (subjects.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchDetailsAndMetrics = async () => {
      setIsLoading(true);
      
      const subjectDetailsPromises = subjects.map(async (subject) => {
        const stacksCollectionRef = collection(firestore, 'users', user.uid, 'subjects', subject.id, 'stacks');
        const verbsCollectionRef = collection(firestore, 'users', user.uid, 'subjects', subject.id, 'verbs');
        
        const [stacksSnapshot, verbsSnapshot] = await Promise.all([
          getDocs(stacksCollectionRef),
          getDocs(verbsCollectionRef)
        ]);

        const subjectStacks = stacksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, subjectId: subject.id } as Stack));
        const subjectVerbs = verbsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, subjectId: subject.id } as Verb));

        const vocabPromises = subjectStacks.map(stack => 
          getDocs(collection(stacksCollectionRef, stack.id, 'vocabulary'))
            .then(snapshot => snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, stackId: stack.id } as VocabularyItem)))
        );

        const subjectVocabArrays = await Promise.all(vocabPromises);
        const subjectVocab = subjectVocabArrays.flat();
        
        return { subjectStacks, subjectVerbs, subjectVocab };
      });

      const allDetails = await Promise.all(subjectDetailsPromises);
      
      const tempAllStacks = allDetails.flatMap(d => d.subjectStacks);
      const tempAllVerbs = allDetails.flatMap(d => d.subjectVerbs);
      const tempAllVocab = allDetails.flatMap(d => d.subjectVocab);

      setAllStacks(tempAllStacks);
      setAllVerbs(tempAllVerbs);
      setAllVocab(tempAllVocab);

      // --- Metric Calculations ---
      const sessionsQuery = query(collection(firestore, 'users', user.uid, 'learningSessions'), orderBy('startTime', 'desc'));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      // Ready for Test
      if (sessionsSnapshot.docs.length >= 2) {
        const [session1, session2] = sessionsSnapshot.docs;
        const getCorrectIds = async (sessionId: string): Promise<Set<string>> => {
          const correctIds = new Set<string>();
          const vocabAnswersRef = collection(firestore, 'users', user.uid, 'learningSessions', sessionId, 'vocabulary');
          const verbAnswersRef = collection(firestore, 'users', user.uid, 'learningSessions', sessionId, 'verbAnswers');
          const [vocabAnswersSnap, verbAnswersSnap] = await Promise.all([
            getDocs(query(vocabAnswersRef, where('correct', '==', true))),
            getDocs(query(verbAnswersRef, where('correct', '==', true)))
          ]);
          vocabAnswersSnap.forEach(doc => correctIds.add(doc.data().vocabularyId));
          verbAnswersSnap.forEach(doc => correctIds.add(doc.data().practiceItemId));
          return correctIds;
        };
        const [correctInSession1, correctInSession2] = await Promise.all([
          getCorrectIds(session1.id),
          getCorrectIds(session2.id)
        ]);
        const intersection = new Set([...correctInSession1].filter(id => correctInSession2.has(id)));
        setReadyForTest(intersection.size);
      } else {
        setReadyForTest(0);
      }

      // Weak Points
      const answerStats: Map<string, { correct: number; incorrect: number }> = new Map();
      const vocabAnswersQuery = collectionGroup(firestore, 'vocabulary');
      const verbAnswersQuery = collectionGroup(firestore, 'verbAnswers');
      const [vocabAnswersSnap, verbAnswersSnap] = await Promise.all([
        getDocs(query(vocabAnswersQuery, where('userId', '==', user.uid))),
        getDocs(query(verbAnswersQuery, where('userId', '==', user.uid)))
      ]);

      vocabAnswersSnap.forEach(doc => {
        const data = doc.data() as LearningSessionVocabulary;
        const stats = answerStats.get(data.vocabularyId) || { correct: 0, incorrect: 0 };
        data.correct ? stats.correct++ : stats.incorrect++;
        answerStats.set(data.vocabularyId, stats);
      });

      verbAnswersSnap.forEach(doc => {
        const data = doc.data() as LearningSessionVerbAnswer;
        const stats = answerStats.get(data.verbId) || { correct: 0, incorrect: 0 };
        data.correct ? stats.correct++ : stats.incorrect++;
        answerStats.set(data.verbId, stats);
      });
      
      const calculatedWeakPoints: Omit<WeakPoint, 'term' | 'definition' | 'subjectName' | 'language' | 'stackId'>[] = [];
      answerStats.forEach((stats, id) => {
        if (stats.incorrect > 0) {
          const total = stats.correct + stats.incorrect;
          calculatedWeakPoints.push({ id, errorRate: (stats.incorrect / total) * 100 });
        }
      });
      
      const sortedWeakPoints = calculatedWeakPoints.sort((a, b) => b.errorRate - a.errorRate).slice(0, 5);
      
      const enrichedWeakPoints: WeakPoint[] = sortedWeakPoints.map(wp => {
        const vocabItem = tempAllVocab.find(v => v.id === wp.id);
        const verbItem = tempAllVerbs.find(v => v.id === wp.id);
        const item = vocabItem || verbItem;
        const subject = subjects.find(s => s.id === item?.subjectId);
        
        if (!item || !subject) return null;

        return {
          ...wp,
          term: vocabItem ? vocabItem.term : verbItem.infinitive,
          definition: vocabItem ? vocabItem.definition : verbItem.translation,
          subjectName: subject.name,
          language: verbItem?.language || '',
          type: vocabItem ? 'Vokabel' : 'Verb',
          stackId: vocabItem?.stackId,
        };
      }).filter((p): p is WeakPoint => p !== null);

      setWeakPoints(enrichedWeakPoints);

      setIsLoading(false);
    };

    fetchDetailsAndMetrics();
  }, [subjects, firestore, user, areSubjectsLoading]);

  const { totalMastered, vocabAiCount, verbFormsAiCount } = useMemo(() => {
    const vocabAi = allVocab.filter(v => v.source === 'ai').length;
    const verbFormsAi = allVerbs
      .filter(v => v.source === 'ai')
      .reduce((count, verb) => {
        return count + Object.values(verb.forms).reduce((subCount, tense) => subCount + Object.keys(tense).length, 0);
      }, 0);
    const mastered = allVocab.filter(v => v.isMastered).length + allVerbs.filter(v => v.isMastered).length;
    return { totalMastered: mastered, vocabAiCount: vocabAi, verbFormsAiCount: verbFormsAi };
  }, [allVocab, allVerbs]);

  if (areSubjectsLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <GlobalMetrics 
        totalMastered={totalMastered}
        vocabAiCount={vocabAiCount}
        verbFormsAiCount={verbFormsAiCount}
        readyForTest={readyForTest}
      />
      <WeakPointRadar weakPoints={weakPoints} />
      <DeckGrid 
        subjects={subjects || []}
        stacks={allStacks}
        vocab={allVocab}
        verbs={allVerbs}
      />
    </div>
  );
}
    