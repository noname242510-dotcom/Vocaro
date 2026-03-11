'use client';

import Link from 'next/link';
import { Plus, Users, Zap, TrendingUp, Star, BookOpen, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Subject } from '@/lib/types';
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
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { SubjectCard, type SubjectWithCounts } from './_components/subject-card';
import { Skeleton } from '@/components/ui/skeleton';

// --- Rank Tier ---
function getRankTier(masteryPct: number): { label: string; emoji: string; color: string } {
  if (masteryPct >= 90) return { label: 'Diamond', emoji: '💠', color: 'text-cyan-500' };
  if (masteryPct >= 75) return { label: 'Platin', emoji: '💎', color: 'text-purple-500' };
  if (masteryPct >= 50) return { label: 'Gold', emoji: '🥇', color: 'text-yellow-500' };
  if (masteryPct >= 25) return { label: 'Silber', emoji: '🥈', color: 'text-slate-400' };
  return { label: 'Bronze', emoji: '🥉', color: 'text-orange-600' };
}

export default function DashboardPage() {
  const { firestore, user } = useFirebase();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const [subjectsWithCounts, setSubjectsWithCounts] = useState<SubjectWithCounts[]>([]);
  const [isCounting, setIsCounting] = useState(true);
  const [updateToken, setUpdateToken] = useState(0);

  // Live metrics state
  const [streak, setStreak] = useState<number | null>(null);
  const [masteryPct, setMasteryPct] = useState<number | null>(null);
  const [dailyAvg, setDailyAvg] = useState<number | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);

  const subjectsRef = useRef<HTMLElement>(null);

  const subjectsCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects');
  }, [firestore, user]);

  const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsCollectionRef);

  // Compute subject counts
  useEffect(() => {
    if (areSubjectsLoading) { setIsCounting(true); return; }
    if (!subjects || !firestore || !user) { setIsCounting(false); setSubjectsWithCounts([]); return; }
    if (subjects.length === 0) { setIsCounting(false); setSubjectsWithCounts([]); return; }

    setIsCounting(true);
    const fetchCounts = async () => {
      const results = await Promise.all(subjects.map(async (subject) => {
        const stacksRef = collection(firestore, 'users', user.uid, 'subjects', subject.id, 'stacks');
        const verbsRef = collection(firestore, 'users', user.uid, 'subjects', subject.id, 'verbs');
        const [stacksSnap, verbsSnap] = await Promise.all([getDocs(stacksRef), getDocs(verbsRef)]);
        let vocabCount = 0;
        for (const stackDoc of stacksSnap.docs) {
          vocabCount += (await getDocs(collection(stackDoc.ref, 'vocabulary'))).size;
        }
        return { ...subject, vocabCount, verbCount: verbsSnap.size };
      }));
      setSubjectsWithCounts(results);
      setIsCounting(false);
    };
    fetchCounts();
  }, [subjects, areSubjectsLoading, firestore, user, updateToken]);

  // Compute live metrics: streak, mastery, daily avg
  useEffect(() => {
    if (!firestore || !user) return;

    const fetchMetrics = async () => {
      setIsMetricsLoading(true);
      try {
        // --- Streak: consecutive days with a learning session ---
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const sessionsSnap = await getDocs(
          query(
            collection(firestore, 'users', user.uid, 'learningSessions'),
            where('startTime', '>=', Timestamp.fromDate(ninetyDaysAgo)),
            orderBy('startTime', 'desc')
          )
        );

        // Collect unique days (YYYY-MM-DD)
        const activeDays = new Set<string>();
        sessionsSnap.docs.forEach(doc => {
          const ts = doc.data().startTime as Timestamp;
          if (ts) {
            const date = ts.toDate();
            activeDays.add(date.toISOString().split('T')[0]);
          }
        });

        let computedStreak = 0;
        const today = new Date();
        for (let i = 0; i < 90; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toISOString().split('T')[0];
          if (activeDays.has(key)) {
            computedStreak++;
          } else if (i > 0) {
            break; // streak broken
          }
        }
        setStreak(computedStreak);

        // --- Daily average: sessions in last 30 days ---
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentDays = new Set<string>();
        sessionsSnap.docs.forEach(doc => {
          const ts = doc.data().startTime as Timestamp;
          if (ts) {
            const date = ts.toDate();
            if (date >= thirtyDaysAgo) recentDays.add(date.toISOString().split('T')[0]);
          }
        });
        // Simple avg: active days / 30
        setDailyAvg(recentDays.size > 0 ? Math.round(recentDays.size / 30 * 10) : 0);

        // --- Mastery: across all subjects ---
        let totalVocab = 0;
        let masteredVocab = 0;
        const subjectsSnap = await getDocs(collection(firestore, 'users', user.uid, 'subjects'));
        for (const subDoc of subjectsSnap.docs) {
          const stacksSnap = await getDocs(collection(firestore, 'users', user.uid, 'subjects', subDoc.id, 'stacks'));
          for (const stackDoc of stacksSnap.docs) {
            const vocabSnap = await getDocs(collection(stackDoc.ref, 'vocabulary'));
            totalVocab += vocabSnap.size;
            masteredVocab += vocabSnap.docs.filter(d => d.data().isMastered).length;
          }
        }
        const pct = totalVocab > 0 ? Math.round((masteredVocab / totalVocab) * 100) : 0;
        setMasteryPct(pct);

      } catch (e) {
        console.error('Metrics fetch error:', e);
      } finally {
        setIsMetricsLoading(false);
      }
    };

    fetchMetrics();
  }, [firestore, user]);

  const forceRefetch = () => setUpdateToken(t => t + 1);

  const getEmojiForSubject = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('deutsch')) return '🇩🇪';
    if (n.includes('englisch')) return '🇬🇧';
    if (n.includes('französisch')) return '🇫🇷';
    if (n.includes('spanisch')) return '🇪🇸';
    if (n.includes('portugiesisch')) return '🇵🇹';
    if (n.includes('italienisch')) return '🇮🇹';
    if (n.includes('japanisch')) return '🇯🇵';
    if (n.includes('latein')) return '🏛️';
    if (n.includes('mathe')) return '🔢';
    return '🌐';
  };

  const handleCreateSubject = async () => {
    if (newSubjectName.trim() && subjectsCollectionRef) {
      await addDoc(subjectsCollectionRef, {
        name: newSubjectName.trim(),
        emoji: getEmojiForSubject(newSubjectName),
      });
      setNewSubjectName('');
      setIsCreateDialogOpen(false);
    }
  };

  const isLoading = areSubjectsLoading || isCounting;
  const totalVocab = subjectsWithCounts.reduce((acc, s) => acc + s.vocabCount, 0);
  const rank = masteryPct !== null ? getRankTier(masteryPct) : null;

  return (
    <div className="space-y-12">
      {/* Welcome Section */}
      <section className="space-y-2 pb-4 border-b">
        <h1 className="text-5xl font-bold font-creative tracking-tight text-foreground">
          Hallo, {user?.displayName?.split(' ')[0] || 'Lernende(r)'}! 👋
        </h1>
        <p className="text-xl text-muted-foreground">
          {isMetricsLoading
            ? 'Lade deine Statistiken…'
            : `Setze dein Lernen fort. Du hast heute bereits eine Streak von ${streak ?? 0} Tagen!`}
        </p>
      </section>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="group bg-card border-none shadow-xl shadow-primary/5 rounded-[2rem] p-8 hover:shadow-2xl transition-all duration-300">
          <div className="flex flex-col h-full justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                <BookOpen className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Vokabeln</p>
            </div>
            <div>
              <p className="text-5xl font-black font-headline tracking-tighter">{isLoading ? '…' : totalVocab}</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Insgesamt gelernt</p>
            </div>
          </div>
        </Card>

        <Card className="group bg-card border-none shadow-xl shadow-primary/5 rounded-[2rem] p-8 hover:shadow-2xl transition-all duration-300">
          <div className="flex flex-col h-full justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 text-orange-500 rounded-2xl group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                <Zap className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Streak</p>
            </div>
            <div>
              <p className="text-5xl font-black font-headline tracking-tighter">{isMetricsLoading ? '…' : `${streak ?? 0}d`}</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Tage in Folge</p>
            </div>
          </div>
        </Card>

        <Card className="group bg-card border-none shadow-xl shadow-primary/5 rounded-[2rem] p-8 hover:shadow-2xl transition-all duration-300">
          <div className="flex flex-col h-full justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-50 text-green-500 rounded-2xl group-hover:bg-green-500 group-hover:text-white transition-colors duration-300">
                <TrendingUp className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Meister</p>
            </div>
            <div>
              <p className="text-5xl font-black font-headline tracking-tighter">{isMetricsLoading ? '…' : `${masteryPct ?? 0}%`}</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Genauigkeit</p>
            </div>
          </div>
        </Card>

        <Card className="group bg-card border-none shadow-xl shadow-primary/5 rounded-[2rem] p-8 hover:shadow-2xl transition-all duration-300">
          <div className="flex flex-col h-full justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-500 rounded-2xl group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                <Star className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Rang</p>
            </div>
            <div>
              <p className="text-5xl font-black font-headline tracking-tighter">{isMetricsLoading ? '…' : (rank ? `${rank.emoji}` : '—')}</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">{rank?.label || 'Anfänger'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Subjects Section */}
      <section ref={subjectsRef} className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-card p-2 rounded-lg border shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold font-headline tracking-tight uppercase tracking-widest text-muted-foreground text-xs">Deine Fächer</h2>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl font-bold h-10 px-6 border-2 hover:bg-background shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Fach hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] sm:max-w-[425px] border-none shadow-2xl p-8" aria-describedby="dialog-description">
              <DialogHeader>
                <DialogTitle className="text-3xl font-bold font-headline">Neues Fach</DialogTitle>
                <DialogDescription id="dialog-description" className="text-lg mt-2">
                  Gib einen Namen für dein neues Fach ein.
                </DialogDescription>
              </DialogHeader>
              <div className="py-8">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Fachname</Label>
                  <Input
                    id="name"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="h-14 rounded-2xl text-lg px-6 border-2 focus:border-primary transition-all"
                    placeholder="z.B. Spanisch"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateSubject} className="w-full rounded-2xl h-14 text-lg font-bold">Erstellen</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && subjectsWithCounts.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="min-h-[220px] p-10 flex flex-col justify-center items-center text-center rounded-[2rem] border-none bg-card shadow-xl shadow-primary/5">
                <Skeleton className="h-16 w-16 rounded-2xl mb-6 bg-muted/50" />
                <Skeleton className="h-8 w-3/4 mb-4 bg-muted/50" />
                <Skeleton className="h-5 w-1/2 bg-muted/50" />
              </Card>
            ))
          ) : (
            <>
              {subjectsWithCounts.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onAction={forceRefetch}
                />
              ))}
            </>
          )}
        </div>
      </section>

      <footer className="w-full text-center text-sm text-muted-foreground p-12 mt-20 border-t bg-card rounded-[3rem_3rem_0_0]">
        <p className="font-bold text-lg text-foreground">Vocaro</p>
        <p className="mt-2 text-sm opacity-70">
          Entwickelt für moderne Sprachlernende. <br className="md:hidden" />
          <Link href="/privacy" className="hover:underline underline-offset-4">Datenschutz</Link> · <Link href="/terms" className="hover:underline underline-offset-4">AGB</Link>
        </p>
      </footer>
    </div>
  );
}
