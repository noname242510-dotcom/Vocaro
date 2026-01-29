'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import type { Subject, Stack, VocabularyItem } from '@/lib/types';
import { collection, getDocs, query } from 'firebase/firestore';
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
      const stacksSnapshots = await Promise.all(stacksPromises);
      const stacksData = stacksSnapshots.flatMap(snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id, subjectId: doc.ref.parent.parent!.id } as Stack)));
      setAllStacks(stacksData);
      
      if (stacksData.length > 0) {
        const vocabPromises = stacksData.map(stack => 
          getDocs(collection(firestore, 'users', user.uid, 'subjects', stack.subjectId, 'stacks', stack.id, 'vocabulary'))
        );
        const vocabSnapshots = await Promise.all(vocabPromises);
        const vocabData = vocabSnapshots.flatMap(snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VocabularyItem)));
        setAllVocab(vocabData);
      }
      
      setIsLoading(false);
    };

    fetchDetails();
  }, [subjects, firestore, user]);

  const { totalMastered, aiUsage } = useMemo(() => {
    // Placeholder logic for now
    const aiUsage = allVocab.filter(v => v.source === 'ai').length;
    // For now, mastery is placeholder.
    const totalMastered = Math.floor(allVocab.length * 0.6); 
    return { totalMastered, aiUsage };
  }, [allVocab]);
  
  const readyForTest = useMemo(() => {
    // Placeholder
    return Math.floor(allStacks.length / 3);
  }, [allStacks]);

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
