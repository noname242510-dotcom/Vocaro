import type { Stack } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface DeckCardProps {
  stack: Stack;
  masteryPercentage: number;
  hasVerbs: boolean;
}

export function DeckCard({ stack, masteryPercentage, hasVerbs }: DeckCardProps) {

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
        <Button size="sm" className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          Quick Test <ArrowRight className="ml-2 h-4 w-4"/>
        </Button>
      </CardContent>
    </Card>
  );
}
