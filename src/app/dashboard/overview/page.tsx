
'use client';

import { useMemo, useEffect, useState } from 'react';
import type { Subject, Stack, VocabularyItem, Verb, LearningSessionVocabulary, LearningSessionVerbAnswer } from '@/lib/types';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { DeckGrid } from './_components/deck-grid';
import { GlobalMetrics } from './_components/global-metrics';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useFirebase } from '@/firebase/provider';


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

      if (fetchedSubjects.length === 0) {
        setIsLoading(false);
        return;
      }
      
      // 2. Fetch all stacks and verbs for all subjects in parallel
      const allStacksAndVerbsPromises = fetchedSubjects.map(subject => {
        const stacksRef = collection(firestore, 'users', user.uid, 'subjects', subject.id, 'stacks');
        const verbsRef = collection(firestore, 'users', user.uid, 'subjects', subject.id, 'verbs');
        return Promise.all([
            getDocs(stacksRef),
            getDocs(verbsRef),
            Promise.resolve(subject.id)
        ]);
      });

      // 3. In parallel, query for recent learning sessions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sessionsQuery = query(
          collection(firestore, 'users', user.uid, 'learningSessions'),
          where('startTime', '>=', Timestamp.fromDate(thirtyDaysAgo)),
          orderBy('startTime', 'desc')
      );
      const sessionsPromise = getDocs(sessionsQuery);

      // Await stacks/verbs and sessions results
      const [stacksAndVerbsResults, sessionsSnapshot] = await Promise.all([
        Promise.all(allStacksAndVerbsPromises),
        sessionsPromise,
      ]);

      const tempStacks: Stack[] = [];
      const tempVerbs: Verb[] = [];
      const allVocabPromises: Promise<VocabularyItem[]>[] = [];

      stacksAndVerbsResults.forEach(([stacksSnapshot, verbsSnapshot, subjectId]) => {
        verbsSnapshot.docs.forEach(doc => {
            tempVerbs.push({ ...doc.data(), id: doc.id, subjectId } as Verb);
        });

        stacksSnapshot.docs.forEach(stackDoc => {
            const stack = { ...stackDoc.data(), id: stackDoc.id, subjectId } as Stack;
            tempStacks.push(stack);
            
            const vocabRef = collection(stackDoc.ref, 'vocabulary');
            const vocabPromise = getDocs(vocabRef).then(vocabSnap => 
                vocabSnap.docs.map(vocabDoc => ({ ...vocabDoc.data(), id: vocabDoc.id, stackId: stack.id } as VocabularyItem))
            );
            allVocabPromises.push(vocabPromise);
        });
      });
      
      // 4. Fetch all vocabulary in parallel
      const allVocabArrays = await Promise.all(allVocabPromises);
      const tempVocab = allVocabArrays.flat();
      
      setAllStacks(tempStacks);
      setAllVerbs(tempVerbs);
      setAllVocab(tempVocab);

      // 5. Process learning session results
      const verbIds = new Set(tempVerbs.map(v => v.id));
      const vocabIds = new Set(tempVocab.map(v => v.id));

      const answerPromises = sessionsSnapshot.docs.map(async (sessionDoc) => {
          const sessionTimestamp = sessionDoc.data().startTime;
          const vocabAnswersRef = collection(sessionDoc.ref, 'vocabulary');
          const verbAnswersRef = collection(sessionDoc.ref, 'verbAnswers');
          
          const [vocabAnswersSnap, verbAnswersSnap] = await Promise.all([
              getDocs(vocabAnswersRef),
              getDocs(verbAnswersRef),
          ]);
          
          const sessionAnswers: EnrichedAnswer[] = [];
          vocabAnswersSnap.forEach((doc) => {
              const answer = doc.data() as LearningSessionVocabulary;
              if (vocabIds.has(answer.vocabularyId)) {
                  sessionAnswers.push({ ...answer, timestamp: sessionTimestamp, type: 'Vokabel' });
              }
          });
          
          verbAnswersSnap.forEach((doc) => {
              const answer = doc.data() as LearningSessionVerbAnswer;
              if (verbIds.has(answer.verbId)) {
                  sessionAnswers.push({ ...answer, timestamp: sessionTimestamp, type: 'Verb' });
              }
          });
          return sessionAnswers;
      });

      const allSessionAnswers = (await Promise.all(answerPromises)).flat();
      setAllEnrichedAnswers(allSessionAnswers);

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
        <h1 className="text-3xl lg:text-4xl font-bold font-headline">Statistiken</h1>
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
