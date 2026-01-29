import { BrainCircuit, Bot, ShieldCheck } from 'lucide-react';

interface GlobalMetricsProps {
  totalMastered: number;
  aiUsage: number;
  readyForTest: number;
}

export function GlobalMetrics({ totalMastered, aiUsage, readyForTest }: GlobalMetricsProps) {
  const metrics = [
    { label: 'Total Mastered', value: totalMastered, icon: BrainCircuit },
    { label: 'AI Usage', value: `${aiUsage} words`, icon: Bot },
    { label: 'Ready for Test', value: readyForTest, icon: ShieldCheck },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 text-center">
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
