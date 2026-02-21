'use client';
import type { Subject, Stack, VocabularyItem, Verb, LearningSessionVocabulary, LearningSessionVerbAnswer } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { SubjectDetailsTab } from './subject-details-tab';

type EnrichedAnswer = (LearningSessionVocabulary | LearningSessionVerbAnswer) & { timestamp: any, type: 'Vokabel' | 'Verb' };

interface DeckGridProps {
  subjects: Subject[];
  allStacks: Stack[];
  allVocab: VocabularyItem[];
  allVerbs: Verb[];
  allEnrichedAnswers: EnrichedAnswer[];
}

export function DeckGrid({ subjects, allStacks, allVocab, allVerbs, allEnrichedAnswers }: DeckGridProps) {
  if (subjects.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Keine Fächer gefunden. Erstelle ein Fach, um zu beginnen.</p>
      </div>
    );
  }

  return (
    <div>
      <Separator className="mb-4" />
      <Tabs defaultValue={subjects.length > 0 ? subjects[0].id : undefined}>
        <div className="flex justify-center">
          <TabsList className="mb-4 h-auto p-1 w-full max-w-3xl text-center rounded-full bg-muted">
            {subjects.map(subject => (
              <TabsTrigger key={subject.id} value={subject.id} className="text-xl px-8 py-3 flex-1 rounded-full data-[state=active]:bg-background">
                {subject.emoji} {subject.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      
        {subjects.map(subject => {
            const subjectStacks = allStacks.filter(s => s.subjectId === subject.id);
            const subjectVocab = allVocab.filter(v => subjectStacks.some(s => s.id === v.stackId));
            const subjectVerbs = allVerbs.filter(v => v.subjectId === subject.id);
            const verbIdsForSubject = new Set(subjectVerbs.map(v => v.id));
            const vocabIdsForSubject = new Set(subjectVocab.map(v => v.id));
            const subjectAnswers = allEnrichedAnswers.filter(answer => 
                (answer.type === 'Vokabel' && vocabIdsForSubject.has((answer as LearningSessionVocabulary).vocabularyId)) ||
                (answer.type === 'Verb' && verbIdsForSubject.has((answer as LearningSessionVerbAnswer).verbId))
            );

            return (
              <TabsContent key={subject.id} value={subject.id} className="space-y-6">
                <SubjectDetailsTab 
                    subject={subject}
                    stacks={subjectStacks}
                    vocab={subjectVocab}
                    verbs={subjectVerbs}
                    enrichedAnswers={subjectAnswers}
                />
              </TabsContent>
            );
        })}
      </Tabs>
    </div>
  );
}
