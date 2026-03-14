'use client';

import { useState, useMemo, ChangeEvent, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  MoreHorizontal,
  Plus,
  Upload,
  Pen,
  Trash2,
  Book,
  Zap,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Circle,
  Loader2,
  Search,
  Settings2,
  Languages,
  WholeWord,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { Stack, Subject, VocabularyItem, Verb } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { suggestVocabularyFromImageContext } from '@/ai/flows/suggest-vocabulary-from-image-context';
import { generateVocabularyFromExtractedText } from '@/ai/flows/generate-vocabulary-from-extracted-text';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection, addDoc, writeBatch, serverTimestamp, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { StackItem } from './_components/stack-item';
import { VerbCard } from './_components/verb-card';
import { VerbDialog } from './_components/verb-dialog';
import { VocabDialog } from './_components/vocab-dialog';


import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';


const tenseOrderConfig: { [key: string]: string[] } = {
  'Indicatif': [
    'Indicatif Présent', 'Indicatif Imparfait', 'Indicatif Passé composé',
    'Indicatif Plus-que-parfait', 'Indicatif Futur simple', 'Indicatif Futur antérieur'
  ],
  'Conditionnel': ['Conditionnel Présent', 'Conditionnel Passé'],
  'Subjonctif': ['Subjonctif Présent', 'Subjonctif Passé'],
  'Autres formes': ['Impératif Présent', 'Infinitif Présent', 'Participe Présent', 'Participe Passé'],
  'Present': [
    'Simple Present', 'Present Progressive', 'Present Perfect', 'Present Perfect Progressive'
  ],
  'Past': [
    'Simple Past', 'Past Progressive', 'Past Perfect', 'Past Perfect Progressive'
  ],
  'Future': [
    'Simple Future', 'Future Progressive', 'Future Perfect', 'Future Perfect Progressive'
  ],
  'Other Forms': ['Imperative', 'Infinitive', 'Present Participle', 'Past Participle']
};

export default function SubjectDetailPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const subjectId = params.subjectId as string;
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Vocab state
  const [allVocabulary, setAllVocabulary] = useState<Record<string, VocabularyItem[]>>({});
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [newStackName, setNewStackName] = useState('');
  const [activeStackId, setActiveStackId] = useState<string | null>(null);
  const [manualTerm, setManualTerm] = useState('');
  const [manualDefinition, setManualDefinition] = useState('');
  const [manualPhonetic, setManualPhonetic] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [isAddVocabDialogOpen, setIsAddVocabDialogOpen] = useState(false);
  const [isAddVerbDirectDialogOpen, setIsAddVerbDirectDialogOpen] = useState(false);
  const [isDeleteVocabDialogOpen, setIsDeleteVocabDialogOpen] = useState(false);
  const [editingVocab, setEditingVocab] = useState<VocabularyItem | null>(null);
  const [isVocabDialogOpen, setIsVocabDialogOpen] = useState(false);
  const [vocabSearchQuery, setVocabSearchQuery] = useState('');
  const [manualRelatedWordLanguage, setManualRelatedWordLanguage] = useState('');
  const [manualRelatedWord, setManualRelatedWord] = useState('');

  // Subject state
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [renamedSubjectName, setRenamedSubjectName] = useState('');

  // Verb state
  const [isVerbDialogOpen, setIsVerbDialogOpen] = useState(false);
  const [isTenseSelectionDialogOpen, setIsTenseSelectionDialogOpen] = useState(false);
  const [editingVerb, setEditingVerb] = useState<Verb | null>(null);
  const [verbSearchQuery, setVerbSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [localVerbs, setLocalVerbs] = useState<Verb[]>([]);
  const [tempSelectedTenses, setTempSelectedTenses] = useState<Set<string>>(new Set());

  // Tab state
  const defaultTab = searchParams.get('tab') || 'vocabulary';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isRunning, setIsRunning] = useState(false);


  const { toast } = useToast();

  const subjectDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'subjects', subjectId);
  }, [firestore, user, subjectId]);

  const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);

  const stacksCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks');
  }, [firestore, user, subjectId]);

  const { data: stacks, isLoading: areStacksLoading, forceUpdate } = useCollection<Stack>(stacksCollectionRef);

  const verbsCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects', subjectId, 'verbs');
  }, [firestore, user, subjectId]);

  const { data: verbs, isLoading: areVerbsLoading, forceUpdate: forceVerbsUpdate } = useCollection<Verb>(verbsCollectionRef);


  useEffect(() => {
    if (subject) {
      setRenamedSubjectName(subject.name);
    }
  }, [subject]);

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);


  const fetchAllVocab = async () => {
    if (stacks && firestore && user) {
      const vocabData: Record<string, VocabularyItem[]> = {};
      const currentSelection = new Set(selectedVocab);
      for (const stack of stacks) {
        const vocabCollectionRef = collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stack.id, 'vocabulary');
        const vocabSnapshot = await getDocs(vocabCollectionRef);
        const vocabs = vocabSnapshot.docs.map(d => ({ ...d.data(), id: d.id, isSelected: currentSelection.has(d.id) } as VocabularyItem));

        vocabs.sort((a, b) => a.term.localeCompare(b.term));

        vocabData[stack.id] = vocabs;
      }
      setAllVocabulary(vocabData);
    }
  };

  const handleEditVocab = (vocab: VocabularyItem) => {
    setEditingVocab(vocab);
    setIsVocabDialogOpen(true);
  };

  const handleSaveVocab = async (stackId: string, vocabId: string, data: Partial<VocabularyItem>) => {
    if (!user || !firestore) return;
    const vocabDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stackId, 'vocabulary', vocabId);
    await updateDoc(vocabDocRef, data);
    toast({ title: "Gespeichert", description: "Die Vokabel wurde aktualisiert." });
    fetchAllVocab(); // Refetch all vocab to show updated data
  };


  useEffect(() => {
    fetchAllVocab();
  }, [stacks, firestore, user, subjectId]);


  const getEmojiForSubject = (subjectName: string) => {
    const name = subjectName.toLowerCase();
    if (name.includes('deutsch')) return '🇩🇪';
    if (name.includes('englisch')) return '🇬🇧';
    if (name.includes('französisch')) return '🇫🇷';
    if (name.includes('spanisch')) return '🇪🇸';
    if (name.includes('portugiesisch')) return '🇵🇹';
    if (name.includes('italienisch')) return '🇮🇹';
    if (name.includes('russich')) return '🇷🇺';
    if (name.includes('griechiesch')) return '🇬🇷';
    if (name.includes('japanisch')) return '🇯🇵';
    if (name.includes('latein')) return '🏛️';
    if (name.includes('mathe')) return '🔢';
    return '🌐';
  };

  const getLanguageFromSubject = (subjectName?: string) => {
    if (!subjectName) return 'English';
    const name = subjectName.toLowerCase();
    if (name.includes('französisch')) return 'French';
    if (name.includes('englisch')) return 'English';
    if (name.includes('spanisch')) return 'Spanish';
    return 'English';
  }

  const handleRenameSubject = async () => {
    if (renamedSubjectName.trim() && user && firestore && subjectDocRef) {
      const newEmoji = getEmojiForSubject(renamedSubjectName);
      await updateDoc(subjectDocRef, {
        name: renamedSubjectName.trim(),
        emoji: newEmoji,
      });
      setIsRenameDialogOpen(false);
      toast({ title: 'Erfolg', description: 'Fach umbenannt.' });
    }
  };

  const handleDeleteSubject = async () => {
    if (!user || !firestore || !subjectDocRef || !stacksCollectionRef) return;

    try {
      const batch = writeBatch(firestore);

      if (stacks) {
        for (const stack of stacks) {
          const stackDocRef = doc(stacksCollectionRef, stack.id);
          const vocabSnapshot = await getDocs(collection(stackDocRef, 'vocabulary'));
          vocabSnapshot.forEach(vocabDoc => batch.delete(vocabDoc.ref));
          batch.delete(stackDocRef);
        }
      }

      batch.delete(subjectDocRef);

      await batch.commit();

      toast({ title: 'Erfolg', description: `Fach "${subject?.name}" wurde gelöscht.` });
      router.push('/dashboard/facher');

    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({ variant: 'destructive', title: 'Fehler beim Löschen', description: 'Das Fach konnte nicht gelöscht werden.' });
    }
    setIsDeleteDialogOpen(false);
  };


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 4);
    if (files.length === 0) {
      setPreviewImages([]);
      return;
    }
    const readers = files.map(file => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(results => setPreviewImages(results));
  };

  const handleExtractAndSaveVocabulary = async () => {
    if (previewImages.length === 0) {
      toast({ variant: "destructive", title: "Kein Bild ausgewählt", description: "Bitte wähle 1–4 Bilder aus." });
      return;
    }
    if (!newStackName) {
      toast({ variant: "destructive", title: "Kein Stapelname", description: "Bitte gib einen Namen für den neuen Stapel an." });
      return;
    }

    setIsRunning(true);

    try {
      const withRetry = async <T,>(fn: () => Promise<T>, retries = 2): Promise<T> => {
        try { return await fn(); }
        catch (e) {
          if (retries > 0) return withRetry(fn, retries - 1);
          throw e;
        }
      };

      // Process each image and collect all vocab
      const allGeneratedVocab: { term: string; definition: string; phonetic?: string; relatedWord?: any; notes?: string }[] = [];

      for (const imageDataUri of previewImages) {
        const ocrResult = await withRetry(() => suggestVocabularyFromImageContext({ imageDataUri }));
        const extractedText = ocrResult.suggestedVocabulary.join('\n');
        if (!extractedText.trim()) continue;

        const generationResult = await withRetry(() => generateVocabularyFromExtractedText({ extractedText }));
        allGeneratedVocab.push(...generationResult.vocabulary);
      }

      if (allGeneratedVocab.length === 0) throw new Error("Aus den Bildern konnten keine Vokabeln generiert werden.");

      // Deduplicate by term (case-insensitive)
      const seen = new Set<string>();
      const deduplicatedVocab = allGeneratedVocab.filter(v => {
        const key = v.term.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (!user || !firestore || !stacksCollectionRef) throw new Error("Benutzer nicht authentifiziert.");

      let stackRef;
      if (activeStackId) {
        stackRef = doc(stacksCollectionRef, activeStackId);
      } else {
        const existingStack = stacks?.find(s => s.name === newStackName);
        if (existingStack) {
          stackRef = doc(stacksCollectionRef, existingStack.id);
        } else {
          stackRef = await addDoc(stacksCollectionRef, {
            name: newStackName,
            createdAt: serverTimestamp(),
            subjectId: subjectId,
          });
        }
      }

      const vocabCollectionRef = collection(stackRef, 'vocabulary');

      const batch = writeBatch(firestore);
      deduplicatedVocab.forEach(vocabItem => {
        const newVocabDoc = doc(vocabCollectionRef);
        batch.set(newVocabDoc, {
          term: vocabItem.term,
          definition: vocabItem.definition,
          phonetic: vocabItem.phonetic || '',
          relatedWord: vocabItem.relatedWord || null,
          notes: vocabItem.notes || '',
          createdAt: serverTimestamp(),
          source: 'ai',
        });
      });
      await batch.commit();

      toast({ title: 'Erfolg!', description: `${deduplicatedVocab.length} Vokabeln aus ${previewImages.length} Bild(ern) im Stapel "${newStackName}" gespeichert.` });
      resetAndCloseAddVocabDialog();
      forceUpdate();
      fetchAllVocab();

    } catch (error: any) {
      toast({ variant: "destructive", title: "Fehler bei der Vokabelerkennung", description: error.message || "Die KI konnte die Anfrage nicht verarbeiten. Bitte versuche es erneut." });
    } finally {
      setIsRunning(false);
    }
  };


  const handleAddManualVocabulary = async (closeOnFinish = true) => {
    if (!manualTerm || !manualDefinition || !newStackName || !user || !firestore || !stacksCollectionRef) {
      toast({ variant: 'destructive', title: 'Fehlende Informationen', description: 'Bitte fülle Stapelname, Begriff und Definition aus.' });
      return;
    }
    setIsAddingManually(true);
    try {
      let stackRef;
      if (activeStackId) {
        stackRef = doc(stacksCollectionRef, activeStackId);
      } else {
        const existingStack = stacks?.find(s => s.name === newStackName);
        if (existingStack) {
          stackRef = doc(stacksCollectionRef, existingStack.id);
        } else {
          stackRef = await addDoc(stacksCollectionRef, {
            name: newStackName,
            createdAt: serverTimestamp(),
            subjectId: subjectId,
          });
        }
      }

      await addDoc(collection(stackRef, 'vocabulary'), {
        term: manualTerm,
        definition: manualDefinition,
        phonetic: manualPhonetic,
        relatedWord: (manualRelatedWordLanguage || manualRelatedWord)
          ? { language: manualRelatedWordLanguage, word: manualRelatedWord }
          : null,
        notes: manualNotes,
        createdAt: serverTimestamp(),
        source: 'manual',
      });

      toast({ title: 'Erfolg', description: 'Vokabel hinzugefügt.' });
      setManualTerm('');
      setManualDefinition('');
      setManualPhonetic('');
      setManualNotes('');
      setManualRelatedWordLanguage('');
      setManualRelatedWord('');

      if (closeOnFinish) {
        resetAndCloseAddVocabDialog();
      }

      forceUpdate();
      fetchAllVocab();

    } catch (error) {
      console.error("Error adding manual vocabulary:", error);
      toast({ variant: 'destructive', title: 'Fehler', description: 'Konnte Vokabel nicht hinzufügen.' });
    } finally {
      setIsAddingManually(false);
    }
  };

  const handleSelectionChange = (vocabId: string, isSelected: boolean) => {
    setAllVocabulary(currentVocab => {
      const newVocab = { ...currentVocab };
      for (const stackId in newVocab) {
        newVocab[stackId] = newVocab[stackId].map(v =>
          v.id === vocabId ? { ...v, isSelected } : v
        );
      }
      return newVocab;
    });
  };

  const selectedVocab = useMemo(() => {
    return Object.values(allVocabulary).flat().filter(v => v.isSelected).map(v => v.id);
  }, [allVocabulary]);

  const filteredVocabulary = useMemo(() => {
    if (!vocabSearchQuery) return allVocabulary;

    const lowercasedQuery = vocabSearchQuery.toLowerCase();
    const newFilteredVocab: Record<string, VocabularyItem[]> = {};

    for (const stackId in allVocabulary) {
      const filtered = allVocabulary[stackId].filter(
        v => v.term.toLowerCase().includes(lowercasedQuery) || v.definition.toLowerCase().includes(lowercasedQuery)
      );
      if (filtered.length > 0) {
        newFilteredVocab[stackId] = filtered;
      }
    }
    return newFilteredVocab;
  }, [allVocabulary, vocabSearchQuery]);


  const handleStartLearning = () => {
    if (selectedVocab.length > 0 && subject) {
      sessionStorage.setItem('learn-session-vocab', JSON.stringify(selectedVocab));
      sessionStorage.setItem('learn-session-subject', subjectId);
      sessionStorage.setItem('learn-session-emoji', subject.emoji);
      sessionStorage.setItem('learn-session-subject-name', subject.name);
      router.push(`/dashboard/learn`);
    }
  };

  const handleDeleteSelectedVocabulary = async () => {
    if (!user || !firestore || !stacks || selectedVocab.length === 0) {
      return;
    }

    const batch = writeBatch(firestore);
    let deletedCount = 0;

    const vocabToStackMap: Record<string, string> = {};
    Object.entries(allVocabulary).forEach(([stackId, vocabs]) => {
      vocabs.forEach(v => {
        vocabToStackMap[v.id] = stackId;
      });
    });

    selectedVocab.forEach(vocabId => {
      const stackId = vocabToStackMap[vocabId];
      if (stackId) {
        const vocabDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stackId, 'vocabulary', vocabId);
        batch.delete(vocabDocRef);
        deletedCount++;
      }
    });

    try {
      await batch.commit();
      toast({
        title: 'Erfolg',
        description: `${deletedCount} Vokabel(n) wurden gelöscht.`,
      });
      // Deselect all and refetch
      setAllVocabulary(prev => {
        const deselected = { ...prev };
        for (const stackId in deselected) {
          deselected[stackId] = deselected[stackId].map(v => ({ ...v, isSelected: false }));
        }
        return deselected;
      });
      forceUpdate(); // Re-fetch stacks which will trigger vocab re-fetch
      fetchAllVocab();
    } catch (error) {
      console.error("Error deleting selected vocabulary:", error);
      toast({
        variant: 'destructive',
        title: 'Fehler beim Löschen',
        description: 'Die ausgewählten Vokabeln konnten nicht gelöscht werden.',
      });
    } finally {
      setIsDeleteVocabDialogOpen(false);
    }
  };

  const openAddVocabDialog = (stack?: Stack) => {
    if (stack) {
      setNewStackName(stack.name);
      setActiveStackId(stack.id);
    } else {
      setNewStackName('');
      setActiveStackId(null);
    }
    setIsAddVocabDialogOpen(true);
  };

  const resetAndCloseAddVocabDialog = () => {
    setNewStackName('');
    setManualTerm('');
    setManualDefinition('');
    setManualPhonetic('');
    setManualNotes('');
    setPreviewImages([]);
    setActiveStackId(null);
    setIsAddVocabDialogOpen(false);
  };


  // Verb handlers
  const allTenses = useMemo(() => {
    const tenses = new Set<string>();
    verbs?.forEach(verb => {
      Object.keys(verb.forms).forEach(tense => tenses.add(tense));
    });
    return Array.from(tenses);
  }, [verbs]);

  const sortedTensesForDialog = useMemo(() => {
    if (!verbs) return [];

    const isFrench = allTenses.some(t => t.startsWith('Indicatif'));
    const orderKeys = isFrench
      ? ['Indicatif', 'Conditionnel', 'Subjonctif', 'Autres formes']
      : ['Present', 'Past', 'Future', 'Other Forms'];

    const orderedTenseList = orderKeys.flatMap(key => tenseOrderConfig[key] || []);

    const sorted = [...allTenses].sort((a, b) => {
      const indexA = orderedTenseList.indexOf(a);
      const indexB = orderedTenseList.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return sorted;
  }, [allTenses, verbs]);

  const handleApplyGlobalTenseSelection = () => {
    setLocalVerbs(currentVerbs =>
      currentVerbs.map(verb => {
        if (verb.isSelected) {
          // Create a new Set to ensure re-render
          return { ...verb, selectedTenses: new Set(tempSelectedTenses) };
        }
        return verb;
      })
    );
    setIsTenseSelectionDialogOpen(false);
    toast({
      title: 'Zeiten angewendet',
      description: `${tempSelectedTenses.size} Zeit(en) wurden für die ausgewählten Verben übernommen.`
    })
  };


  const handleOpenTenseDialog = () => {
    const selected = localVerbs.filter(v => v.isSelected);
    if (selected.length > 0) {
      // Use the tenses from the *first* selected verb as the initial state for the dialog.
      const firstSelectedVerbTenses = selected[0].selectedTenses || new Set<string>();
      setTempSelectedTenses(new Set(firstSelectedVerbTenses));
    } else {
      // If no verbs are selected, open the dialog with no tenses selected.
      setTempSelectedTenses(new Set<string>());
    }
    setIsTenseSelectionDialogOpen(true);
  }

  const handleTempTenseSelection = (tense: string, checked: boolean) => {
    setTempSelectedTenses(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(tense);
      } else {
        newSet.delete(tense);
      }
      return newSet;
    });
  }

  const handleTenseSelectionChange = (verbId: string, tense: string, selected: boolean) => {
    setLocalVerbs(currentVerbs =>
      currentVerbs.map(verb => {
        if (verb.id === verbId) {
          const newSelectedTenses = new Set(verb.selectedTenses);
          if (selected) {
            newSelectedTenses.add(tense);
          } else {
            newSelectedTenses.delete(tense);
          }
          return { ...verb, selectedTenses: newSelectedTenses };
        }
        return verb;
      })
    );
  };

  const handleSaveVerb = async (verbData: Omit<Verb, 'id' | 'subjectId' | 'language'>) => {
    if (!verbsCollectionRef) return;

    if (editingVerb) {
      // Update existing verb
      const verbDocRef = doc(verbsCollectionRef, editingVerb.id);
      await updateDoc(verbDocRef, verbData);
    } else {
      // Add new verb
      await addDoc(verbsCollectionRef, {
        ...verbData,
        subjectId: subjectId,
        language: getLanguageFromSubject(subject?.name),
        createdAt: serverTimestamp(),
        source: 'ai'
      });
    }
    forceVerbsUpdate();
    setActiveTab('verbs');
  };

  const handleEditVerb = (verb: Verb) => {
    setEditingVerb(verb);
    setIsVerbDialogOpen(true);
  };

  const handleAddNewVerb = () => {
    setEditingVerb(null);
    setIsVerbDialogOpen(true);
  };

  const handleDeleteVerb = async (verbId: string) => {
    if (!verbsCollectionRef) return;
    try {
      const verbDocRef = doc(verbsCollectionRef, verbId);
      await deleteDoc(verbDocRef);
      toast({ title: 'Erfolg', description: 'Verb gelöscht.' });
      forceVerbsUpdate();
    } catch (e) {
      console.error("Error deleting verb:", e);
      toast({ variant: 'destructive', title: 'Fehler', description: 'Verb konnte nicht gelöscht werden.' });
    }
  };

  useEffect(() => {
    if (verbs) {
      setLocalVerbs(currentLocalVerbs => {
        const localVerbMap = new Map(currentLocalVerbs.map(v => [v.id, v]));
        return verbs.map(v => ({
          ...v,
          isSelected: localVerbMap.get(v.id)?.isSelected || false,
          selectedTenses: localVerbMap.get(v.id)?.selectedTenses || new Set<string>()
        }));
      });
    }
  }, [verbs]);

  const handleVerbSelectionChange = (verbId: string, isSelected: boolean) => {
    setLocalVerbs(currentVerbs =>
      currentVerbs.map(v => (v.id === verbId ? { ...v, isSelected } : v))
    );
  };

  const filteredVerbs = useMemo(() => {
    if (!verbSearchQuery) return localVerbs;
    return localVerbs?.filter(verb => verb.infinitive.toLowerCase().includes(verbSearchQuery.toLowerCase())) || [];
  }, [localVerbs, verbSearchQuery]);

  const allTempTensesSelected = tempSelectedTenses.size === allTenses.length;

  const handleToggleAllTenses = () => {
    if (allTempTensesSelected) {
      setTempSelectedTenses(new Set());
    } else {
      setTempSelectedTenses(new Set(allTenses));
    }
  };

  const handleStartVerbPractice = () => {
    const selectedVerbs = localVerbs.filter(v => v.isSelected);
    const hasTensesSelected = selectedVerbs.some(v => v.selectedTenses && v.selectedTenses.size > 0);

    if (selectedVerbs.length > 0 && subject) {
      const practiceData = selectedVerbs.map(v => ({
        ...v,
        selectedTenses: Array.from(v.selectedTenses || []),
      }));
      sessionStorage.setItem('verb-practice-session', JSON.stringify(practiceData));
      sessionStorage.setItem('verb-practice-subject-id', subjectId);
      sessionStorage.setItem('learn-session-emoji', subject.emoji);
      sessionStorage.setItem('learn-session-subject-name', subject.name);
      router.push('/dashboard/learn/verbs');
    }
  };

  const getVerbLearnButtonText = () => {
    const selectedCount = localVerbs.filter(v => v.isSelected).length;
    if (selectedCount === 0) return "Konjugationen lernen";

    const hasTenses = localVerbs.some(v => v.isSelected && v.selectedTenses && v.selectedTenses.size > 0);

    if (hasTenses) {
      return selectedCount > 1 ? "Konjugationen lernen" : "Konjugation lernen";
    } else {
      return selectedCount > 1 ? "Infinitive lernen" : "Infinitiv lernen";
    }
  }


  if (isSubjectLoading || areStacksLoading || areVerbsLoading) {
    return null;
  }

  if (!subject) {
    return (
      <div className="text-center">
        <h2 className="text-xl">Fach nicht gefunden</h2>
        <Button asChild variant="link">
          <Link href="/dashboard/facher">Zurück zur Fächerübersicht</Link>
        </Button>
      </div>
    );
  }

  const isAnyVocabSelected = selectedVocab.length > 0;
  const selectedVerbsCount = localVerbs.filter(v => v.isSelected).length;

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b relative">
        <div className="space-y-6">
          <Link href="/dashboard/facher" className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-black uppercase tracking-widest">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Zurück zu den Fächern
          </Link>

          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-card border shadow-xl shadow-primary/5 rounded-[2rem] flex items-center justify-center text-6xl">
              {subject.emoji}
            </div>
            <div className="space-y-1">
              <h1 className="text-6xl font-black font-creative tracking-tight text-foreground">
                {subject.name}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5"><WholeWord className="h-4 w-4" /> {Object.values(allVocabulary).flat().length} Vokabeln</span>
                <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                <span className="flex items-center gap-1.5"><Zap className="h-4 w-4" /> {verbs?.length || 0} Verben</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-14 px-6 rounded-2xl border-2 font-bold shadow-xl shadow-primary/5 hover:bg-secondary/50">
                <Pen className="h-4 w-4 mr-2" /> Umbenennen
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-10">
              <DialogHeader>
                <DialogTitle className="text-3xl font-bold font-headline">Fach umbenennen</DialogTitle>
                <DialogDescription className="text-lg mt-2">Ändere den Namen deines Fachs.</DialogDescription>
              </DialogHeader>
              <div className="py-8 space-y-4">
                <Label htmlFor="rename" className="font-bold text-xs uppercase tracking-widest opacity-60">Fachname</Label>
                <Input
                  id="rename"
                  value={renamedSubjectName}
                  onChange={(e) => setRenamedSubjectName(e.target.value)}
                  className="h-14 rounded-2xl border-2 text-lg px-6"
                />
              </div>
              <DialogFooter className="gap-4">
                <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)} className="h-14 rounded-2xl border-2 font-bold text-lg">Abbrechen</Button>
                <Button onClick={handleRenameSubject} className="h-14 rounded-2xl font-bold text-lg px-10">Speichern</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-14 w-14 rounded-2xl border-2 border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive shadow-xl shadow-destructive/5">
                <Trash2 className="h-6 w-6" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] p-10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-3xl font-bold font-headline">Fach löschen?</AlertDialogTitle>
                <AlertDialogDescription className="text-lg mt-4">
                  Bist du sicher? Alle Stapel, Vokabeln und Verben in &quot;{subject.name}&quot; werden unwiderruflich gelöscht.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-4 mt-8">
                <AlertDialogCancel className="h-14 rounded-2xl border-2 font-bold text-lg">Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSubject} className="h-14 rounded-2xl bg-destructive hover:bg-destructive/90 font-bold text-lg">Löschen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <TabsList className="bg-transparent h-auto p-0 flex gap-10 border-none justify-start">
            <TabsTrigger
              value="vocabulary"
              className="px-0 py-4 bg-transparent border-none rounded-none text-2xl font-bold font-headline text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-[4px] data-[state=active]:border-primary transition-all shadow-none"
            >
              Vokabeln
            </TabsTrigger>
            <TabsTrigger
              value="verbs"
              className="px-0 py-4 bg-transparent border-none rounded-none text-2xl font-bold font-headline text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-[4px] data-[state=active]:border-primary transition-all shadow-none"
            >
              Verben
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <div className="relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
              <Input
                placeholder={activeTab === 'vocabulary' ? "Vokabeln suchen..." : "Verben suchen..."}
                value={activeTab === 'vocabulary' ? vocabSearchQuery : verbSearchQuery}
                onChange={(e) => activeTab === 'vocabulary' ? setVocabSearchQuery(e.target.value) : setVerbSearchQuery(e.target.value)}
                className="h-14 w-64 md:w-80 pl-12 rounded-2xl border-none bg-card shadow-xl shadow-primary/5 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </div>

        <TabsContent value="vocabulary" className="space-y-8">
          <div className="flex justify-between items-center gap-4">
              <h2 className="text-3xl font-black font-headline">Deine Vokabeln</h2>
              <Dialog open={isAddVocabDialogOpen} onOpenChange={setIsAddVocabDialogOpen}>
                  <DialogTrigger asChild>
                      <Button
                          onClick={() => openAddVocabDialog()}
                          className="h-12 rounded-2xl font-bold px-6 shadow-md shadow-primary/20"
                      >
                          <Plus className="mr-2 h-5 w-5" /> Vokabeln hinzufügen
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-8">
                      <DialogHeader>
                          <DialogTitle className="text-2xl font-bold font-headline">Vokabeln hinzufügen</DialogTitle>
                          <DialogDescription>
                              Wähle eine Methode, um Vokabeln zu deinem Stapel hinzuzufügen.
                          </DialogDescription>
                      </DialogHeader>

                      <Tabs defaultValue="ai" className="w-full mt-6">
                          <TabsList className="grid w-full grid-cols-2 bg-secondary/50 rounded-xl p-1">
                              <TabsTrigger value="ai" className="rounded-lg font-bold">KI-Scan (Bild)</TabsTrigger>
                              <TabsTrigger value="manual" className="rounded-lg font-bold">Manuell</TabsTrigger
                          </TabsList>

                          <TabsContent value="ai" className="space-y-6 pt-6">
                              <div className="space-y-4">
                                  <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Stapelname</Label>
                                  <Input
                                      placeholder="z.B. Lektion 1"
                                      value={newStackName}
                                      onChange={(e) => setNewStackName(e.target.value)}
                                      disabled={!!activeStackId}
                                      className="h-12 rounded-xl"
                                  />
                              </div>

                              <div className="space-y-4">
                                  <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Bilder hochladen (max. 4)</Label>
                                  <div className="grid grid-cols-2 gap-4">
                                      {previewImages.map((src, idx) => (
                                          <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border">
                                              <Image src={src} alt="Preview" fill className="object-cover" />
                                          </div>
                                      ))}
                                      {previewImages.length < 4 && (
                                          <label className="aspect-video rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                                              <Upload className="h-6 w-6 text-muted-foreground" />
                                              <span className="text-xs mt-2 font-bold text-muted-foreground">Bild wählen</span>
                                              <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                                          </label>
                                      )}
                                  </div>
                              </div>

                              <Button
                                  onClick={handleExtractAndSaveVocabulary}
                                  disabled={previewImages.length === 0 || !newStackName || isRunning}
                                  className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/10"
                              >
                                  {isRunning ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />}
                                  KI-Erkennung starten
                              </Button>
                          </TabsContent>

                          <TabsContent value="manual" className="space-y-4 pt-6">
                              <div className="grid gap-4">
                                  <div className="space-y-2">
                                      <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Stapelname</Label>
                                      <Input
                                          placeholder="z.B. Lektion 1"
                                          value={newStackName}
                                          onChange={(e) => setNewStackName(e.target.value)}
                                          disabled={!!activeStackId}
                                      />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                          <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Fremdwort</Label>
                                          <Input value={manualTerm} onChange={(e) => setManualTerm(e.target.value)} placeholder="Wort" />
                                      </div>
                                      <div className="space-y-2">
                                          <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Übersetzung</Label>
                                          <Input value={manualDefinition} onChange={(e) => setManualDefinition(e.target.value)} placeholder="Bedeutung" />
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Lautschrift (optional)</Label>
                                      <Input value={manualPhonetic} onChange={(e) => setManualPhonetic(e.target.value)} placeholder="z.B. /ˈhɛloʊ/" />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Ähnliches Wort in anderer Sprache (optional)</Label>
                                      <div className="grid grid-cols-2 gap-3">
                                          <Input value={manualRelatedWordLanguage} onChange={(e) => setManualRelatedWordLanguage(e.target.value)} placeholder="Sprache (z.B. Deutsch)" />
                                          <Input value={manualRelatedWord} onChange={(e) => setManualRelatedWord(e.target.value)} placeholder="Ähnliches Wort" />
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Hinweise / Tipps (optional)</Label>
                                      <Textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Merkregel, Kontext, Verwendung..." className="rounded-xl resize-none" rows={2} />
                                  </div>
                              </div>
                              <Button onClick={() => handleAddManualVocabulary(true)} disabled={isAddingManually || !manualTerm || !manualDefinition} className="w-full h-12 rounded-xl font-bold">
                                  Hinzufügen
                              </Button>
                          </TabsContent>
                      </Tabs>
                  </DialogContent>
              </Dialog>
          </div>
          <div className="space-y-6">
            {stacks?.map((stack) => {
              const results = filteredVocabulary[stack.id] || [];
              if (vocabSearchQuery && results.length === 0) return null;
              return (
                <StackItem
                  key={stack.id}
                  stack={stack}
                  vocabulary={allVocabulary[stack.id] || []}
                  onAddVocab={() => openAddVocabDialog(stack)}
                  onEditVocab={handleEditVocab}
                  onSelectionChange={handleSelectionChange}
                  subjectId={subjectId}
                  onDelete={forceUpdate}
                  onRename={forceUpdate}
                />
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="verbs" className="space-y-8">
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-3xl font-black font-headline">Deine Verben</h2>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                disabled={selectedVerbsCount === 0}
                onClick={handleOpenTenseDialog}
                className="h-12 rounded-2xl border-2 font-bold px-6"
              >
                <Settings2 className="mr-2 h-4 w-4" /> Zeiten auswählen
              </Button>

              <Button onClick={handleAddNewVerb} className="h-12 rounded-2xl font-bold px-8 shadow-lg shadow-primary/10">
                <Plus className="mr-2 h-5 w-5" /> Verb hinzufügen
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {filteredVerbs.length > 0 ? (
              filteredVerbs.map((verb) => (
                <VerbCard
                  key={verb.id}
                  verb={verb}
                  onEdit={handleEditVerb}
                  onDelete={handleDeleteVerb}
                  onSelectionChange={handleVerbSelectionChange}
                  onTenseSelectionChange={handleTenseSelectionChange}
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center space-y-4 bg-card rounded-[2.5rem] border-2 border-dashed border-muted-foreground/10">
                <WholeWord className="mx-auto h-16 w-16 text-muted-foreground/20" />
                <div>
                  <h3 className="text-xl font-bold font-headline">Keine Verben gefunden</h3>
                  <p className="text-muted-foreground">Füge dein erstes Verb hinzu, um mit dem Lernen zu beginnen.</p>
                </div>
              </div>
            )}
          </div>

          <Dialog open={isTenseSelectionDialogOpen} onOpenChange={setIsTenseSelectionDialogOpen}>
            <DialogContent className="rounded-[2.5rem] p-10 max-w-2xl">
              <DialogHeader>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <DialogTitle className="text-3xl font-bold font-headline">Zeiten auswählen</DialogTitle>
                    <DialogDescription className="text-lg">Wähle Zeiten für {selectedVerbsCount} ausgewählte Verben.</DialogDescription>
                  </div>
                  <Button variant="outline" onClick={handleToggleAllTenses} className="rounded-xl border-2 font-bold">
                    {allTempTensesSelected ? 'Keine' : 'Alle'}
                  </Button>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-[50vh] pr-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {Object.entries(
                    sortedTensesForDialog.reduce((acc, tense) => {
                      const group = Object.keys(tenseOrderConfig).find(key => tenseOrderConfig[key].includes(tense)) || 'Uncategorized';
                      if (!acc[group]) acc[group] = [];
                      acc[group].push(tense);
                      return acc;
                    }, {} as Record<string, string[]>)
                  ).map(([groupName, tenses]) => (
                    <div key={groupName} className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-primary/40">{groupName}</h4>
                      <div className="space-y-3">
                        {tenses.map(tense => (
                          <div key={tense} className="flex items-center gap-3">
                            <Checkbox
                              id={`global-tense-${tense}`}
                              checked={tempSelectedTenses.has(tense)}
                              onCheckedChange={(checked) => handleTempTenseSelection(tense, Boolean(checked))}
                              className="w-5 h-5 rounded-md"
                            />
                            <Label htmlFor={`global-tense-${tense}`} className="text-base font-bold cursor-pointer">{tense}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <DialogFooter className="mt-8 pt-8 border-t gap-4">
                <Button variant="outline" onClick={() => setIsTenseSelectionDialogOpen(false)} className="h-14 rounded-2xl border-2 font-bold text-lg flex-1">Abbrechen</Button>
                <Button onClick={handleApplyGlobalTenseSelection} className="h-14 rounded-2xl font-bold text-lg flex-1 shadow-xl shadow-primary/10">Anwenden</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>


      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto mx-auto z-40">
        <div className="p-1 flex items-center justify-between gap-2 bg-background/80 backdrop-blur-md rounded-full border shadow-lg">
          {activeTab === 'vocabulary' && (
            <>
              <Button
                className="rounded-full text-base px-8 h-12"
                disabled={!isAnyVocabSelected}
                onClick={handleStartLearning}
              >
                Lernen
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </>
          )}
          {activeTab === 'verbs' && (
            <>
              <Button
                className="rounded-full text-base px-8 h-12"
                disabled={selectedVerbsCount === 0}
                onClick={handleStartVerbPractice}
              >
                {getVerbLearnButtonText()}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <VerbDialog
        isOpen={isVerbDialogOpen}
        onOpenChange={setIsVerbDialogOpen}
        language={getLanguageFromSubject(subject?.name)}
        onSave={handleSaveVerb}
        subjectId={subjectId}
        existingVerb={editingVerb}
      />
      {
        editingVocab && (
          <VocabDialog
            isOpen={isVocabDialogOpen}
            onOpenChange={setIsVocabDialogOpen}
            vocabItem={editingVocab}
            subjectId={subjectId}
            onSave={handleSaveVocab}
          />
        )
      }
    </div>
  );
}
