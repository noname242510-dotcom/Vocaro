import { ReactNode } from 'react';

interface SectionShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function SectionShell({ title, description, children }: SectionShellProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold font-headline">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}