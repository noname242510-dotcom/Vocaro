'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import type { Group, PublicProfile, Subject, Stack, VocabularyItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Users, Trophy, BookCopy, UserPlus, Plus, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AddMemberDialog } from './_components/AddMemberDialog';

// --- Sub-Components for this Page ---

// --- LEADERBOARD ---
type LeaderboardEntry = {
    userId: string;
    displayName: string;
    photoURL?: string;
    score: number;
}

function LeaderboardTab({ group }: { group: Group }) {
    const { firestore } = useFirebase();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !group?.memberIds?.length) {
            setIsLoading(false);
            return;
        }

        const fetchLeaderboardData = async () => {
            setIsLoading(true);
            try {
                const profilesRef = collection(firestore, 'publicProfiles');
                const profilesQuery = query(profilesRef, where('__name__', 'in', group.memberIds.slice(0, 30)));
                const profilesSnapshot = await getDocs(profilesQuery);
                const profiles = profilesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicProfile));

                const thirtyDaysAgo = new Timestamp(Timestamp.now().seconds - 30 * 24 * 60 * 60, 0);

                const scorePromises = profiles.map(async (member) => {
                    let score = 0;
                    const sessionsRef = collection(firestore, 'users', member.id, 'learningSessions');
                    const sessionsQuery = query(sessionsRef, where('startTime', '>=', thirtyDaysAgo));
                    const sessionsSnapshot = await getDocs(sessionsQuery);

                    for (const sessionDoc of sessionsSnapshot.docs) {
                        const vocabAnswersRef = collection(sessionDoc.ref, 'vocabulary');
                        const verbAnswersRef = collection(sessionDoc.ref, 'verbAnswers');

                        const [vocabAnswersSnap, verbAnswersSnap] = await Promise.all([
                            getDocs(query(vocabAnswersRef, where('correct', '==', true))),
                            getDocs(query(verbAnswersRef, where('correct', '==', true))),
                        ]);

                        score += vocabAnswersSnap.size;
                        score += verbAnswersSnap.size;
                    }

                    return { userId: member.id, displayName: member.displayName, photoURL: member.photoURL, score };
                });

                const results = await Promise.all(scorePromises);
                results.sort((a, b) => b.score - a.score);
                setLeaderboard(results);
            } catch (error) {
                console.error("Failed to fetch leaderboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboardData();
    }, [firestore, group]);

    const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : '');

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (leaderboard.length === 0) {
        return <p className="text-center text-muted-foreground py-10">Noch keine Lernaktivitäten in den letzten 30 Tagen.</p>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Leaderboard (Letzte 30 Tage)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {leaderboard.map((entry, index) => (
                    <div key={entry.userId} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <span className="font-bold text-lg w-6 text-center">{index + 1}</span>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={entry.photoURL} />
                            <AvatarFallback>{getInitials(entry.displayName)}</AvatarFallback>
                        </Avatar>
                        <p className="font-semibold flex-1">{entry.displayName}</p>
                        <p className="font-bold text-lg">{entry.score}</p>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

// --- SHARED DATABASE ---

function CopyVocabDialog({ vocab, isOpen, onOpenChange }: { vocab: VocabularyItem | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [selectedStackId, setSelectedStackId] = useState<string | undefined>();
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();

    const userSubjectsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'subjects');
    }, [user, firestore]);
    const { data: userSubjects } = useCollection<Subject>(userSubjectsQuery);

    const userStacksQuery = useMemoFirebase(() => {
        if (!user || !firestore || !selectedSubjectId) return null;
        return collection(firestore, 'users', user.uid, 'subjects', selectedSubjectId, 'stacks');
    }, [user, firestore, selectedSubjectId]);
    const { data: userStacks } = useCollection<Stack>(userStacksQuery);

    useEffect(() => {
        setSelectedStackId(undefined); // Reset stack when subject changes
    }, [selectedSubjectId]);

    const handleSave = async () => {
        if (!vocab || !selectedSubjectId || !selectedStackId || !user || !firestore) {
            toast({ variant: 'destructive', title: 'Fehler', description: 'Bitte wähle ein Fach und einen Stapel aus.' });
            return;
        };
        setIsSaving(true);
        try {
            const stackVocabRef = collection(firestore, 'users', user.uid, 'subjects', selectedSubjectId, 'stacks', selectedStackId, 'vocabulary');

            // Check for duplicates
            const q = query(stackVocabRef, where('term', '==', vocab.term));
            const existingDocs = await getDocs(q);
            if (!existingDocs.empty) {
                toast({ variant: 'default', title: 'Hinweis', description: `Vokabel "${vocab.term}" existiert bereits in diesem Stapel.` });
                onOpenChange(false);
                return;
            }

            await addDoc(stackVocabRef, {
                term: vocab.term,
                definition: vocab.definition,
                phonetic: vocab.phonetic || '',
                notes: vocab.notes || '',
                relatedWord: vocab.relatedWord || null,
                isMastered: false,
                source: 'manual',
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Kopiert!', description: `Vokabel "${vocab.term}" wurde zu deinem Stapel hinzugefügt.` });
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Fehler', description: 'Vokabel konnte nicht kopiert werden.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Vokabel kopieren</DialogTitle>
                    <DialogDescription>Kopiere "{vocab?.term}" in einen deiner Stapel.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Select onValueChange={setSelectedSubjectId}>
                        <SelectTrigger><SelectValue placeholder="Wähle ein Fach" /></SelectTrigger>
                        <SelectContent>
                            {userSubjects?.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select onValueChange={setSelectedStackId} disabled={!selectedSubjectId || !userStacks}>
                        <SelectTrigger><SelectValue placeholder="Wähle einen Stapel" /></SelectTrigger>
                        <SelectContent>
                            {userStacks?.map(stack => <SelectItem key={stack.id} value={stack.id}>{stack.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
                    <Button onClick={handleSave} disabled={isSaving || !selectedStackId}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Kopieren
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function BulkCopyDialog({ sourceStack, sourceVocabs, isOpen, onOpenChange }: {
    sourceStack: Stack | null,
    sourceVocabs: VocabularyItem[],
    isOpen: boolean,
    onOpenChange: (open: boolean) => void
}) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [selectedStackId, setSelectedStackId] = useState<string | undefined>();
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();

    const userSubjectsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'subjects');
    }, [user, firestore]);
    const { data: userSubjects } = useCollection<Subject>(userSubjectsQuery);

    const userStacksQuery = useMemoFirebase(() => {
        if (!user || !firestore || !selectedSubjectId) return null;
        return collection(firestore, 'users', user.uid, 'subjects', selectedSubjectId, 'stacks');
    }, [user, firestore, selectedSubjectId]);
    const { data: userStacks } = useCollection<Stack>(userStacksQuery);

    useEffect(() => {
        setSelectedStackId(undefined); // Reset stack when subject changes
    }, [selectedSubjectId]);

    const handleSave = async () => {
        if (!sourceStack || !selectedSubjectId || !selectedStackId || !user || !firestore) {
            toast({ variant: 'destructive', title: 'Fehler', description: 'Bitte wähle ein Ziel-Fach und einen Ziel-Stapel aus.' });
            return;
        }

        if (sourceVocabs.length === 0) {
            toast({ variant: 'default', title: 'Hinweis', description: 'Dieser Stapel ist leer.' });
            onOpenChange(false);
            return;
        }

        setIsSaving(true);
        try {
            const targetStackVocabRef = collection(firestore, 'users', user.uid, 'subjects', selectedSubjectId, 'stacks', selectedStackId, 'vocabulary');

            // Get existing vocabs in the target stack to prevent duplicates
            const existingVocabsSnapshot = await getDocs(targetStackVocabRef);
            const existingTerms = new Set(existingVocabsSnapshot.docs.map(doc => doc.data().term.toLowerCase().trim()));

            let addedCount = 0;
            let duplicateCount = 0;

            // Prepare batches (Firestore max 500 writes per batch, but we do them individually or in smaller logic chunks for simplicity here)
            // Using a simple loop for clarity, though writeBatch is preferred for very large sets. For typical vocab it's fine.
            const batch = writeBatch(firestore);
            let operationsInBatch = 0;

            for (const vocab of sourceVocabs) {
                const termLower = vocab.term.toLowerCase().trim();
                if (!existingTerms.has(termLower)) {
                    const newDocRef = doc(targetStackVocabRef);
                    batch.set(newDocRef, {
                        term: vocab.term,
                        definition: vocab.definition,
                        phonetic: vocab.phonetic || '',
                        notes: vocab.notes || '',
                        relatedWord: vocab.relatedWord || null,
                        isMastered: false,
                        source: 'manual', // or maybe 'copied_from_group'
                        createdAt: serverTimestamp(),
                    });
                    existingTerms.add(termLower); // Prevent duplicates within the same batch
                    addedCount++;
                    operationsInBatch++;

                    // Commit batch if we hit limit (rarely needed for vocab, but safe)
                    if (operationsInBatch === 490) {
                        await batch.commit();
                        operationsInBatch = 0;
                    }
                } else {
                    duplicateCount++;
                }
            }

            if (operationsInBatch > 0) {
                await batch.commit();
            }

            if (addedCount > 0) {
                toast({ title: 'Erfolgreich kopiert!', description: `${addedCount} Vokabeln aus "${sourceStack.name}" hinzugefügt. ${duplicateCount > 0 ? `(${duplicateCount} Duplikate ignoriert)` : ''}` });
            } else {
                toast({ title: 'Keine neuen Vokabeln', description: `Alle Vokabeln aus diesem Stapel (oder ignorierte Duplikate) existieren bereits in deinem Ziel-Stapel.` });
            }

            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Fehler beim Kopieren', description: 'Es ist ein Fehler aufgetreten.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Stapel übernehmen</DialogTitle>
                    <DialogDescription>Importiere alle {sourceVocabs.length} Vokabeln aus "{sourceStack?.name}" in einen deiner Stapel.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Select onValueChange={setSelectedSubjectId}>
                        <SelectTrigger><SelectValue placeholder="Wähle das Ziel-Fach" /></SelectTrigger>
                        <SelectContent>
                            {userSubjects?.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select onValueChange={setSelectedStackId} disabled={!selectedSubjectId || !userStacks}>
                        <SelectTrigger><SelectValue placeholder="Wähle den Ziel-Stapel" /></SelectTrigger>
                        <SelectContent>
                            {userStacks?.map(stack => <SelectItem key={stack.id} value={stack.id}>{stack.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
                    <Button onClick={handleSave} disabled={isSaving || !selectedStackId}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Stapel kopieren
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function SubjectStacks({ subject, ownerId, searchTerm }: { subject: Subject; ownerId: string; searchTerm: string; }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [vocabToCopy, setVocabToCopy] = useState<VocabularyItem | null>(null);
    const [bulkCopyData, setBulkCopyData] = useState<{ stack: Stack, vocabs: VocabularyItem[] } | null>(null);

    const stacksQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'users', ownerId, 'subjects', subject.id, 'stacks');
    }, [firestore, ownerId, subject.id]);
    const { data: stacks, isLoading } = useCollection<Stack>(stacksQuery);

    const handleCopyClick = (vocab: VocabularyItem | null, stack: Stack, vocabulary: VocabularyItem[]) => {
        if (ownerId === user?.uid) {
            toast({ description: "Das gehört bereits dir.", variant: 'default' });
            return;
        }

        if (vocab) {
            setVocabToCopy(vocab);
        } else {
            // Initiate Bulk Copy
            setBulkCopyData({ stack, vocabs: vocabulary });
        }
    };

    // If there's a searchTerm we need to match it against subject name, stack name, or vocab items.
    // If the subject matches, show all stacks. Wait, actually we can just pass the searchTerm down to StackVocab.
    // However, if we filter, we might want to auto-expand. Let's handle filtering inside StackVocab or here.
    const lowerSearch = searchTerm.toLowerCase().trim();
    const subjectMatches = lowerSearch ? subject.name.toLowerCase().includes(lowerSearch) : true;

    // We render the Stacks and pass the search term.
    // If no stack matches and subject doesn't match, we might want to hide the subject. This requires lifting state,
    // but for simplicity, we pass down the search term and let the UI just show empty things or we can filter here.
    // Since Firebase data loads asynchronously, we let it render and filter the final view.

    return (
        <>
            <Accordion type="multiple" className="w-full space-y-2" value={lowerSearch ? stacks?.map(s => s.id) : undefined}>
                {isLoading && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
                {stacks?.map(stack => <StackVocab key={stack.id} stack={stack} ownerId={ownerId} onCopy={handleCopyClick} searchTerm={searchTerm} subjectMatches={subjectMatches} />)}
            </Accordion>
            <CopyVocabDialog vocab={vocabToCopy} isOpen={!!vocabToCopy} onOpenChange={(open) => !open && setVocabToCopy(null)} />
            <BulkCopyDialog
                sourceStack={bulkCopyData?.stack || null}
                sourceVocabs={bulkCopyData?.vocabs || []}
                isOpen={!!bulkCopyData}
                onOpenChange={(open) => !open && setBulkCopyData(null)}
            />
        </>
    );
}

function StackVocab({ stack, ownerId, onCopy, searchTerm, subjectMatches }: { stack: Stack, ownerId: string, onCopy: (vocab: VocabularyItem | null, stack: Stack, vocabulary: VocabularyItem[]) => void, searchTerm: string, subjectMatches: boolean }) {
    const { firestore } = useFirebase();
    const vocabQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'users', ownerId, 'subjects', stack.subjectId, 'stacks', stack.id, 'vocabulary');
    }, [firestore, ownerId, stack.subjectId, stack.id]);
    const { data: vocabulary, isLoading } = useCollection<VocabularyItem>(vocabQuery);

    const lowerSearch = searchTerm.toLowerCase().trim();
    const stackMatches = lowerSearch ? stack.name.toLowerCase().includes(lowerSearch) : true;

    let filteredVocab = vocabulary;

    if (lowerSearch && !subjectMatches && !stackMatches && vocabulary) {
        filteredVocab = vocabulary.filter(v =>
            v.term.toLowerCase().includes(lowerSearch) ||
            (v.definition && v.definition.toLowerCase().includes(lowerSearch))
        );
    }

    // Hide stack entirely if it's a search and nothing matches
    if (lowerSearch && !subjectMatches && !stackMatches && (!filteredVocab || filteredVocab.length === 0)) {
        return null; // Stack and its contents don't match the search
    }

    return (
        <AccordionItem value={stack.id} className="border-b-0">
            <AccordionTrigger className="hover:no-underline bg-muted/30 px-3 rounded-md">
                {stack.name} <Badge variant="secondary" className="ml-2">{filteredVocab?.length ?? 0}</Badge>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
                <div className="flex justify-end pr-2 mb-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary/80"
                        onClick={() => onCopy(null, stack, filteredVocab || [])} // Bulk Copy remaining filtered vocabs or all
                    >
                        <BookCopy className="mr-2 h-4 w-4" /> Stapel übernehmen
                    </Button>
                </div>
                {isLoading && <Loader2 className="mx-auto h-4 w-4 animate-spin" />}
                <div className="pl-4 space-y-1">
                    {filteredVocab?.map(vocab => (
                        <div key={vocab.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50 group">
                            <div>
                                <p className="font-medium">{vocab.term}</p>
                                <p className="text-muted-foreground">{vocab.definition}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:bg-primary/10" onClick={() => onCopy(vocab, stack, filteredVocab || [])}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    {filteredVocab?.length === 0 && !isLoading && (
                        <p className="text-muted-foreground text-sm py-2">Keine Treffer in diesem Stapel.</p>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    )
}

function MemberSubjects({ member, searchTerm }: { member: PublicProfile; searchTerm: string; }) {
    const { firestore } = useFirebase();
    const subjectsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'users', member.id, 'subjects');
    }, [firestore, member.id]);
    const { data: subjects, isLoading } = useCollection<Subject>(subjectsQuery);

    const lowerSearch = searchTerm.toLowerCase().trim();

    return (
        <AccordionItem value={member.id} className="border-b-0">
            <AccordionTrigger className="hover:no-underline bg-muted px-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarImage src={member.photoURL} /><AvatarFallback>{member.displayName.charAt(0)}</AvatarFallback></Avatar>
                    <span className="font-semibold">{member.displayName}</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
                <div className="pl-6 pr-2 space-y-2">
                    {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                    {!isLoading && (!subjects || subjects.length === 0) && <p className="text-sm text-muted-foreground">Keine öffentlichen Fächer.</p>}
                    {subjects?.map(subject => {
                        const subjectMatches = lowerSearch ? subject.name.toLowerCase().includes(lowerSearch) : false;
                        return (
                            <Accordion key={subject.id} type="multiple" className="w-full" value={lowerSearch || subjectMatches ? [subject.id] : undefined}>
                                <AccordionItem value={subject.id} className="border-b-0">
                                    <AccordionTrigger className="hover:no-underline bg-muted/50 px-3 rounded-md">
                                        {subject.emoji} {subject.name}
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2">
                                        <div className="pl-4">
                                            <SubjectStacks subject={subject} ownerId={member.id} searchTerm={searchTerm} />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        )
                    })}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

function DatabaseTab({ group }: { group: Group }) {
    const { firestore, user } = useFirebase();
    const [members, setMembers] = useState<PublicProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!firestore || !user || !group.memberIds) return;
        const fetchMembers = async () => {
            setIsLoading(true);
            const profilesRef = collection(firestore, 'publicProfiles');
            const q = query(profilesRef, where('__name__', 'in', group.memberIds.slice(0, 30)));
            const snapshot = await getDocs(q);
            setMembers(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as PublicProfile)));
            setIsLoading(false);
        };
        fetchMembers();
    }, [firestore, user, group.memberIds]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    const lowerSearch = searchTerm.toLowerCase().trim();
    // In order to auto-open members, we can set the default value of the Accordion if there's a search term
    const activeMembers = lowerSearch ? members.map(m => m.id) : undefined;

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="In der Gruppendatenbank suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
            <Accordion type="multiple" className="w-full space-y-2" value={activeMembers}>
                {members.map(member => <MemberSubjects key={member.id} member={member} searchTerm={searchTerm} />)}
            </Accordion>
        </div>
    );
}

// --- MAIN COMPONENT ---

export default function GroupDetailPage() {
    const params = useParams();
    const router = useRouter();
    const groupId = params.groupId as string;
    const { firestore, user } = useFirebase();
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

    const groupDocRef = useMemoFirebase(() => {
        if (!firestore || !groupId) return null;
        return doc(firestore, 'groups', groupId);
    }, [firestore, groupId]);

    const { data: group, isLoading: isGroupLoading, forceUpdate } = useDoc<Group>(groupDocRef);

    if (isGroupLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-muted-foreground" /></div>;
    }

    if (!group) {
        return (
            <div className="text-center mt-20">
                <h2 className="text-xl font-bold">Gruppe nicht gefunden</h2>
                <Button variant="link" onClick={() => router.back()}>Zurück</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/groups')} className="flex-shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex flex-col items-center flex-grow">
                    <h1 className="text-3xl font-bold font-headline text-center">{group.name}</h1>
                    <p className="text-muted-foreground">{group.memberCount} Mitglieder</p>
                </div>
                <div className="flex-shrink-0">
                    <Button onClick={() => setIsAddMemberOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Mitglieder hinzufügen
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="leaderboard" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="leaderboard"><Trophy className="mr-2 h-4 w-4" />Leaderboard</TabsTrigger>
                    <TabsTrigger value="database"><BookCopy className="mr-2 h-4 w-4" />Vokabel-DB</TabsTrigger>
                </TabsList>
                <TabsContent value="leaderboard" className="mt-6">
                    <LeaderboardTab group={group} />
                </TabsContent>
                <TabsContent value="database" className="mt-6">
                    <DatabaseTab group={group} />
                </TabsContent>
            </Tabs>
            <AddMemberDialog group={group} isOpen={isAddMemberOpen} onOpenChange={setIsAddMemberOpen} onInviteSent={forceUpdate} />
        </div>
    );
}
