'use client';

import React, { createContext, useState, ReactNode, useCallback } from 'react';
import type { GenerateVerbFormsOutput } from '@/ai/flows/generate-verb-forms';

type TaskResult = GenerateVerbFormsOutput | { [key: string]: any } | null;

interface TaskState {
  isRunning: boolean;
  taskName: string | null;
  progress: number;
  error: Error | null;
  taskResult: TaskResult;
  taskType: string | null;
  taskContext: { [key: string]: any } | null;
}

interface TaskRunnerOptions<T> {
  name: string;
  type?: string;
  context?: { [key: string]: any };
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
}

interface TaskContextType extends TaskState {
  runTask: <T>(
    task: () => Promise<T>,
    options: TaskRunnerOptions<T>
  ) => void;
  clearTaskResult: () => void;
}

export const TaskContext = createContext<TaskContextType>({
  isRunning: false,
  taskName: null,
  progress: 0,
  error: null,
  taskResult: null,
  taskType: null,
  taskContext: null,
  runTask: () => {
    throw new Error('runTask function must be overridden by TaskProvider');
  },
  clearTaskResult: () => {
    throw new Error('clearTaskResult function must be overridden by TaskProvider');
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
    taskResult: null,
    taskType: null,
    taskContext: null,
  });

  const clearTaskResult = useCallback(() => {
    setTaskState(prev => ({ ...prev, taskResult: null, taskType: null, taskContext: null }));
  }, []);

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
        taskResult: null,
        taskType: options.type || null,
        taskContext: options.context || null,
      });

      try {
        const result = await task();
        setTaskState(prev => ({ ...prev, progress: 100, taskResult: result as TaskResult }));
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
    <TaskContext.Provider value={{ ...taskState, runTask, clearTaskResult }}>
      {children}
    </TaskContext.Provider>
  );
};
