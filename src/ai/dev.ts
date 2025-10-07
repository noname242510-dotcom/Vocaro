'use client';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-stack-names-from-subject.ts';
import '@/ai/flows/suggest-vocabulary-from-image-context.ts';
import '@/ai/flows/generate-vocabulary-from-extracted-text.ts';
import '@/ai/flows/generate-verb-forms.ts';
