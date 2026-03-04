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
    <div className="space-y-10 pb-24">
      {/* Welcome / Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-secondary/30 p-8 md:p-12 border">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight mb-4">
            Hallo, {user?.displayName?.split(' ')[0] || 'Lernende(r)'}! 👋
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            {isMetricsLoading
              ? 'Lade deine Statistiken…'
              : `${streak ?? 0} Tage Streak · ${masteryPct ?? 0}% gemeistert · Rang: ${rank?.emoji} ${rank?.label}`}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              className="rounded-xl px-8 h-12"
              onClick={() => {
                subjectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <ChevronDown className="mr-2 h-5 w-5" />
              Jetzt lernen
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl px-8 h-12 border-2" asChild>
              <Link href="/dashboard/community">
                <Users className="mr-2 h-5 w-5" />
                Community
              </Link>
            </Button>
          </div>
        </div>
        {/* Subtle decorative background shapes */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-foreground/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl p-5 border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vokabeln</p>
          </div>
          <p className="text-3xl font-black font-headline">{isLoading ? '…' : totalVocab}</p>
        </Card>
        <Card className="rounded-2xl p-5 border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Streak</p>
          </div>
          <p className="text-3xl font-black font-headline">
            {isMetricsLoading ? '…' : `${streak ?? 0}d`}
          </p>
        </Card>
        <Card className="rounded-2xl p-5 border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meister</p>
          </div>
          <p className="text-3xl font-black font-headline">
            {isMetricsLoading ? '…' : `${masteryPct ?? 0}%`}
          </p>
        </Card>
        <Card className="rounded-2xl p-5 border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rang</p>
          </div>
          <p className="text-3xl font-black font-headline">
            {isMetricsLoading ? '…' : (rank ? `${rank.emoji}` : '—')}
          </p>
        </Card>
      </div>

      {/* Subjects Section */}
      <section ref={subjectsRef} className="space-y-6 scroll-mt-20">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-bold font-headline">Deine Fächer</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="rounded-xl">
                <Plus className="h-5 w-5 mr-1" />
                Neu hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl sm:max-w-[425px]" aria-describedby="dialog-description">
              <DialogHeader>
                <DialogTitle className="text-2xl">Neues Fach erstellen</DialogTitle>
                <DialogDescription id="dialog-description">
                  Gib einen Namen für dein neues Fach ein.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold px-1">Fachname</Label>
                  <Input
                    id="name"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="h-12 rounded-xl text-lg px-4"
                    placeholder="z.B. Spanisch"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateSubject} size="lg" className="w-full rounded-xl h-12">Erstellen</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && subjectsWithCounts.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="min-h-[180px] p-8 flex flex-col justify-center items-center text-center rounded-2xl border-none bg-secondary/20 shadow-none">
                <Skeleton className="h-14 w-14 rounded-xl mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
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

      <footer className="w-full text-center text-sm text-muted-foreground p-12 mt-12 border-t">
        <p className="font-medium">© 2026 Vocaro</p>
        <p className="mt-2 text-xs opacity-70">
          Entwickelt mit ♥ für moderne Sprachlernende. <br className="md:hidden" />
          <Link href="/privacy" className="hover:underline underline-offset-4">Datenschutz</Link> · <Link href="/terms" className="hover:underline underline-offset-4">AGB</Link>
        </p>
      </footer>
    </div>
  );
}
