'use client';

import type { Stack, Subject, Verb } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface DeckCardProps {
  stack: Stack;
  subject: Subject;
  verbs: Verb[];
  masteryPercentage: number;
}

export function DeckCard({ stack, subject, verbs, masteryPercentage }: DeckCardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const hasVerbs = verbs.length > 0;

  const handleQuickTest = () => {
    const nonMasteredVerbs = verbs.filter(v => !v.isMastered);

    if (nonMasteredVerbs.length > 0) {
      const practiceData = nonMasteredVerbs.map(v => ({
        ...v,
        selectedTenses: [], // Empty array for infinitive practice
      }));
      sessionStorage.setItem('verb-practice-session', JSON.stringify(practiceData));
      sessionStorage.setItem('verb-practice-subject-id', subject.id);
      sessionStorage.setItem('learn-session-emoji', subject.emoji);
      sessionStorage.setItem('learn-session-subject-name', subject.name);
      router.push('/dashboard/learn/verbs');
    } else {
      toast({
        title: "Alles gemeistert!",
        description: `Alle Verben in "${subject.name}" wurden bereits gemeistert.`
      });
    }
  };

  return (
    <Card className="group relative">
      <CardHeader>
        <CardTitle className="truncate">{stack.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Mastery</p>
            <Progress value={masteryPercentage} className="h-1" />
          </div>
          {hasVerbs && (
             <Badge variant="outline">[V] Verbs</Badge>
          )}
        </div>
        <Button 
          size="sm" 
          className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleQuickTest}
        >
          Quick Test <ArrowRight className="ml-2 h-4 w-4"/>
        </Button>
      </CardContent>
    </Card>
  );
}
