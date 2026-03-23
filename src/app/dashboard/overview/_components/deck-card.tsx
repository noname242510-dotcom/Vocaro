'use client';

import type { Stack, Subject, VocabularyItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Preferences } from '@capacitor/preferences';

interface DeckCardProps {
  stack: Stack;
  subject: Subject;
  vocab: VocabularyItem[];
  masteryPercentage: number;
}

export function DeckCard({ stack, subject, vocab, masteryPercentage }: DeckCardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleQuickTest = async () => {
    const nonMasteredVocab = vocab.filter(v => !v.isMastered);

    if (nonMasteredVocab.length > 0) {
      await Preferences.set({ key: 'learn-session-vocab', value: JSON.stringify(nonMasteredVocab.map(v => v.id)) });
      await Preferences.set({ key: 'learn-session-subject', value: subject.id });
      await Preferences.set({ key: 'learn-session-emoji', value: subject.emoji });
      await Preferences.set({ key: 'learn-session-subject-name', value: subject.name });
      router.push('/dashboard/learn');
    } else {
      toast({
        title: "Alles gemeistert!",
        description: `Alle Vokabeln in "${stack.name}" wurden bereits gemeistert.`
      });
    }
  };

  return (
    <Card className="group relative flex flex-col">
      <CardHeader className="flex-grow">
        <CardTitle className="truncate">{stack.name}</CardTitle>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Gemeistert</p>
            <Progress value={masteryPercentage} className="h-1" />
          </div>
        </div>
        <Button 
          size="sm" 
          className="absolute bottom-4 right-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleQuickTest}
        >
          Schnelltest <ArrowRight className="ml-2 h-4 w-4"/>
        </Button>
      </CardContent>
    </Card>
  );
}
