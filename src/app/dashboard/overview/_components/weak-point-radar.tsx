'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Zap, Loader2, Save, AlertTriangle, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateLearningTip } from '@/ai/flows/generate-learning-tip';
import { useToast } from '@/hooks/use-toast';

export type WeakPoint = {
  id: string; // practiceItemId or vocabId
  verbId?: string;
  term: string;
  definition: string;
  errorRate: number;
  subjectName: string;
  type: 'Vokabel' | 'Verb';
  subjectId: string;
  language: string;
  stackId?: string;
  aiNote?: string;
};

function AILearningTipDialog({
  isOpen,
  onOpenChange,
  item,
  onSaveTrigger,
  cachedTipsForItem,
  onTipsGenerated
}: {
  isOpen: boolean,
  onOpenChange: (open: boolean) => void,
  item: WeakPoint | null,
  onSaveTrigger: (itemId: string, newNote: string, itemType: 'Vokabel' | 'Verb', stackId?: string, verbId?: string) => void,
  cachedTipsForItem: string[] | undefined,
  onTipsGenerated: (tips: string[]) => void
}) {
    const { toast } = useToast();
    
    const [tips, setTips] = useState<string[]>([]);
    const [selectedTip, setSelectedTip] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false); // No longer used for direct save
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (isOpen && item) {
            // 1. Saved note takes highest priority
            if (item.aiNote) {
                setTips([item.aiNote]);
                setSelectedTip(item.aiNote);
                setCurrentIndex(0);
                return;
            }

            // 2. Check for cached, unsaved tips
            if (cachedTipsForItem) {
                setTips(cachedTipsForItem);
                setSelectedTip(cachedTipsForItem[0]);
                setCurrentIndex(0);
                return;
            }

            // 3. Generate new tips
            setIsGenerating(true);
            setError(null);
            generateLearningTip({
                item: item.term,
                definition: item.definition,
                language: item.language || 'unbekannt',
                type: item.type
            }).then(result => {
                setTips(result.tips);
                setSelectedTip(result.tips[0]);
                setCurrentIndex(0);
                onTipsGenerated(result.tips);
            }).catch(e => {
                console.error(e);
                setError('Der KI-Tipp konnte nicht generiert werden. Versuche es später erneut.');
            }).finally(() => {
                setIsGenerating(false);
            });
        } else {
            // Reset on close
            setTips([]);
            setSelectedTip(null);
            setError(null);
            setCurrentIndex(0);
        }
    }, [isOpen, item, cachedTipsForItem, onTipsGenerated]);

    const handleSave = async () => {
        if (!item || !selectedTip) return;
        // The save logic is now handled by the parent, we just trigger it.
        onSaveTrigger(item.id, selectedTip, item.type, item.stackId, item.verbId);
        onOpenChange(false); // Close dialog after triggering save.
    };
    
    const navigateTips = (direction: 'next' | 'prev') => {
        const newIndex = direction === 'next' ? (currentIndex + 1) % tips.length : (currentIndex - 1 + tips.length) % tips.length;
        setCurrentIndex(newIndex);
        setSelectedTip(tips[newIndex]);
    }


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>KI-Lerntipp für: <span className="font-bold">{item?.term}</span></DialogTitle>
                    <DialogDescription>
                        {item?.aiNote ? 'Dein gespeicherter Tipp:' : 'Wähle den besten Tipp aus und speichere ihn.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 min-h-[100px] flex items-center justify-center">
                    {isGenerating && (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>KI generiert Tipps...</span>
                        </div>
                    )}
                    {error && (
                         <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            <span>{error}</span>
                        </div>
                    )}
                    {!isGenerating && !error && tips.length > 0 && (
                       <div className="w-full">
                           <p className="whitespace-pre-wrap text-center">{tips[currentIndex]}</p>
                       </div>
                    )}
                </div>
                 <div className="flex justify-between items-center gap-2">
                    {tips.length > 1 && !item?.aiNote ? (
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => navigateTips('prev')}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground">{currentIndex + 1} / {tips.length}</span>
                             <Button variant="outline" size="icon" onClick={() => navigateTips('next')}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : <div />}
                    
                    {item?.aiNote ? (
                         <Button variant="outline" onClick={() => onOpenChange(false)}>Schließen</Button>
                    ): (
                        <Button onClick={handleSave} disabled={isSaving || isGenerating || !selectedTip}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Tipp speichern
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}


export function WeakPointRadar({ weakPoints, onUpdate }: { weakPoints: WeakPoint[], onUpdate: (itemId: string, newNote: string, itemType: 'Vokabel' | 'Verb', stackId?: string, verbId?: string) => void }) {
    const [selectedItem, setSelectedItem] = useState<WeakPoint | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [cachedTips, setCachedTips] = useState<Record<string, string[]>>({});

    const handleAiTippClick = (item: WeakPoint) => {
        setSelectedItem(item);
        setIsDialogOpen(true);
    };

  return (
    <>
        <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-muted-foreground" />
            <CardTitle>Fehler-Radar</CardTitle>
            </div>
            <CardDescription>Deine Top 5 Fehler in diesem Fach.</CardDescription>
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
                            {point.aiNote ? 'Tipp ansehen' : 'KI-Tipp'}
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
            onSaveTrigger={onUpdate}
            cachedTipsForItem={selectedItem ? cachedTips[selectedItem.id] : undefined}
            onTipsGenerated={(tips) => {
                if (selectedItem) {
                    setCachedTips(prev => ({ ...prev, [selectedItem.id]: tips }));
                }
            }}
        />
    </>
  );
}
