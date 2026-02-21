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
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newStackName, setNewStackName] = useState('');
  const [activeStackId, setActiveStackId] = useState<string | null>(null);
  const [manualTerm, setManualTerm] = useState('');
  const [manualDefinition, setManualDefinition] = useState('');
  const [manualPhonetic, setManualPhonetic] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [isAddVocabDialogOpen, setIsAddVocabDialogOpen] = useState(false);
  const [isDeleteVocabDialogOpen, setIsDeleteVocabDialogOpen] = useState(false);
  const [editingVocab, setEditingVocab] = useState<VocabularyItem | null>(null);
  const [isVocabDialogOpen, setIsVocabDialogOpen] = useState(false);
  const [vocabSearchQuery, setVocabSearchQuery] = useState('');
  
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

  const { data: subject, isLoading: isSubjectLoading, forceUpdate: forceSubjectUpdate } = useDoc<Subject>(subjectDocRef);

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
      forceSubjectUpdate();
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
      router.push('/dashboard');

    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({ variant: 'destructive', title: 'Fehler beim Löschen', description: 'Das Fach konnte nicht gelöscht werden.' });
    }
    setIsDeleteDialogOpen(false);
  };


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(null);
    }
  };

  const handleExtractAndSaveVocabulary = async () => {
    if (!previewImage) {
      toast({ variant: "destructive", title: "Kein Bild ausgewählt", description: "Bitte wähle zuerst ein Bild aus." });
      return;
    }
    if (!newStackName) {
      toast({ variant: "destructive", title: "Kein Stapelname", description: "Bitte gib einen Namen für den neuen Stapel an." });
      return;
    }

    setIsRunning(true);
    
    try {
      const ocrResult = await suggestVocabularyFromImageContext({ imageDataUri: previewImage });
      const extractedText = ocrResult.suggestedVocabulary.join('\n');
      if (!extractedText.trim()) throw new Error("Im Bild wurde kein Text gefunden.");

      const generationResult = await generateVocabularyFromExtractedText({ extractedText });
      const generatedVocab = generationResult.vocabulary;
      if (generatedVocab.length === 0) throw new Error("Aus dem Text konnten keine Vokabeln generiert werden.");
      
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
      generatedVocab.forEach(vocabItem => {
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
      
      toast({ title: 'Erfolg!', description: `${generatedVocab.length} Vokabeln im Stapel "${newStackName}" gespeichert.` });
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
            notes: manualNotes,
            createdAt: serverTimestamp(),
            source: 'manual',
        });
        
        toast({ title: 'Erfolg', description: 'Vokabel hinzugefügt.' });
        setManualTerm('');
        setManualDefinition('');
        setManualPhonetic('');
        setManualNotes('');
        
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
    setPreviewImage(null);
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

  const handleSaveVerb = async (verbData: Omit<Verb, 'id'|'subjectId'|'language'>) => {
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
    } catch(e) {
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
            <Link href="/dashboard">Zurück zum Dashboard</Link>
        </Button>
      </div>
    );
  }

  const isAnyVocabSelected = selectedVocab.length > 0;
  const selectedVerbsCount = localVerbs.filter(v => v.isSelected).length;

  return (
    <div className="pb-24">
      {/* Sticky Header */}
      <div className="sticky top-28 md:top-[6.5rem] z-30 p-2 flex items-center justify-between mb-6 w-full max-w-4xl mx-auto group glass-effect shadow-md">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <span className="text-3xl md:text-4xl">{subject?.emoji}</span>
          <h1 className="text-xl md:text-2xl font-bold font-headline truncate">{subject?.name}</h1>
        </div>
        <div className="flex items-center">
          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-2">
            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Pen className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Fach umbenennen</DialogTitle>
                  <DialogDescription>
                    Gib einen neuen Namen für das Fach &quot;{subject?.name}&quot; ein.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="rename-name" className="text-right">Name</Label>
                    <Input
                      id="rename-name"
                      value={renamedSubjectName}
                      onChange={(e) => setRenamedSubjectName(e.target.value)}
                      className="col-span-3"
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameSubject()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Abbrechen</Button>
                  <Button onClick={handleRenameSubject}>Speichern</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird das Fach und alle zugehörigen Stapel und Vokabeln dauerhaft gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSubject}>Löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {/* Mobile dropdown */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
                  <Pen className="mr-2 h-4 w-4" />
                  <span>Umbenennen</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Löschen</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vocabulary">Vokabeln</TabsTrigger>
          <TabsTrigger value="verbs">Verben</TabsTrigger>
        </TabsList>
        <TabsContent value="vocabulary" className="mt-6">
            <div className="flex justify-between items-center mb-4 gap-2">
                <div className="flex-1 flex justify-start">
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Vokabeln durchsuchen..."
                            className="h-10 pl-10 w-full md:w-64"
                            value={vocabSearchQuery}
                            onChange={(e) => setVocabSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                    <AlertDialog open={isDeleteVocabDialogOpen} onOpenChange={setIsDeleteVocabDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" disabled={!isAnyVocabSelected}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden. Es werden {selectedVocab.length} Vokabel(n) dauerhaft gelöscht.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSelectedVocabulary}>Löschen</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Dialog open={isAddVocabDialogOpen} onOpenChange={(open) => {
                        if (open) openAddVocabDialog();
                        else resetAndCloseAddVocabDialog();
                    }}>
                        <DialogTrigger asChild>
                            <Button size="default" disabled={isRunning}>
                                {isRunning ? <Loader2 className="h-4 w-4 md:mr-2 animate-spin" /> : <Plus className="h-4 w-4 md:mr-2" />}
                                <span className="hidden md:inline">Hinzufügen</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[625px]">
                            <DialogHeader>
                                <DialogTitle>Neue Vokabeln hinzufügen</DialogTitle>
                                <DialogDescription>Füge Vokabeln manuell hinzu oder lade ein Bild hoch, um Text zu extrahieren.</DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="ocr">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="ocr"><Upload className="mr-2 h-4 w-4" />aus Bild</TabsTrigger>
                                    <TabsTrigger value="manual"><Pen className="mr-2 h-4 w-4" />Manuell</TabsTrigger>
                                </TabsList>
                                <TabsContent value="ocr" className="pt-4">
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="stack-name-ocr">Stapelname</Label>
                                        <Input id="stack-name-ocr" placeholder="z.B. Lektion 7: Reisen" value={newStackName} onChange={e => setNewStackName(e.target.value)} disabled={!!activeStackId} />
                                    </div>
                                    <div className="grid gap-2">
                                    <Label htmlFor="picture">Bild</Label>
                                    <Input id="picture" type="file" onChange={handleFileChange} accept="image/*" />
                                    </div>
                                </div>
                                <DialogFooter className="pt-4">
                                    <Button onClick={handleExtractAndSaveVocabulary} disabled={!previewImage || !newStackName || isRunning} className="w-full">
                                    {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Extrahieren und Speichern
                                    </Button>
                                </DialogFooter>
                                </TabsContent>
                                <TabsContent value="manual" className="pt-4">
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="stack-name-manual">Stapelname</Label>
                                        <Input id="stack-name-manual" placeholder="z.B. Unregelmässige Verben" value={newStackName} onChange={e => setNewStackName(e.target.value)} disabled={!!activeStackId}/>
                                    </div>
                                    <div className="grid gap-2">
                                    <Label htmlFor="term">Fremdwort</Label>
                                    <Input id="term" placeholder="z.B. la manzana" value={manualTerm} onChange={e => setManualTerm(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                    <Label htmlFor="definition">Deutsches Wort</Label>
                                    <Input id="definition" placeholder="z.B. der Apfel" value={manualDefinition} onChange={e => setManualDefinition(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                    <Label htmlFor="phonetic">Lautschrift (optional)</Label>
                                    <Input id="phonetic" placeholder="z.B. /manˈθana/" value={manualPhonetic} onChange={e => setManualPhonetic(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                    <Label htmlFor="notes">Hinweise (optional)</Label>
                                    <Textarea id="notes" placeholder="Beispielsatz oder Eselsbrücke" value={manualNotes} onChange={e => setManualNotes(e.target.value)} />
                                    </div>
                                </div>
                                <DialogFooter className="pt-4 flex-col gap-2">
                                    <Button variant="outline" onClick={() => handleAddManualVocabulary(false)} disabled={isAddingManually} className="w-full">
                                        {isAddingManually ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                        Hinzufügen & Neu
                                    </Button>
                                    <Button onClick={() => handleAddManualVocabulary(true)} disabled={isAddingManually} className="w-full">
                                        {isAddingManually && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Hinzufügen
                                    </Button>
                                </DialogFooter>
                                </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

          {(stacks?.length ?? 0) === 0 ? (
            <div className="text-center mt-20 text-muted-foreground">
                <Book className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">Noch keine Stapel</h3>
                <p className="text-sm">Füge Vokabeln hinzu, um deinen ersten Stapel zu erstellen.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stacks?.map((stack) => {
                const vocabsForStack = filteredVocabulary[stack.id] || [];
                if (vocabSearchQuery && vocabsForStack.length === 0) {
                    return null;
                }
                return (
                    <StackItem 
                      key={stack.id} 
                      stack={stack}
                      subjectId={subjectId}
                      vocabulary={vocabsForStack}
                      onDelete={() => { forceUpdate(); fetchAllVocab(); }}
                      onRename={() => { forceUpdate(); fetchAllVocab(); }}
                      onSelectionChange={handleSelectionChange}
                      onAddVocab={openAddVocabDialog}
                      onEditVocab={handleEditVocab}
                    />
                )
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="verbs" className="mt-6">
            <div className="flex justify-between items-center mb-4 gap-2">
                <div className="flex-1 flex justify-start">
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Verben durchsuchen..."
                            className="h-10 pl-10 w-full md:w-64"
                            value={verbSearchQuery}
                            onChange={(e) => setVerbSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
              <div className="flex items-center gap-2 justify-end">
                <Dialog open={isTenseSelectionDialogOpen} onOpenChange={setIsTenseSelectionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={selectedVerbsCount === 0} onClick={handleOpenTenseDialog}>
                      <Settings2 className="mr-2 h-4 w-4" />
                      <span className="hidden md:inline">Zeiten auswählen</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <div className="flex justify-between items-start gap-4">
                          <div>
                              <DialogTitle>Zeiten global auswählen</DialogTitle>
                              <DialogDescription>
                              Wähle Zeiten für {selectedVerbsCount} ausgewählte Verben.
                              </DialogDescription>
                          </div>
                          <Button variant="outline" onClick={handleToggleAllTenses} className="text-sm h-8 flex-shrink-0">
                              {allTempTensesSelected ? 'Alle abwählen' : 'Alle auswählen'}
                          </Button>
                      </div>
                    </DialogHeader>
                    <ScrollArea className="max-h-64 -mx-6 px-6">
                      <div className="p-1 space-y-4">
                        {Object.entries(
                          sortedTensesForDialog.reduce((acc, tense) => {
                            const group = Object.keys(tenseOrderConfig).find(key => tenseOrderConfig[key].includes(tense)) || 'Uncategorized';
                            if (!acc[group]) {
                              acc[group] = [];
                            }
                            acc[group].push(tense);
                            return acc;
                          }, {} as Record<string, string[]>)
                        ).map(([groupName, tenses]) => (
                          <div key={groupName}>
                            <h4 className="font-semibold text-sm text-muted-foreground mb-2 px-3">{groupName}</h4>
                            <div className="space-y-2 pl-2">
                              {tenses.map(tense => (
                                <div key={tense} className="flex items-center gap-3">
                                  <Checkbox
                                    id={`global-tense-${tense}`}
                                    checked={tempSelectedTenses.has(tense)}
                                    onCheckedChange={(checked) => handleTempTenseSelection(tense, Boolean(checked))}
                                  />
                                  <Label htmlFor={`global-tense-${tense}`} className="cursor-pointer font-normal">{tense}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsTenseSelectionDialogOpen(false)}>Abbrechen</Button>
                      <Button onClick={handleApplyGlobalTenseSelection}>Anwenden</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>


                <Button onClick={handleAddNewVerb} size="default" disabled={isRunning}>
                    {isRunning ? <Loader2 className="h-4 w-4 md:mr-2 animate-spin" /> : <Plus className="h-4 w-4 md:mr-2" />}
                    <span className="hidden md:inline">Verb hinzufügen</span>
                </Button>
              </div>
          </div>
          <div className="space-y-3">
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
                <div className="text-center mt-20 text-muted-foreground">
                    <WholeWord className="mx-auto h-12 w-12 mb-4" />
                    <h3 className="text-lg font-semibold">Keine Verben gefunden</h3>
                    <p className="text-sm">Füge ein neues Verb hinzu, um zu beginnen.</p>
                </div>
            )}
          </div>
        </TabsContent>
      </Tabs>


      {/* Floating Action Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto mx-auto z-40">
         <div className="p-2 flex items-center justify-between gap-2 glass-effect rounded-full">
            {activeTab === 'vocabulary' && (
              <>
                <Button 
                    className="rounded-full text-base px-8" 
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
                    className="rounded-full text-base px-8" 
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
      {editingVocab && (
        <VocabDialog 
            isOpen={isVocabDialogOpen}
            onOpenChange={setIsVocabDialogOpen}
            vocabItem={editingVocab}
            subjectId={subjectId}
            onSave={handleSaveVocab}
        />
      )}
    </div>
  );
}
