'use client';

import Link from 'next/link';
import { Plus, MoreVertical, BookCopy, ListTree, Trash2, Edit, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mockSubjects as initialSubjects } from '@/lib/data';
import type { Subject } from '@/lib/types';
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
} from "@/components/ui/alert-dialog"

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

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

  const handleDeleteSubject = () => {
    if (subjectToDelete) {
      setSubjects(subjects.filter((s) => s.id !== subjectToDelete.id));
      setSubjectToDelete(null);
    }
  };

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {subjects.map((subject) => (
          <Card key={subject.id} className="group relative hover:shadow-lg transition-shadow duration-300 flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{getEmojiForSubject(subject.name)}</span>
                  <div>
                    <CardTitle className="font-headline hover:underline">
                      <Link href={`/dashboard/subjects/${subject.id}`}>{subject.name}</Link>
                    </CardTitle>
                     <div className="flex items-center gap-1 mt-1">
                        <span className="text-muted-foreground text-sm">{subject.stackCount} Stapel</span>
                        <span className="text-muted-foreground text-sm font-black">·</span>
                        <span className="text-muted-foreground text-sm">{subject.vocabCount} Begriffe</span>
                     </div>
                  </div>
                </div>
                 <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialogTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSubjectToDelete(subject);
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="mt-auto">
               <Link href={`/dashboard/subjects/${subject.id}`} className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary">
                      <ArrowRight className="h-5 w-5" />
                  </Button>
               </Link>
            </CardContent>
          </Card>
        ))}
         <Card className="flex items-center justify-center border-dashed hover:border-primary hover:shadow-lg transition-all duration-300 min-h-[180px]">
          <Button variant="ghost" className="rounded-full h-auto p-6 text-muted-foreground hover:text-primary flex flex-col items-center gap-2">
            <Plus className="h-8 w-8" />
            <span className="text-sm font-medium">Neues Fach</span>
          </Button>
        </Card>
      </div>

      <AlertDialog open={!!subjectToDelete} onOpenChange={(isOpen) => !isOpen && setSubjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird das Fach und alle zugehörigen Stapel und Vokabeln dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSubjectToDelete(null)}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubject}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
