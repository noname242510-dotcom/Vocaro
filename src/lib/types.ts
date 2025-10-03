export type Subject = {
  id: string;
  name: string;
  emoji: string;
  stackCount: number;
  vocabCount: number;
};

export type Stack = {
  id: string;
  name: string;
  subjectId: string;
  vocabCount: number;
  lastStudied: string | null;
};

export type VocabularyItem = {
  id: string;
  term: string;
  definition: string;
};

export type QuizSettings = {
  repetitionTimeframe: '24h' | '7d' | '30d' | 'all';
  enableConfetti: boolean;
};

export type AppearanceSettings = {
  font: 'pt-sans' | 'inter' | 'source-code-pro';
  theme: 'light' | 'dark' | 'system';
};

export type UserSettings = {
  quiz: QuizSettings;
  appearance: AppearanceSettings;
};
