import { Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RepetitionPage() {
  const incorrectCount = 18;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline">Repetition</h1>
          <p className="text-muted-foreground">Review terms you've struggled with.</p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
            <Zap className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle>Ready to Practice?</CardTitle>
          <CardDescription>
            You have {incorrectCount} terms marked for repetition from the last 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
                This session will focus on the words you previously answered incorrectly to help reinforce your memory.
            </p>
          <Button size="lg">
            <Clock className="mr-2 h-4 w-4" /> Start Repetition Session
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
