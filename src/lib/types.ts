

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
  stackId: string;
  term: string;
  definition: string;
  phonetic?: string;
  relatedWord?: {
    language: string;
    word: string;
  } | null;
  notes?: string;
  isMastered?: boolean;
  isSelected?: boolean;
  source?: 'ai' | 'manual';
};

export type VerbTense = {
  [pronoun: string]: string;
};

export type Verb = {
  id:string;
  subjectId: string;
  infinitive: string;
  language: string;
  translation: string;
  forms: {
    [tense: string]: VerbTense;
  };
  germanForms?: {
    [tense: string]: VerbTense;
  };
  isSelected?: boolean;
  selectedTenses?: Set<string>;
};

export type QuizSettings = {
  repetitionTimeframe: '24h' | '7d' | '30d' | 'all';
  enableConfetti: boolean;
};

export type AppearanceSettings = {
  font: 'font-body' | 'font-creative' | 'font-code';
  theme: 'light' | 'dark' | 'system';
};

export type UserSettings = {
  quiz: QuizSettings;
  appearance: AppearanceSettings;
};

// Passkey Authenticator-Struktur für Firestore
export type Authenticator = {
    credentialID: string;
    credentialPublicKey: string;
    counter: number;
    transports?: AuthenticatorTransport[];
}

    