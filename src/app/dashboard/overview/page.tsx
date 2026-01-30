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
      
      setAllStacks(allDetails.flatMap(d => d.subjectStacks));
      setAllVerbs(allDetails.flatMap(d => d.subjectVerbs));
      setAllVocab(allDetails.flatMap(d => d.subjectVocab));

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
        vocab={allVocab}
        verbs={allVerbs}
      />
      <WeakPointRadar />
    </div>
  );
}

    