import { Star, Book, WholeWord, ShieldCheck } from 'lucide-react';

interface GlobalMetricsProps {
  totalMastered: number;
  vocabAiCount: number;
  verbFormsAiCount: number;
  readyForTest: number;
}

export function GlobalMetrics({ totalMastered, vocabAiCount, verbFormsAiCount, readyForTest }: GlobalMetricsProps) {
  const metrics = [
    { label: 'Insgesamt gemeistert', value: totalMastered, icon: Star },
    { label: 'Bereit für den Test', value: readyForTest, icon: ShieldCheck },
    { label: 'Vokabeln (KI-erstellt)', value: vocabAiCount, icon: Book },
    { label: 'Verbformen (KI-generiert)', value: verbFormsAiCount, icon: WholeWord },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
      {metrics.map(metric => (
        <div key={metric.label} className="flex flex-col items-center justify-center p-4 bg-card rounded-2xl">
          <metric.icon className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
          <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
        </div>
      ))}
    </div>
  );
}
