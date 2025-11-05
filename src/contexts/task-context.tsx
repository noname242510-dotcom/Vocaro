'use client';

import React, { createContext, useState, ReactNode, useCallback } from 'react';
import type { GenerateVerbFormsOutput } from '@/ai/flows/generate-verb-forms';

type TaskResult = GenerateVerbFormsOutput | { [key: string]: any } | null;

interface TaskState {
  isRunning: boolean;
  taskName: string | null;
  progress: number;
  error: Error | null;
}

interface TaskRunnerOptions<T> {
  name: string;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
}

interface TaskContextType extends TaskState {
  runTask: <T>(
    task: () => Promise<T>,
    options: TaskRunnerOptions<T>
  ) => void;
}

export const TaskContext = createContext<TaskContextType>({
  isRunning: false,
  taskName: null,
  progress: 0,
  error: null,
  runTask: () => {
    throw new Error('runTask function must be overridden by TaskProvider');
  },
});

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider = ({ children }: TaskProviderProps) => {
  const [taskState, setTaskState] = useState<TaskState>({
    isRunning: false,
    taskName: null,
    progress: 0,
    error: null,
  });

  const runTask = useCallback(
    async <T,>(task: () => Promise<T>, options: TaskRunnerOptions<T>) => {
      if (taskState.isRunning) {
        console.warn('Ein anderer Task wird bereits ausgeführt.');
        return;
      }

      setTaskState({
        isRunning: true,
        taskName: options.name,
        progress: 0,
        error: null,
      });

      try {
        const result = await task();
        setTaskState(prev => ({ ...prev, progress: 100 }));
        options.onSuccess?.(result);
        
        setTimeout(() => {
          setTaskState(prev => ({ ...prev, isRunning: false, taskName: null, progress: 0, error: null }));
        }, 3000);

      } catch (error: any) {
        setTaskState(prev => ({ ...prev, error, isRunning: false }));
        options.onError?.(error);
        
        setTimeout(() => {
            setTaskState(prev => ({ ...prev, isRunning: false, taskName: null, progress: 0, error: null }));
        }, 5000);

      } finally {
        options.onFinally?.();
      }
    },
    [taskState.isRunning]
  );

  return (
    <TaskContext.Provider value={{ ...taskState, runTask }}>
      {children}
    </TaskContext.Provider>
  );
};
