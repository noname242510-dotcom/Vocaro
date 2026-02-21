'use client';

import { useMemo, useEffect, useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import type { Subject, Stack, VocabularyItem, Verb, LearningSessionVocabulary, LearningSessionVerbAnswer } from '@/lib/types';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { DeckGrid } from './_components/deck-grid';
import { GlobalMetrics } from './_components/global-metrics';
import { LoadingSpinner } from '@/components/loading-spinner';

type EnrichedAnswer = (LearningSessionVocabulary | LearningSessionVerbAnswer) & { timestamp: any, type: 'Vokabel' | 'Verb' };

export default function DashboardOverviewPage() {
  const { firestore, user } = useFirebase();
  const [isLoading, setIsLoading] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allStacks, setAllStacks] = useState<Stack[]>([]);
  const [allVocab, setAllVocab] = useState<VocabularyItem[]>([]);
  const [allVerbs, setAllVerbs] = useState<Verb[]>([]);
  const [allEnrichedAnswers, setAllEnrichedAnswers] = useState<EnrichedAnswer[]>([]);
  
  useEffect(() => {
    if (!user || !firestore) return;

    const fetchAllData = async () => {
      setIsLoading(true);

      // 1. Fetch Subjects
      const subjectsQuery = query(collection(firestore, 'users', user.uid, 'subjects'), orderBy('name'));
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const fetchedSubjects = subjectsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Subject));
      setSubjects(fetchedSubjects);

      const allDataPromises = fetchedSubjects.map(async (subject) => {
        // 2. Fetch Stacks, Verbs, Vocab for each subject
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

        return { subject, subjectStacks, subjectVerbs, subjectVocab };
      });
      
      const allSubjectData = await Promise.all(allDataPromises);

      const tempStacks: Stack[] = [];
      const tempVocab: VocabularyItem[] = [];
      const tempVerbs: Verb[] = [];
      allSubjectData.forEach(data => {
        tempStacks.push(...data.subjectStacks);
        tempVocab.push(...data.subjectVocab);
        tempVerbs.push(...data.subjectVerbs);
      });

      setAllStacks(tempStacks);
      setAllVocab(tempVocab);
      setAllVerbs(tempVerbs);

      // 3. Fetch Learning Session Data (optimized to last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sessionsQuery = query(
          collection(firestore, 'users', user.uid, 'learningSessions'),
          where('startTime', '>=', Timestamp.fromDate(thirtyDaysAgo)),
          orderBy('startTime', 'desc')
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      const tempAnswers: EnrichedAnswer[] = [];
      const verbIdsForSubject = new Set(tempVerbs.map(v => v.id));
      const vocabIdsForSubject = new Set(tempVocab.map(v => v.id));

      for (const sessionDoc of sessionsSnapshot.docs) {
          const sessionTimestamp = sessionDoc.data().startTime;
          
          const vocabAnswersRef = collection(sessionDoc.ref, 'vocabulary');
          const verbAnswersRef = collection(sessionDoc.ref, 'verbAnswers');
          
          const [vocabAnswersSnap, verbAnswersSnap] = await Promise.all([
              getDocs(vocabAnswersRef),
              getDocs(verbAnswersRef),
          ]);

          vocabAnswersSnap.forEach((doc) => {
              const answer = doc.data() as LearningSessionVocabulary;
              if (vocabIdsForSubject.has(answer.vocabularyId)) {
                  tempAnswers.push({ ...answer, timestamp: sessionTimestamp, type: 'Vokabel' });
              }
          });
          
          verbAnswersSnap.forEach((doc) => {
              const answer = doc.data() as LearningSessionVerbAnswer;
              if (verbIdsForSubject.has(answer.verbId)) {
                  tempAnswers.push({ ...answer, timestamp: sessionTimestamp, type: 'Verb' });
              }
          });
      }
      setAllEnrichedAnswers(tempAnswers);

      setIsLoading(false);
    };

    fetchAllData();

  }, [user, firestore]);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      // Show spinner only if loading takes more than 300ms
      timer = setTimeout(() => {
        setShowSpinner(true);
      }, 300);
    } else {
      setShowSpinner(false);
    }

    return () => clearTimeout(timer);
  }, [isLoading]);

  const metrics = useMemo(() => {
    const totalMasteredVocab = allVocab.filter(v => v.isMastered).length;
    const totalMasteredVerbs = allVerbs.filter(v => v.isMastered).length;
    const totalMastered = totalMasteredVocab + totalMasteredVerbs;

    const vocabAiCount = allVocab.filter(v => v.source === 'ai').length;
    const verbFormsAiCount = allVerbs.filter(v => v.source === 'ai').length;
    
    const readyForTest = allVocab.filter(v => !v.isMastered).length;

    return { totalMastered, vocabAiCount, verbFormsAiCount, readyForTest };
  }, [allVocab, allVerbs]);

  if (showSpinner) {
    return (
      <div className="absolute inset-0 flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isLoading) {
    return null; // Render nothing for the first 300ms to avoid flicker
  }

  return (
    <div className="space-y-8">
      <div className="text-center my-4 md:my-8">
        <h1 className="text-3xl lg:text-4xl font-bold font-headline">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Daten der letzten 30 Tage</p>
      </div>
      <GlobalMetrics {...metrics} />
      <DeckGrid 
        subjects={subjects || []}
        allStacks={allStacks}
        allVocab={allVocab}
        allVerbs={allVerbs}
        allEnrichedAnswers={allEnrichedAnswers}
      />
    </div>
  );
}
