import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Zap } from 'lucide-react';

export function WeakPointRadar() {
  // Placeholder data
  const weakPoints = [
    { id: '1', term: 'Hacer', definition: 'To do/make', subject: 'Spanish' },
    { id: '2', term: 'Pulsar', definition: 'A highly magnetized rotating neutron star...', subject: 'Astrophysics' },
    { id: '3', term: 'Subjonctif Passé', definition: '(Verb tense)', subject: 'French' },
    { id: '4', term: 'useEffect', definition: 'React Hook', subject: 'React' },
    { id: '5', term: 'Estar', definition: 'To be (temporary)', subject: 'Spanish' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-destructive" />
          <CardTitle>Weak Point Radar</CardTitle>
        </div>
        <CardDescription>Your top 5 most frequent mistakes across all subjects.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {weakPoints.map(point => (
            <li key={point.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-semibold">{point.term}</p>
                <p className="text-sm text-muted-foreground">{point.definition} ({point.subject})</p>
              </div>
              <Button size="sm" variant="ghost">
                <Zap className="mr-2 h-4 w-4" />
                AI-Fix
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
