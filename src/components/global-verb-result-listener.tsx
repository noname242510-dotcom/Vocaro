'use client';

import { useContext, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { TaskContext } from '@/contexts/task-context';
import { VerbDialog } from '@/app/dashboard/subjects/[subjectId]/_components/verb-dialog';
import type { GenerateVerbFormsOutput } from '@/ai/flows/generate-verb-forms';
import { useFirebase } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Verb } from '@/lib/types';


// This is a client component that will be used in a client context,
// but it needs to perform server-side actions through server actions.
// This is a common pattern in Next.js App Router.

export function GlobalVerbResultListener() {
  const { taskResult, taskType, clearTaskResult } = useContext(TaskContext);
  const [isOpen, setIsOpen] = useState(false);
  const [verbData, setVerbData] = useState<GenerateVerbFormsOutput | null>(null);
  const [editingVerb, setEditingVerb] = useState<Verb | null>(null); // Assuming you might edit
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const params = useParams();
  const subjectId = params.subjectId as string;

  useEffect(() => {
    if (taskResult && taskType === 'verb-generation') {
      setVerbData(taskResult as GenerateVerbFormsOutput);
      setIsOpen(true);
    }
  }, [taskResult, taskType]);

  const handleSave = async (data: Omit<Verb, 'id' | 'subjectId' | 'language'>) => {
    if (!firestore || !user || !subjectId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot save verb. Context is missing.' });
        return;
    }
    const verbsCollectionRef = collection(firestore, 'users', user.uid, 'subjects', subjectId, 'verbs');
    
    try {
        if (editingVerb) {
            const verbDocRef = doc(verbsCollectionRef, editingVerb.id);
            await updateDoc(verbDocRef, data);
            toast({ title: 'Success', description: 'Verb updated.' });
        } else {
            const subjectDoc = await doc(firestore, 'users', user.uid, 'subjects', subjectId).get();
            const subjectData = subjectDoc.data();
            const language = getLanguageFromSubject(subjectData?.name);
            
            await addDoc(verbsCollectionRef, {
                ...data,
                subjectId: subjectId,
                language: language,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'Verb saved.' });
        }
        handleClose();
    } catch (error) {
        console.error("Error saving verb: ", error);
        toast({ variant: 'destructive', title: 'Save Error', description: 'Could not save the verb.' });
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
    clearTaskResult();
  };

  // The language prop needs to be determined. 
  // This could come from the subject, or be a fixed value for now.
  // For this example, let's assume we can get it from context or pass it down.
  // If not available, we can't render the dialog.
  if (!verbData) {
    return null;
  }

  return (
    <VerbDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      language={getLanguageFromSubject()} // This needs a proper source
      onSave={handleSave}
      initialData={verbData}
      existingVerb={editingVerb}
    />
  );
}