'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionShell } from './section-shell';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { getDocs, collection, collectionGroup, query, writeBatch, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Upload, Info } from 'lucide-react';
import type { Subject, Stack, VocabularyItem, Verb } from '@/lib/types';
import * as Papa from 'papaparse';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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

export function DataSettings() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);

    const subjectsCollection = useMemo(() => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'subjects');
    }, [firestore, user]);

    const { data: subjects } = useCollection<Subject>(subjectsCollection);
    const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
    const [isAllSubjectsSelected, setIsAllSubjectsSelected] = useState(true);

    useEffect(() => {
        if (subjects) {
            if (isAllSubjectsSelected) {
                setSelectedSubjects(new Set(subjects.map(s => s.id)));
            } else {
                setSelectedSubjects(new Set());
            }
        }
    }, [subjects, isAllSubjectsSelected]);
    
    const handleSubjectSelectionChange = (subjectId: string, checked: boolean) => {
        setSelectedSubjects(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(subjectId);
            } else {
                newSet.delete(subjectId);
            }
            // If this action makes all selected, check the "all" box, otherwise uncheck it.
            if (subjects && newSet.size === subjects.length) {
                setIsAllSubjectsSelected(true);
            } else {
                setIsAllSubjectsSelected(false);
            }
            return newSet;
        });
    };


    const escapeCsvField = (field: any): string => {
        if (field === null || field === undefined) {
            return '';
        }
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    const handleExport = async () => {
        if (!user || !firestore || selectedSubjects.size === 0) {
            toast({ variant: 'destructive', title: 'Fehler', description: 'Keine Fächer zum Exportieren ausgewählt.' });
            return;
        }
        setIsExporting(true);
        toast({ title: 'Export gestartet', description: 'Deine Daten werden gesammelt...' });

        try {
            const subjectsToExport = subjects?.filter(s => selectedSubjects.has(s.id)) || [];

            let csvContent = 'type,subject_name,stack_name,term,definition,phonetic,notes,related_word_language,related_word,infinitive,translation,tense,pronoun,conjugated_form\n';
            
            for (const subject of subjectsToExport) {
                // Export Vocabulary
                const stacksQuery = collection(firestore, 'users', user.uid, 'subjects', subject.id, 'stacks');
                const stacksSnapshot = await getDocs(stacksQuery);
                for (const stackDoc of stacksSnapshot.docs) {
                    const stack = { id: stackDoc.id, ...stackDoc.data() } as Stack;
                    const vocabQuery = collection(stackDoc.ref, 'vocabulary');
                    const vocabSnapshot = await getDocs(vocabQuery);
                    vocabSnapshot.forEach(doc => {
                        const v = doc.data() as VocabularyItem;
                        const row = [
                            'vocabulary', subject.name, stack.name, v.term, v.definition,
                            v.phonetic, v.notes, v.relatedWord?.language, v.relatedWord?.word,
                            '', '', '', '', ''
                        ].map(escapeCsvField).join(',');
                        csvContent += row + '\n';
                    });
                }

                // Export Verbs
                const verbsQuery = collection(firestore, 'users', user.uid, 'subjects', subject.id, 'verbs');
                const verbsSnapshot = await getDocs(verbsQuery);
                 verbsSnapshot.forEach(doc => {
                    const verb = doc.data() as Verb;
                    const infinitiveRow = [
                        'verb_infinitive', subject.name, '', '', '', '', '', '', '',
                        verb.infinitive, verb.translation, 'Infinitive', '', ''
                    ].map(escapeCsvField).join(',');
                    csvContent += infinitiveRow + '\n';

                    for (const tense in verb.forms) {
                        for (const pronoun in verb.forms[tense]) {
                            const row = [
                                'verb_conjugation', subject.name, '', '', '', '', '', '', '',
                                verb.infinitive, verb.translation, tense, pronoun, verb.forms[tense][pronoun]
                            ].map(escapeCsvField).join(',');
                            csvContent += row + '\n';
                        }
                    }
                });
            }

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const date = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `vocaro_export_${date}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast({ title: 'Erfolg!', description: 'Deine Daten wurden exportiert.' });

        } catch (error) {
            console.error("Export failed: ", error);
            toast({ variant: 'destructive', title: 'Export fehlgeschlagen', description: 'Ein Fehler ist aufgetreten.' });
        } finally {
            setIsExporting(false);
        }
    };
    
    const handleImport = async () => {
        if (!importFile) {
            toast({ variant: 'destructive', title: 'Keine Datei', description: 'Bitte wähle eine CSV-Datei aus.' });
            return;
        }
        if (!user || !firestore) return;
    
        setIsImporting(true);
        toast({ title: 'Import gestartet', description: 'Die Daten werden verarbeitet...' });
    
        Papa.parse(importFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data as any[];
    
                if (results.errors.length > 0) {
                    toast({ variant: 'destructive', title: 'Import-Fehler', description: 'Die CSV-Datei konnte nicht gelesen werden.' });
                    setIsImporting(false);
                    return;
                }
    
                try {
                    const batch = writeBatch(firestore);
                    const subjectCache = new Map<string, string>();
                    const stackCache = new Map<string, string>();
    
                    const subjectsSnapshot = await getDocs(collection(firestore, 'users', user.uid, 'subjects'));
                    subjectsSnapshot.forEach(doc => subjectCache.set(doc.data().name.toLowerCase(), doc.id));
    
                    for (const row of data) {
                        if (row.type === 'vocabulary') {
                            if (!row.subject_name || !row.stack_name || !row.term || !row.definition) continue;
    
                            let subjectId = subjectCache.get(row.subject_name.toLowerCase());
                            if (!subjectId) {
                                const newSubjectRef = doc(collection(firestore, 'users', user.uid, 'subjects'));
                                batch.set(newSubjectRef, { name: row.subject_name, emoji: getEmojiForSubject(row.subject_name) });
                                subjectId = newSubjectRef.id;
                                subjectCache.set(row.subject_name.toLowerCase(), subjectId);
                            }
    
                            let stackId = stackCache.get(`${subjectId}-${row.stack_name.toLowerCase()}`);
                            if (!stackId) {
                                const newStackRef = doc(collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks'));
                                batch.set(newStackRef, { name: row.stack_name, subjectId });
                                stackId = newStackRef.id;
                                stackCache.set(`${subjectId}-${row.stack_name.toLowerCase()}`, stackId);
                            }
    
                            const newVocabRef = doc(collection(firestore, 'users', user.uid, 'subjects', subjectId, 'stacks', stackId, 'vocabulary'));
                            batch.set(newVocabRef, {
                                term: row.term,
                                definition: row.definition,
                                phonetic: row.phonetic || '',
                                notes: row.notes || '',
                                relatedWord: (row.related_word_language && row.related_word) ? { language: row.related_word_language, word: row.related_word } : null,
                                source: 'manual',
                                createdAt: serverTimestamp(),
                            });
                        }
                    }
                    await batch.commit();
                    toast({ title: 'Import erfolgreich', description: 'Vokabeldaten wurden importiert.' });
                } catch (e) {
                    console.error("Import error: ", e);
                    toast({ variant: 'destructive', title: 'Import-Fehler', description: 'Ein Fehler ist beim Speichern der Daten aufgetreten.' });
                } finally {
                    setIsImporting(false);
                    setImportFile(null);
                }
            }
        });
    };


    return (
        <SectionShell title="Daten & Export" description="Verwalte und exportiere deine persönlichen Daten.">
            <Card>
                <CardHeader>
                    <CardTitle>Daten exportieren</CardTitle>
                    <CardDescription>
                        Wähle die Fächer aus, die du als CSV-Datei exportieren möchtest.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 rounded-lg border p-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="select-all-subjects" checked={isAllSubjectsSelected} onCheckedChange={(checked) => setIsAllSubjectsSelected(Boolean(checked))} />
                            <Label htmlFor="select-all-subjects" className="font-semibold">Alle Fächer</Label>
                        </div>
                        <div className="pl-6 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                            {subjects?.map(subject => (
                                <div key={subject.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`subject-${subject.id}`} 
                                        checked={selectedSubjects.has(subject.id)}
                                        onCheckedChange={(checked) => handleSubjectSelectionChange(subject.id, Boolean(checked))}
                                    />
                                    <Label htmlFor={`subject-${subject.id}`} className="font-normal">{subject.name}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button onClick={handleExport} disabled={isExporting || selectedSubjects.size === 0}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Export starten
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Daten importieren</CardTitle>
                    <CardDescription>
                        Importiere Vokabeln aus einer CSV-Datei. Die Datei muss die Spalten <code className="bg-muted px-1 py-0.5 rounded-sm">type</code>, <code className="bg-muted px-1 py-0.5 rounded-sm">subject_name</code>, <code className="bg-muted px-1 py-0.5 rounded-sm">stack_name</code>, <code className="bg-muted px-1 py-0.5 rounded-sm">term</code>, und <code className="bg-muted px-1 py-0.5 rounded-sm">definition</code> enthalten.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Input 
                            type="file" 
                            accept=".csv" 
                            onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                            className="max-w-xs"
                        />
                        <Button onClick={handleImport} disabled={isImporting || !importFile}>
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Importieren
                        </Button>
                    </div>
                     <div className="flex items-start gap-2 text-sm text-muted-foreground p-2 bg-muted/50 rounded-lg">
                        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Derzeit wird nur der Import von Vokabeln (Typ: "vocabulary") unterstützt. Verben werden ignoriert.</span>
                    </div>
                </CardContent>
            </Card>
        </SectionShell>
    );
}
