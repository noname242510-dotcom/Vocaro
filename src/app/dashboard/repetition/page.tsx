import { Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RepetitionPage() {
  const incorrectCount = 18;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline">Wiederholung</h1>
          <p className="text-muted-foreground">Überprüfe Begriffe, mit denen du Schwierigkeiten hattest.</p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
            <Zap className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle>Bereit zum Üben?</CardTitle>
          <CardDescription>
            Du hast {incorrectCount} Begriffe zur Wiederholung aus den letzten 7 Tagen markiert.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
                Diese Sitzung konzentriert sich auf die Wörter, die du zuvor falsch beantwortet hast, um dein Gedächtnis zu stärken.
            </p>
          <Button size="lg">
            <Clock className="mr-2 h-4 w-4" /> Wiederholungssitzung starten
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
