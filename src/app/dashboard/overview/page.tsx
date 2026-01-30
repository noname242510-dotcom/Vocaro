'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import type { Subject, Stack, VocabularyItem, Verb } from '@/lib/types';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { GlobalMetrics } from './_components/global-metrics';
import { DeckGrid } from './_components/deck-grid';
import { WeakPointRadar } from './_components/weak-point-radar';

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

  useEffect(() => {
    if (!subjects || !firestore || !user) return;
    if (subjects.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      
      const stacksPromises = subjects.map(subject => 
        getDocs(collection(firestore, 'users', user.uid, 'subjects', subject.id, 'stacks'))
      );
      const verbsPromises = subjects.map(subject =>
        getDocs(collection(firestore, 'users', user.uid, 'subjects', subject.id, 'verbs'))
      );

      const [stacksSnapshots, verbsSnapshots] = await Promise.all([
          Promise.all(stacksPromises),
          Promise.all(verbsPromises)
      ]);

      const stacksData = stacksSnapshots.flatMap(snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id, subjectId: doc.ref.parent.parent!.id } as Stack)));
      setAllStacks(stacksData);
      
      const verbsData = verbsSnapshots.flatMap(snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Verb)));
      setAllVerbs(verbsData);
      
      if (stacksData.length > 0) {
        const vocabPromises = stacksData.map(stack => 
          getDocs(collection(firestore, 'users', user.uid, 'subjects', stack.subjectId, 'stacks', stack.id, 'vocabulary'))
        );
        const vocabSnapshots = await Promise.all(vocabPromises);
        const vocabData = vocabSnapshots.flatMap(snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VocabularyItem)));
        setAllVocab(vocabData);
      } else {
        setAllVocab([]);
      }
      
      setIsLoading(false);
    };

    const calculateReadyForTest = async () => {
      const sessionsRef = collection(firestore, 'users', user.uid, 'learningSessions');
      const q = query(sessionsRef, orderBy('startTime', 'desc'), limit(2));
      const sessionsSnapshot = await getDocs(q);

      if (sessionsSnapshot.docs.length < 2) {
          setReadyForTest(0);
          return;
      }

      const [session1, session2] = sessionsSnapshot.docs;
      const session1Id = session1.id;
      const session2Id = session2.id;
      
      const getCorrectIds = async (sessionId: string): Promise<Set<string>> => {
          const correctIds = new Set<string>();

          const vocabAnswersRef = collection(firestore, 'users', user.uid, 'learningSessions', sessionId, 'vocabulary');
          const vocabAnswersSnap = await getDocs(query(vocabAnswersRef, where('correct', '==', true)));
          vocabAnswersSnap.forEach(doc => correctIds.add(doc.data().vocabularyId));

          const verbAnswersRef = collection(firestore, 'users', user.uid, 'learningSessions', sessionId, 'verbAnswers');
          const verbAnswersSnap = await getDocs(query(verbAnswersRef, where('correct', '==', true)));
          verbAnswersSnap.forEach(doc => correctIds.add(doc.data().practiceItemId));

          return correctIds;
      };

      const [correctInSession1, correctInSession2] = await Promise.all([
          getCorrectIds(session1Id),
          getCorrectIds(session2Id)
      ]);
      
      const intersection = new Set([...correctInSession1].filter(id => correctInSession2.has(id)));
      
      setReadyForTest(intersection.size);
  };


    fetchDetails();
    calculateReadyForTest();
  }, [subjects, firestore, user]);

  const { totalMastered, aiUsage } = useMemo(() => {
    const vocabAiUsage = allVocab.filter(v => v.source === 'ai').length;
    const verbAiUsage = allVerbs.filter(v => v.source === 'ai').length;
    const aiUsage = vocabAiUsage + verbAiUsage;
    const totalMastered = allVocab.filter(v => v.isMastered).length;
    return { totalMastered, aiUsage };
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
        aiUsage={aiUsage}
        readyForTest={readyForTest}
      />
      <DeckGrid 
        subjects={subjects || []}
        stacks={allStacks}
      />
      <WeakPointRadar />
    </div>
  );
}

    