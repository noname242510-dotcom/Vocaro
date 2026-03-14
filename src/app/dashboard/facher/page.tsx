'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { collection, getDocs, orderBy, query, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen, Layers, ChevronRight, Loader2, Plus, ArrowRight, Trash2, Pen
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Subject, Stack } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


export default function SubjectsPage() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
    const [renamedSubjectName, setRenamedSubjectName] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            if (!firestore || !user) return;

            try {
                const subjectsRef = collection(firestore, 'users', user.uid, 'subjects');
                const q = query(subjectsRef, orderBy('name'));
                const subjectsSnap = await getDocs(q);
                const allSubjects = await Promise.all(subjectsSnap.docs.map(async (doc) => {
                    const subjectData = doc.data() as Subject;
                    const stacksRef = collection(doc.ref, 'stacks');
                    const verbsRef = collection(doc.ref, 'verbs');
                    const [stacksSnap, verbsSnap] = await Promise.all([
                        getDocs(stacksRef),
                        getDocs(verbsRef)
                    ]);
                    return {
                        ...subjectData,
                        id: doc.id,
                        stackCount: stacksSnap.size,
                        verbCount: verbsSnap.size,
                    };
                }));
                setSubjects(allSubjects);
            } catch (e) {
                console.error('Error fetching subjects:', e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [firestore, user]);

    const handleRename = async () => {
        if (!editingSubject || !renamedSubjectName.trim() || !user || !firestore) return;
        
        const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', editingSubject.id);
        try {
            await updateDoc(subjectDocRef, { name: renamedSubjectName.trim() });
            toast({ title: 'Erfolg', description: 'Fach umbenannt.' });
            setSubjects(subjects.map(s => s.id === editingSubject.id ? { ...s, name: renamedSubjectName.trim() } : s));
            setEditingSubject(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Fehler', description: 'Das Fach konnte nicht umbenannt werden.' });
        }
    };
    
    const handleDelete = async () => {
        if (!deletingSubject || !user || !firestore) return;

        const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', deletingSubject.id);
        try {
            const batch = writeBatch(firestore);
            
            const stacksRef = collection(subjectDocRef, 'stacks');
            const stacksSnap = await getDocs(stacksRef);
            for (const stackDoc of stacksSnap.docs) {
                const vocabRef = collection(stackDoc.ref, 'vocabulary');
                const vocabSnap = await getDocs(vocabRef);
                vocabSnap.forEach(vocabDoc => batch.delete(vocabDoc.ref));
                batch.delete(stackDoc.ref);
            }
            
            const verbsRef = collection(subjectDocRef, 'verbs');
            const verbsSnap = await getDocs(verbsRef);
            verbsSnap.forEach(verbDoc => batch.delete(verbDoc.ref));

            batch.delete(subjectDocRef);

            await batch.commit();
            toast({ title: "Erfolg", description: `Fach "${deletingSubject.name}" wurde gelöscht.` });
            setSubjects(subjects.filter(s => s.id !== deletingSubject.id));
            setDeletingSubject(null);
        } catch (error) {
            console.error("Error deleting subject:", error);
            toast({ variant: 'destructive', title: "Fehler", description: "Das Fach konnte nicht gelöscht werden." });
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-12 pb-28 md:pb-12 animate-in fade-in duration-700">
                <header className="space-y-2 pb-4 border-b">
                    <h1 className="text-5xl font-bold font-creative tracking-tight text-foreground">Fächer</h1>
                </header>

                <div className="space-y-4">
                    {subjects.map(subject => (
                        <Card key={subject.id} 
                            className="bg-card border-none rounded-[2rem] shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 overflow-hidden cursor-pointer"
                            onClick={() => router.push(`/dashboard/subjects/${subject.id}`)}>
                            <div className="p-6 flex items-center gap-6">
                               <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-secondary/50 flex items-center justify-center text-4xl shadow-sm">
                                    {subject.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-2xl font-bold font-headline text-foreground truncate">
                                        {subject.name}
                                    </h2>
                                    <div className="flex items-center gap-4 text-muted-foreground mt-2">
                                        <div className="flex items-center gap-2">
                                            <Layers className="h-4 w-4" />
                                            <span>{subject.stackCount} Stapel</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4" />
                                            <span>{subject.verbCount} Verben</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                     <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl" onClick={() => { setEditingSubject(subject); setRenamedSubjectName(subject.name); }}>
                                        <Pen className="h-5 w-5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingSubject(subject)}>
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                    <Link href={`/dashboard/subjects/${subject.id}`} legacyBehavior>
                                        <a className="h-12 w-12 rounded-xl flex items-center justify-center bg-secondary/50 hover:bg-primary hover:text-primary-foreground transition-colors">
                                            <ArrowRight className="h-5 w-5" />
                                        </a>
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    ))}
                     {subjects.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-muted-foreground">Du hast noch keine Fächer erstellt.</p>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)}>
                <DialogContent aria-describedby="rename-dialog-description">
                    <DialogHeader>
                        <DialogTitle>Fach umbenennen</DialogTitle>
                        <DialogDescription id="rename-dialog-description">
                            Gib einen neuen Namen für das Fach &quot;{editingSubject?.name}&quot; ein.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="rename-name">Name</Label>
                        <Input id="rename-name" value={renamedSubjectName} onChange={(e) => setRenamedSubjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRename()}/>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingSubject(null)}>Abbrechen</Button>
                        <Button onClick={handleRename}>Speichern</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingSubject} onOpenChange={(open) => !open && setDeletingSubject(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Diese Aktion kann nicht rückgängig gemacht werden. Das Fach &quot;{deletingSubject?.name}&quot; und alle zugehörigen Daten werden dauerhaft gelöscht.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Löschen</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
