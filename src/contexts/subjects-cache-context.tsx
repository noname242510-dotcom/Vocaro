'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { Subject, Stack, VocabularyItem } from '@/lib/types';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export type StackWithVocab = Stack & { vocabulary: VocabularyItem[] };
export type SubjectWithStacks = Subject & { stacks: StackWithVocab[] };

interface SubjectsCacheContextValue {
    /** Cached subjects (with stacks + vocabulary) – null means not yet loaded */
    subjects: SubjectWithStacks[] | null;
    /** True while the initial fetch is in progress */
    isLoading: boolean;
    /** Manually trigger a full refresh (e.g., after adding a new subject/stack) */
    refresh: () => Promise<void>;
    /** Invalidate (clear) the cache – next consumer will trigger a re-fetch */
    invalidate: () => void;
}

const SubjectsCacheContext = createContext<SubjectsCacheContextValue | null>(null);

// ------------------------------------------------------------------
// Provider
// ------------------------------------------------------------------
export function SubjectsCacheProvider({ children }: { children: React.ReactNode }) {
    const { firestore, user } = useFirebase();
    const [subjects, setSubjects] = useState<SubjectWithStacks[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const isFetchingRef = useRef(false);

    const fetchAll = useCallback(async () => {
        if (!firestore || !user) return;
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setIsLoading(true);

        try {
            const subjectsSnap = await getDocs(
                collection(firestore, 'users', user.uid, 'subjects')
            );

            const all: SubjectWithStacks[] = await Promise.all(
                subjectsSnap.docs.map(async (subjDoc) => {
                    const subject = { ...subjDoc.data(), id: subjDoc.id } as Subject;

                    const stacksSnap = await getDocs(
                        collection(firestore, 'users', user.uid, 'subjects', subjDoc.id, 'stacks')
                    );

                    const stacks: StackWithVocab[] = await Promise.all(
                        stacksSnap.docs.map(async (stackDoc) => {
                            const stack = { ...stackDoc.data(), id: stackDoc.id } as Stack;

                            const vocabSnap = await getDocs(
                                collection(firestore, 'users', user.uid, 'subjects', subjDoc.id, 'stacks', stackDoc.id, 'vocabulary')
                            );
                            const vocabulary = vocabSnap.docs.map(
                                (vd) => ({ ...vd.data(), id: vd.id } as VocabularyItem)
                            );

                            return { ...stack, vocabulary };
                        })
                    );

                    return { ...subject, stacks };
                })
            );

            setSubjects(all);
        } catch (err) {
            console.error('[SubjectsCacheContext] fetch error:', err);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [firestore, user]);

    const refresh = useCallback(async () => {
        setSubjects(null); // clear while refreshing
        await fetchAll();
    }, [fetchAll]);

    const invalidate = useCallback(() => {
        setSubjects(null);
    }, []);

    // Auto-fetch on first mount if not yet loaded
    React.useEffect(() => {
        if (subjects === null && !isFetchingRef.current) {
            fetchAll();
        }
    }, [fetchAll, subjects, user]);

    return (
        <SubjectsCacheContext.Provider value={{ subjects, isLoading, refresh, invalidate }}>
            {children}
        </SubjectsCacheContext.Provider>
    );
}

// ------------------------------------------------------------------
// Hook
// ------------------------------------------------------------------
export function useSubjectsCache() {
    const ctx = useContext(SubjectsCacheContext);
    if (!ctx) throw new Error('useSubjectsCache must be used inside SubjectsCacheProvider');
    return ctx;
}
