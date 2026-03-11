import type { Subject, Stack, VocabularyItem, UserSettings } from '@/lib/types';

export const mockSubjects: Subject[] = [
  { id: '1', name: 'Spanish Vocabulary', emoji: '🇪🇸', stackCount: 3, vocabCount: 150 },
  { id: '2', name: 'Astrophysics', emoji: '🔭', stackCount: 2, vocabCount: 80 },
  { id: '3', name: 'Culinary Terms', emoji: '🍳', stackCount: 4, vocabCount: 200 },
  { id: '4', name: 'React Hooks', emoji: '⚛️', stackCount: 1, vocabCount: 25 },
];

export const mockStacks: Stack[] = [
  { id: 's1-1', subjectId: '1', name: 'Common Verbs', vocabCount: 50, lastStudied: '2 days ago' },
  { id: 's1-2', subjectId: '1', name: 'Food & Dining', vocabCount: 75, lastStudied: 'Yesterday' },
  { id: 's1-3', subjectId: '1', name: 'Travel Phrases', vocabCount: 25, lastStudied: 'A week ago' },
  { id: 's2-1', subjectId: '2', name: 'Stellar Objects', vocabCount: 40, lastStudied: 'Today' },
  { id: 's2-2', subjectId: '2', name: 'Cosmological Theories', vocabCount: 40, lastStudied: '3 days ago' },
  { id: 's3-1', subjectId: '3', name: 'Basic Techniques', vocabCount: 60, lastStudied: null },
  { id: 's3-2', subjectId: '3', name: 'Pastry', vocabCount: 50, lastStudied: '5 days ago' },
  { id: 's3-3', subjectId: '3', name: 'Sauces', vocabCount: 50, lastStudied: 'Yesterday' },
  { id: 's3-4', subjectId: '3', name: 'International Cuisine', vocabCount: 40, lastStudied: null },
  { id: 's4-1', subjectId: '4', name: 'State & Effect Hooks', vocabCount: 25, lastStudied: 'Today' },
];

export const mockVocabulary: Record<string, VocabularyItem[]> = {
  's1-1': [
    { id: 'v1', term: 'Ser', definition: 'To be (permanent)' },
    { id: 'v2', term: 'Estar', definition: 'To be (temporary)' },
    { id: 'v3', term: 'Tener', definition: 'To have' },
    { id: 'v4', term: 'Hacer', definition: 'To do/make' },
    { id: 'v5', term: 'Ir', definition: 'To go' },
  ],
  's2-1': [
    { id: 'v6', term: 'Nebula', definition: 'An interstellar cloud of dust, hydrogen, helium and other ionized gases.' },
    { id: 'v7', term: 'Supernova', definition: 'A powerful and luminous stellar explosion.' },
    { id: 'v8', term: 'Pulsar', definition: 'A highly magnetized rotating neutron star that emits beams of electromagnetic radiation.' },
    { id: 'v9', term: 'Quasar', definition: 'An extremely luminous active galactic nucleus.' },
  ]
};

export const mockSettings: UserSettings = {
  quiz: {
    repetitionTimeframe: '7d',
    enableConfetti: true,
  },
  appearance: {
    font: 'font-body',
    theme: 'dark',
  }
};
