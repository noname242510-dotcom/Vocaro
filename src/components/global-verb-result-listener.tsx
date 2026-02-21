
'use client';

import { useContext, useState, useEffect } from 'react';
import { TaskContext } from '@/contexts/task-context';
import { VerbDialog } from '@/app/dashboard/subjects/[subjectId]/_components/verb-dialog';
import type { GenerateVerbFormsOutput } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Verb } from '@/lib/types';


export function GlobalVerbResultListener() {
  const { taskResult, taskType, taskContext, clearTaskResult } = useContext(TaskContext);
  const [isOpen, setIsOpen] = useState(false);
  const [verbData, setVerbData] = useState<GenerateVerbFormsOutput | null>(null);
  const [editingVerb, setEditingVerb] = useState<Verb | null>(null);
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<string>('English');


  useEffect(() => {
    if (taskResult && taskType === 'verb-generation' && taskContext?.subjectId) {
      setVerbData(taskResult as GenerateVerbFormsOutput);
      setActiveSubjectId(taskContext.subjectId);
      setIsOpen(true);
    }
  }, [taskResult, taskType, taskContext]);
  
  // Effect to determine language based on subjectId
  useEffect(() => {
    if (activeSubjectId && firestore && user) {
        const getLanguage = async () => {
            const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', activeSubjectId);
            const subjectDoc = await getDoc(subjectDocRef);
            if (subjectDoc.exists()) {
                const subjectData = subjectDoc.data();
                setActiveLanguage(getLanguageFromSubject(subjectData?.name));
            }
        };
        getLanguage();
    }
  }, [activeSubjectId, firestore, user]);


  const handleSave = async (data: Omit<Verb, 'id' | 'subjectId' | 'language'>) => {
    if (!firestore || !user || !activeSubjectId) {
        toast({ variant: 'destructive', title: 'Fehler', description: 'Konnte Verb nicht speichern. Kontext fehlt.' });
        return;
    }
    const verbsCollectionRef = collection(firestore, 'users', user.uid, 'subjects', activeSubjectId, 'verbs');
    
    try {
        if (editingVerb) {
            const verbDocRef = doc(verbsCollectionRef, editingVerb.id);
            await updateDoc(verbDocRef, data);
            toast({ title: 'Erfolg', description: 'Verb aktualisiert.' });
        } else {
            await addDoc(verbsCollectionRef, {
                ...data,
                subjectId: activeSubjectId,
                language: activeLanguage,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Erfolg', description: 'Verb gespeichert.' });
        }
        handleClose();
    } catch (error) {
        console.error("Error saving verb: ", error);
        toast({ variant: 'destructive', title: 'Fehler beim Speichern', description: 'Das Verb konnte nicht gespeichert werden.' });
    }
  };
  
  const getLanguageFromSubject = (subjectName?: string) => {
    if (!subjectName) return 'English';
    const name = subjectName.toLowerCase();
    if (name.includes('französisch')) return 'French';
    if (name.includes('englisch')) return 'English';
    if (name.includes('spanisch')) return 'Spanish';
    return 'English';
  }


  const handleClose = () => {
    setIsOpen(false);
    setVerbData(null);
    setEditingVerb(null);
    setActiveSubjectId(null);
    clearTaskResult();
  };

  if (!isOpen && !verbData) {
    return null;
  }
  
  // This is a bit of a hack. The dialog needs an existing verb, but we only have the raw data.
  // We can construct a temporary "Verb"-like object for the dialog to use.
  // The important part is that `onSave` uses the fresh data passed to it.
  const tempExistingVerb: Verb | null = verbData ? {
    id: '', // Not a real existing verb
    subjectId: activeSubjectId || '',
    language: activeLanguage,
    ...verbData
  } : null;


  return (
    <VerbDialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      language={activeLanguage}
      onSave={handleSave}
      existingVerb={tempExistingVerb}
      subjectId={activeSubjectId!}
    />
  );
}
