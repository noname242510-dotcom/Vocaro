'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Zap, Loader2, Save, AlertTriangle } from 'lucide-react';
import type { WeakPoint } from '../page';
import { useState, useEffect, useContext } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateLearningTip } from '@/ai/flows/generate-learning-tip';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { TaskContext } from '@/contexts/task-context';


function AILearningTipDialog({ isOpen, onOpenChange, item }: { isOpen: boolean, onOpenChange: (open: boolean) => void, item: WeakPoint | null }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const { runTask, isRunning } = useContext(TaskContext);
    
    const [tip, setTip] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && item) {
            if (item.aiNote) {
                setTip(item.aiNote);
                return;
            }

            runTask(
                () => generateLearningTip({
                    item: item.term,
                    definition: item.definition,
                    language: item.language || 'unbekannt',
                    type: item.type
                }),
                {
                    name: 'KI-Tipp generieren...',
                    onSuccess: (result) => setTip(result.tip),
                    onError: (e) => {
                        console.error(e);
                        setError('Der KI-Tipp konnte nicht generiert werden. Versuche es später erneut.');
                    }
                }
            );
        } else {
            // Reset on close
            setTip(null);
            setError(null);
        }
    }, [isOpen, item, runTask]);

    const handleSave = async () => {
        if (!item || !tip || !user || !firestore) return;
        
        setIsSaving(true);
        let docRef;
        if (item.type === 'Vokabel') {
            if (!item.stackId) {
                toast({ variant: 'destructive', title: 'Fehler', description: 'Stapel-ID für Vokabel fehlt.'});
                setIsSaving(false);
                return;
            }
            docRef = doc(firestore, 'users', user.uid, 'subjects', item.subjectId, 'stacks', item.stackId, 'vocabulary', item.id);
        } else { // Verb
            docRef = doc(firestore, 'users', user.uid, 'subjects', item.subjectId, 'verbs', item.id);
        }

        try {
            await updateDoc(docRef, { aiNote: tip });
            toast({ title: 'Gespeichert!', description: 'Der KI-Tipp wurde gespeichert.'});
            onOpenChange(false);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Fehler', description: 'Der Tipp konnte nicht gespeichert werden.'});
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>KI-Lerntipp für: <span className="font-bold">{item?.term}</span></DialogTitle>
                    <DialogDescription>
                        Eine Eselsbrücke oder ein Hinweis, um es sich besser zu merken.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {isRunning && !tip && !error && (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>KI generiert einen Tipp...</span>
                        </div>
                    )}
                    {error && (
                         <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            <span>{error}</span>
                        </div>
                    )}
                    {tip && <p className="whitespace-pre-wrap">{tip}</p>}
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Schließen</Button>
                    <Button onClick={handleSave} disabled={isSaving || !tip}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Tipp speichern
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}


export function WeakPointRadar({ weakPoints }: { weakPoints: WeakPoint[] }) {
    const [selectedItem, setSelectedItem] = useState<WeakPoint | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleAiTippClick = (item: WeakPoint) => {
        setSelectedItem(item);
        setIsDialogOpen(true);
    };

  return (
    <>
        <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-destructive" />
            <CardTitle>Fehler-Fokus</CardTitle>
            </div>
            <CardDescription>Deine Top 5 Fehler über alle Fächer hinweg.</CardDescription>
        </CardHeader>
        <CardContent>
            {weakPoints.length > 0 ? (
                <ul className="space-y-3">
                    {weakPoints.map(point => (
                        <li key={point.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                            <p className="font-semibold">{point.term}</p>
                            <p className="text-sm text-muted-foreground">{point.subjectName} ({point.type}) - {point.errorRate.toFixed(0)}% Fehler</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleAiTippClick(point)}>
                            <Zap className="mr-2 h-4 w-4" />
                            KI-Tipp
                        </Button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Keine Fehlerdaten zum Analysieren vorhanden. Starte eine Lernsession!</p>
            )}
        </CardContent>
        </Card>
        <AILearningTipDialog 
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            item={selectedItem}
        />
    </>
  );
}
