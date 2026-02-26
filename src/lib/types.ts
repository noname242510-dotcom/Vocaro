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
  aiNote?: string;
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
  aiNote?: string;
  isMastered?: boolean;
  isSelected?: boolean;
  selectedTenses?: Set<string>;
  source?: 'ai' | 'manual';
};

export type GenerateVerbFormsOutput = Omit<Verb, 'id' | 'subjectId' | 'language'>;

export type UserSettings = {
  id: string;
  font: 'font-body' | 'font-creative' | 'font-code';
  enableConfetti: boolean;
  hapticFeedback: boolean;
  ttsEnabled: boolean;
  ttsAutoplay: boolean;
  vocabQueryDirection: boolean; // true: definition first
  vocabShowHints: boolean;
  vocabOverviewDirection: 'term' | 'definition';
  verbQueryDirection: boolean; // true: definition first
  verbShowHints: boolean;
  darkMode: boolean;
};

export type LearningSessionVocabulary = {
  id: string;
  learningSessionId: string;
  vocabularyId: string;
  correct: boolean;
};

export type LearningSessionVerbAnswer = {
  id: string;
  learningSessionId: string;
  practiceItemId: string;
  verbId: string;
  correct: boolean;
};

export type PublicProfile = {
    id: string;
    displayName: string;
    photoURL?: string;
    subjectCount?: number;
    vocabCount?: number;
    verbCount?: number;
    createdAt: any; // server timestamp
};

export type Friendship = {
    id: string;
    requesterId: string;
    recipientId: string;
    status: 'pending' | 'accepted';
    createdAt: any; // server timestamp
}

export type EnrichedFriendship = Friendship & {
    displayName: string;
    photoURL?: string;
};

export type Group = {
    id: string;
    name: string;
    createdBy: string;
    createdAt: any; // server timestamp
    memberCount?: number;
}

export type GroupMember = {
    id: string;
    displayName: string;
    photoURL?: string;
}

export type GroupInvitation = {
    id: string;
    groupId: string;
    groupName: string;
    inviterId: string;
    inviterName: string;
    recipientId: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: any; // server timestamp
}

export type GroupActivity = {
    id: string;
    userId: string;
    correctCount: number;
    incorrectCount: number;
    timestamp: any; // server timestamp
}