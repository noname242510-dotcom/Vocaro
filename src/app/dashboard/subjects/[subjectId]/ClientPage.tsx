'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import type { Subject, Stack, Verb, VocabularyItem, GenerateVerbFormsOutput } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  ArrowLeft, 
  Loader2, 
  Settings2, 
  WholeWord, 
  ArrowRight,
  BookOpen,
  Image as ImageIcon,
  Type,
  Search,
  MoreVertical,
  X,
  Target
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { suggestVocabularyFromImageContext } from '@/ai/flows/suggest-vocabulary-from-image-context';
import { generateVocabularyFromExtractedText } from '@/ai/flows/generate-vocabulary-from-extracted-text';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StackItem } from './_components/stack-item';
import { VerbCard } from './_components/verb-card';
import { VerbDialog } from './_components/verb-dialog';
import { VocabDialog } from './_components/vocab-dialog';

const tenseOrderConfig: Record<string, string[]> = {
  'Indikativ': ['Präsent', 'Präteritum', 'Perfekt', 'Plusquamperfekt', 'Futur I', 'Futur II'],
  'Konjunktiv': ['Konjunktiv I', 'Konjunktiv II'],
  'Imperativ': ['Imperativ'],
  'Partizip': ['Partizip I', 'Partizip II']
};

