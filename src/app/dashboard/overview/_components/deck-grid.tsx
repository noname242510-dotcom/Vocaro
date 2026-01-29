'use client';
import { useState } from 'react';
import type { Subject, Stack } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeckCard } from './deck-card';

interface DeckGridProps {
  subjects: Subject[];
  stacks: Stack[];
}

export function DeckGrid({ subjects, stacks }: DeckGridProps) {
  if (subjects.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No subjects found. Create a subject to get started.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue={subjects[0].id}>
      <TabsList className="mb-4">
        {subjects.map(subject => (
          <TabsTrigger key={subject.id} value={subject.id}>
            {subject.emoji} {subject.name}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {subjects.map(subject => (
        <TabsContent key={subject.id} value={subject.id}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stacks.filter(stack => stack.subjectId === subject.id).map(stack => (
              <DeckCard key={stack.id} stack={stack} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
