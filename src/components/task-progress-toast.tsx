'use client';

import { useContext } from 'react';
import { TaskContext } from '@/contexts/task-context';
import { Button } from './ui/button';
import { Loader2, Check, AlertTriangle } from 'lucide-react';

export function TaskProgressToast() {
  const { isRunning, taskName, error, progress } = useContext(TaskContext);

  if (!isRunning) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-sm z-50 p-4">
      <div className="bg-background border shadow-lg rounded-2xl p-4 flex items-center gap-4">
        <div className="flex-shrink-0">
          {error ? (
            <AlertTriangle className="h-6 w-6 text-destructive" />
          ) : progress === 100 ? (
            <Check className="h-6 w-6 text-green-500" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin" />
          )}
        </div>
        <div className="flex-grow overflow-hidden">
          <p className="font-semibold truncate">{taskName}</p>
          <p className="text-sm text-muted-foreground truncate">
            {error ? 'Ein Fehler ist aufgetreten.' : 'Wird im Hintergrund ausgeführt...'}
          </p>
        </div>
      </div>
    </div>
  );
}