export default function SubjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const subjectId = params.subjectId as string;
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'vocabulary';
  
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isVerbDialogOpen, setIsVerbDialogOpen] = useState(false);
  const [editingVerb, setEditingVerb] = useState<Verb | undefined>(undefined);
  const [isTenseSelectionDialogOpen, setIsTenseSelectionDialogOpen] = useState(false);
  const [tempSelectedTenses, setTempSelectedTenses] = useState<Set<string>>(new Set());
  const [selectedVerbsCount, setSelectedVerbsCount] = useState(0);
  const [allVocabulary, setAllVocabulary] = useState<Record<string, VocabularyItem[]>>({});
  const [vocabSearchQuery, setVocabSearchQuery] = useState('');
  const [isAddVocabDialogOpen, setIsAddVocabDialogOpen] = useState(false);
  const [currentStackForAdd, setCurrentStackForAdd] = useState<Stack | null>(null);
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [manualTerm, setManualTerm] = useState('');
  const [manualDefinition, setManualDefinition] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [isVocabDialogOpen, setIsVocabDialogOpen] = useState(false);
  const [editingVocab, setEditingVocab] = useState<VocabularyItem | null>(null);
  
  const subjectDocRef = useMemoFirebase(() => {
    if (!firestore || !user || !subjectId) return null;
    return doc(firestore, 'users', user.uid, 'subjects', subjectId);
  }, [firestore, user, subjectId]);
  
  const { data: subject, isLoading: isSubjectLoading } = useDoc<Subject>(subjectDocRef);
  
  const stacksCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user || !subjectId) return null;
    return collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks');
  }, [firestore, user, subjectId]);
  
  const { data: stacks, isLoading: areStacksLoading } = useCollection<Stack>(stacksCollectionRef);
  
  const verbsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user || !subjectId) return null;
    return collection(firestore, 'users', user.uid, 'subjects', subjectId, 'verbs');
  }, [firestore, user, subjectId]);
  
  const { data: verbs, isLoading: areVerbsLoading } = useCollection<Verb>(verbsCollectionRef);

  const [, setUpdateTrigger] = useState(0);
  const forceUpdate = useCallback(() => setUpdateTrigger(v => v + 1), []);

  useEffect(() => {
    if (stacks && firestore && user && subjectId) {
      const fetchAllVocab = async () => {
        const vocabMap: Record<string, VocabularyItem[]> = {};
        for (const stack of stacks) {
          const vocabCollectionRef = collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stack.id, 'vocabulary');
          const vocabSnapshot = await getDocs(vocabCollectionRef);
          vocabMap[stack.id] = vocabSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as VocabularyItem));
        }
        setAllVocabulary(vocabMap);
      };
      fetchAllVocab();
    }
  }, [stacks, firestore, user, subjectId]);

  const filteredVocabulary = useMemo(() => {
    if (!vocabSearchQuery) return allVocabulary;
    const lowerQuery = vocabSearchQuery.toLowerCase();
    const result: Record<string, VocabularyItem[]> = {};
    Object.entries(allVocabulary).forEach(([stackId, items]) => {
      result[stackId] = items.filter(item => 
        item.term.toLowerCase().includes(lowerQuery) || 
        item.definition.toLowerCase().includes(lowerQuery)
      );
    });
    return result;
  }, [allVocabulary, vocabSearchQuery]);

  const filteredVerbs = useMemo(() => {
    if (!verbs) return [];
    return verbs;
  }, [verbs]);

  const selectedVerbsCountFromList = useMemo(() => {
    if (!verbs) return 0;
    return verbs.filter(v => v.isSelected).length;
  }, [verbs]);

  useEffect(() => {
    setSelectedVerbsCount(selectedVerbsCountFromList);
  }, [selectedVerbsCountFromList]);

  const handleAddNewVerb = () => {
    setEditingVerb(undefined);
    setIsVerbDialogOpen(true);
  };

  const handleEditVerb = (verb: Verb) => {
    setEditingVerb(verb);
    setIsVerbDialogOpen(true);
  };

  const handleDeleteVerb = async (verbId: string) => {
    if (!firestore || !user || !subjectId) return;
    try {
      await deleteDoc(doc(firestore, 'users', user.uid, 'subjects', subjectId, 'verbs', verbId));
      toast({ title: 'Verb gelöscht' });
    } catch (error) {
       toast({ title: 'Fehler beim Löschen', variant: 'destructive' });
    }
  };

  const handleSaveVerb = async (verbData: Partial<Verb>) => {
    if (!firestore || !user || !subjectId) return;
    try {
      if (editingVerb) {
        await updateDoc(doc(firestore, 'users', user.uid, 'subjects', subjectId, 'verbs', editingVerb.id), verbData);
        toast({ title: 'Verb aktualisiert' });
      } else {
        await addDoc(collection(firestore, 'users', user.uid, 'subjects', subjectId, 'verbs'), {
          ...verbData,
          createdAt: serverTimestamp(),
          isSelected: true
        });
        toast({ title: 'Verb hinzugefügt' });
      }
    } catch (error) {
      toast({ title: 'Fehler beim Speichern', variant: 'destructive' });
    }
  };

  const handleVerbSelectionChange = async (verbId: string, isSelected: boolean) => {
    if (!firestore || !user || !subjectId) return;
    await updateDoc(doc(firestore, 'users', user.uid, 'subjects', subjectId, 'verbs', verbId), {
      isSelected
    });
  };

  const handleTenseSelectionChange = async (verbId: string, tense: string, isSelected: boolean) => {
    if (!firestore || !user || !subjectId || !verbs) return;
    const verb = verbs.find(v => v.id === verbId);
    if (!verb) return;
    
    const newTenses = isSelected 
      ? [...(verb.selectedTenses || []), tense]
      : (verb.selectedTenses || []).filter(t => t !== tense);
      
    await updateDoc(doc(firestore, 'users', user.uid, 'subjects', subjectId, 'verbs', verbId), {
      selectedTenses: newTenses
    });
  };

  const handleOpenTenseDialog = () => {
    const selectedVerbs = verbs?.filter(v => v.isSelected) || [];
    const commonTenses = new Set<string>();
    if (selectedVerbs.length > 0) {
      selectedVerbs[0].selectedTenses?.forEach(t => commonTenses.add(t));
      // For global, maybe just start fresh or with the first one's tenses
    }
    setTempSelectedTenses(commonTenses);
    setIsTenseSelectionDialogOpen(true);
  };

  const handleTempTenseSelection = (tense: string, isSelected: boolean) => {
    const newSelected = new Set(tempSelectedTenses);
    if (isSelected) newSelected.add(tense);
    else newSelected.delete(tense);
    setTempSelectedTenses(newSelected);
  };

  const handleApplyGlobalTenseSelection = async () => {
    if (!firestore || !user || !subjectId || !verbs) return;
    const selectedVerbs = verbs.filter(v => v.isSelected);
    const batch = writeBatch(firestore);
    const tensesArray = Array.from(tempSelectedTenses);
    
    selectedVerbs.forEach(verb => {
      const vRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'verbs', verb.id);
      batch.update(vRef, { selectedTenses: tensesArray });
    });
    
    await batch.commit();
    setIsTenseSelectionDialogOpen(false);
    toast({ title: 'Zeiten für alle ausgewählten Verben aktualisiert' });
  };

  const sortedTensesForDialog = useMemo(() => {
    const allPossible = Object.values(tenseOrderConfig).flat();
    return allPossible;
  }, []);

  const allTempTensesSelected = sortedTensesForDialog.length > 0 && 
    sortedTensesForDialog.every(t => tempSelectedTenses.has(t));

  const handleToggleAllTenses = () => {
    if (allTempTensesSelected) {
      setTempSelectedTenses(new Set());
    } else {
      setTempSelectedTenses(new Set(sortedTensesForDialog));
    }
  };

  const openAddVocabDialog = (stack: Stack) => {
    setCurrentStackForAdd(stack);
    setIsAddVocabDialogOpen(true);
  };

  const handleAddManualVocabulary = async (shouldClose = false) => {
    if (!firestore || !user || !subjectId || !currentStackForAdd || !manualTerm || !manualDefinition) return;
    setIsAddingManually(true);
    try {
      const vocabRef = collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', currentStackForAdd.id, 'vocabulary');
      await addDoc(vocabRef, {
        term: manualTerm,
        definition: manualDefinition,
        notes: manualNotes,
        createdAt: serverTimestamp(),
        masteryLevel: 0,
        nextReview: serverTimestamp()
      });
      setManualTerm('');
      setManualDefinition('');
      setManualNotes('');
      if (shouldClose) setIsAddVocabDialogOpen(false);
      forceUpdate();
      toast({ title: 'Vokabel hinzugefügt' });
    } catch (e) {
      toast({ title: 'Fehler beim Hinzufügen', variant: 'destructive' });
    } finally {
      setIsAddingManually(false);
    }
  };

  const handleEditVocab = (item: VocabularyItem) => {
    setEditingVocab(item);
    setIsVocabDialogOpen(true);
  };

  const handleSaveVocab = async (stackId: string, vocabId: string, data: Partial<VocabularyItem>) => {
    if (!firestore || !user || !subjectId) return;
    await updateDoc(doc(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stackId, 'vocabulary', vocabId), data);
    forceUpdate();
  };

  const [selectedVocabIds, setSelectedVocabIds] = useState<Record<string, Set<string>>>({});
  const handleSelectionChange = (stackId: string, ids: Set<string>) => {
    setSelectedVocabIds(prev => ({ ...prev, [stackId]: ids }));
  };

  const isAnyVocabSelected = Object.values(selectedVocabIds).some(s => s.size > 0);

  const handleStartLearning = () => {
    const flatIds: string[] = [];
    Object.entries(selectedVocabIds).forEach(([stackId, ids]) => {
      ids.forEach(id => flatIds.push(`${stackId}:${id}`));
    });
    router.push(`/dashboard/subjects/${subjectId}/learn?ids=${flatIds.join(',')}`);
  };

  const handleStartVerbPractice = () => {
    router.push(`/dashboard/subjects/${subjectId}/learn?tab=verbs`);
  };

  const getLanguageFromSubject = (name: string | undefined): 'en' | 'fr' | 'de' | 'es' | 'it' => {
    const l = name?.toLowerCase() || '';
    if (l.includes('englisch') || l.includes('english')) return 'en';
    if (l.includes('franz') || l.includes('french')) return 'fr';
    if (l.includes('span') || l.includes('spanish')) return 'es';
    if (l.includes('italien') || l.includes('italian')) return 'it';
    return 'en';
  };

  const getVerbLearnButtonText = () => {
    if (selectedVerbsCount === 1) return 'Verb lernen';
    return `${selectedVerbsCount} Verben lernen`;
  };

  if (isSubjectLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-4xl mx-auto pb-32">
       <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/facher')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-5xl">{subject?.emoji}</span>
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tight">{subject?.name}</h1>
            <p className="text-muted-foreground text-lg">Dein Lernbereich für {subject?.name}</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-secondary/50 rounded-2xl mb-12">
          <TabsTrigger value="vocabulary" className="rounded-xl text-lg font-bold data-[state=active]:shadow-lg">
            <BookOpen className="mr-2 h-5 w-5" /> Vokabeln
          </TabsTrigger>
          <TabsTrigger value="verbs" className="rounded-xl text-lg font-bold data-[state=active]:shadow-lg">
            <Type className="mr-2 h-5 w-5" /> Verben
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vocabulary" className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/30 p-6 rounded-[2.5rem] border shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
              <Input 
                placeholder="Vokabeln durchsuchen..." 
                className="pl-12 h-14 rounded-2xl bg-background/50 border-none shadow-inner text-lg"
                value={vocabSearchQuery}
                onChange={(e) => setVocabSearchQuery(e.target.value)}
              />
            </div>
            
              <Dialog open={isAddVocabDialogOpen} onOpenChange={setIsAddVocabDialogOpen}>
                  <DialogContent className="rounded-[2.5rem] p-10 max-w-xl">
                      <DialogHeader>
                          <DialogTitle className="text-3xl font-bold font-headline">Vokabeln hinzufügen</DialogTitle>
                          <DialogDescription className="text-lg">Wie möchtest du neue Vokabeln in "{currentStackForAdd?.name}" hinzufügen?</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4 my-6">
                        <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl border-2 hover:bg-primary/5 hover:border-primary">
                          <ImageIcon className="h-6 w-6" /> Bild-OCR
                        </Button>
                        <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl border-2 hover:bg-primary/5 hover:border-primary">
                          <Target className="h-6 w-6" /> Batch-AI
                        </Button>
                      </div>
                      <Tabs defaultValue="manual">
                          <TabsList className="grid w-full grid-cols-1 h-12 p-1 bg-secondary/50 rounded-xl mb-6">
                              <TabsTrigger value="manual" className="rounded-lg font-bold">Manuell eingeben</TabsTrigger>
                          </TabsList>
                          <TabsContent value="manual" className="space-y-6">
                              <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                          <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Begriff</Label>
                                          <Input value={manualTerm} onChange={(e) => setManualTerm(e.target.value)} placeholder="z.B. Hello" className="h-12 rounded-xl" />
                                      </div>
                                      <div className="space-y-2">
                                          <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Bedeutung</Label>
                                          <Input value={manualDefinition} onChange={(e) => setManualDefinition(e.target.value)} placeholder="z.B. Hallo" className="h-12 rounded-xl" />
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
