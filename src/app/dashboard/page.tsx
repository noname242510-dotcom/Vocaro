'use client';

import Link from 'next/link';
import { Plus, MoreVertical, BookCopy, ListTree, Trash2, Edit, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

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

  const handleCreateSubject = () => {
    if (newSubjectName.trim()) {
      const newSubject: Subject = {
        id: `sub-${Date.now()}`,
        name: newSubjectName.trim(),
        emoji: getEmojiForSubject(newSubjectName),
        stackCount: 0,
        vocabCount: 0,
      };
      setSubjects([...subjects, newSubject]);
      setNewSubjectName('');
      setIsCreateDialogOpen(false);
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
                    <AlertDialog>
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
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Card className="flex items-center justify-center border-dashed hover:border-primary hover:shadow-lg transition-all duration-300 min-h-[180px] cursor-pointer">
              <div className="rounded-full h-auto p-6 text-muted-foreground hover:text-primary flex flex-col items-center gap-2 text-center">
                <Plus className="h-8 w-8" />
                <span className="text-sm font-medium">Neues Fach</span>
              </div>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Fach erstellen</DialogTitle>
              <DialogDescription>
                Geben Sie einen Namen für Ihr neues Fach ein.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="col-span-3"
                  placeholder="z.B. Spanisch"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateSubject}>Erstellen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
