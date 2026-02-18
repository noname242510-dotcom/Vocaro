'use client';
import type { Subject, Stack, VocabularyItem, Verb } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeckCard } from './deck-card';
import { Card } from '@/components/ui/card';
import { Book, WholeWord } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface DeckGridProps {
  subjects: Subject[];
  stacks: Stack[];
  vocab: VocabularyItem[];
  verbs: Verb[];
}

export function DeckGrid({ subjects, stacks, vocab, verbs }: DeckGridProps) {
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
        <TabsList className="mb-4 h-auto py-2">
            {subjects.map(subject => (
            <TabsTrigger key={subject.id} value={subject.id} className="text-base px-4">
                {subject.emoji} {subject.name}
            </TabsTrigger>
            ))}
        </TabsList>
        
        {subjects.map(subject => {
            const stacksForSubject = stacks.filter(stack => stack.subjectId === subject.id);
            const stackIdsForSubject = new Set(stacksForSubject.map(s => s.id));
            const vocabForSubject = vocab.filter(v => stackIdsForSubject.has(v.stackId));
            const masteredVocabCount = vocabForSubject.filter(v => v.isMastered).length;

            const verbsForSubject = verbs.filter(v => v.subjectId === subject.id);
            const masteredVerbsCount = verbsForSubject.filter(v => v.isMastered).length;

            return (
                <TabsContent key={subject.id} value={subject.id}>
                <div className="grid gap-4 sm:grid-cols-2 mb-4">
                    <Card className="p-4 flex items-center gap-4">
                        <Book className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Vokabeln</p>
                            <p className="text-2xl font-semibold">{vocabForSubject.length}</p>
                            <p className="text-xs text-muted-foreground">{masteredVocabCount} gemeistert</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4">
                        <WholeWord className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Verben</p>
                            <p className="text-2xl font-semibold">{verbsForSubject.length}</p>
                            <p className="text-xs text-muted-foreground">{masteredVerbsCount} gemeistert</p>
                        </div>
                    </Card>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {stacksForSubject.map(stack => {
                    const vocabForStack = vocab.filter(v => v.stackId === stack.id);
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
                </TabsContent>
            )
        })}
        </Tabs>
    </div>
  );
}
