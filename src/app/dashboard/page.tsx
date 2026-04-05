'use client';

import Link from 'next/link';
import { Plus, Users, Zap, TrendingUp, Star, BookOpen, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
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
import { cn } from '@/lib/utils';

// --- Rank Tier ---
function getRankTier(masteryPct: number): { label: string; emoji: string; color: string } {
  if (masteryPct >= 90) return { label: 'Diamond', emoji: '💠', color: 'text-cyan-500' };
  if (masteryPct >= 75) return { label: 'Platin', emoji: '💎', color: 'text-purple-500' };
  if (masteryPct >= 50) return { label: 'Gold', emoji: '🥇', color: 'text-yellow-500' };
  if (masteryPct >= 25) return { label: 'Silber', emoji: '🥈', color: 'text-slate-400' };
  return { label: 'Bronze', emoji: '🥉', color: 'text-orange-600' };
}

const statConfig = [
  {
    key: 'vocab',
    label: 'Vokabeln',
    subLabel: 'Gesamt',
    icon: BookOpen,
    iconBg: 'bg-blue-50 dark:bg-blue-950',
    iconColor: 'text-blue-500',
  },
  {
    key: 'streak',
    label: 'Streak',
    subLabel: 'Tage',
    icon: Zap,
    iconBg: 'bg-orange-50 dark:bg-orange-950',
    iconColor: 'text-orange-500',
  },
  {
    key: 'mastery',
    label: 'Meisterung',
    subLabel: 'Genauigkeit',
    icon: TrendingUp,
    iconBg: 'bg-green-50 dark:bg-green-950',
    iconColor: 'text-green-500',
  },
  {
    key: 'rank',
    label: 'Rang',
    subLabel: 'Aktuell',
    icon: Star,
    iconBg: 'bg-purple-50 dark:bg-purple-950',
    iconColor: 'text-purple-500',
  },
];

export default function DashboardPage() {
  const { firestore, user } = useFirebase();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const [subjectsWithCounts, setSubjectsWithCounts] = useState<SubjectWithCounts[]>([]);
  const [isCounting, setIsCounting] = useState(true);

  const [streak, setStreak] = useState<number | null>(null);
  const [masteryPct, setMasteryPct] = useState<number | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);

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
  }, [subjects, areSubjectsLoading, firestore, user]);

  // Metrics
  useEffect(() => {
    if (!firestore || !user) return;
    const fetchMetrics = async () => {
      setIsMetricsLoading(true);
      try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const sessionsSnap = await getDocs(
          query(
            collection(firestore, 'users', user.uid, 'learningSessions'),
            where('startTime', '>=', Timestamp.fromDate(ninetyDaysAgo)),
            orderBy('startTime', 'desc')
          )
        );

        const activeDays = new Set<string>();
        sessionsSnap.docs.forEach(doc => {
          const ts = doc.data().startTime as Timestamp;
          if (ts) activeDays.add(ts.toDate().toISOString().split('T')[0]);
        });

        let computedStreak = 0;
        const today = new Date();
        for (let i = 0; i < 90; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          if (activeDays.has(d.toISOString().split('T')[0])) computedStreak++;
          else if (i > 0) break;
        }
        setStreak(computedStreak);

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
        setMasteryPct(totalVocab > 0 ? Math.round((masteredVocab / totalVocab) * 100) : 0);
      } catch (e) {
        console.error('Metrics fetch error:', e);
      } finally {
        setIsMetricsLoading(false);
      }
    };
    fetchMetrics();
  }, [firestore, user]);

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

  const statValues: Record<string, string> = {
    vocab: isLoading ? '…' : String(totalVocab),
    streak: isMetricsLoading ? '…' : `${streak ?? 0}`,
    mastery: isMetricsLoading ? '…' : `${masteryPct ?? 0}%`,
    rank: isMetricsLoading ? '…' : (rank?.emoji ?? '—'),
  };

  const statSubs: Record<string, string> = {
    vocab: 'Gesamt',
    streak: `${isMetricsLoading ? '…' : streak ?? 0} Tage`,
    mastery: 'Genauigkeit',
    rank: rank?.label ?? 'Anfänger',
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <section>
        <h1 className="text-3xl font-black font-creative tracking-tight text-foreground">
          Hallo, {user?.displayName?.split(' ')[0] || 'Lernende(r)'}! 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isMetricsLoading
            ? 'Lade Statistiken…'
            : `${streak ? `🔥 ${streak} Tage Streak` : 'Starte heute deine Lerneinheit.'}`}
        </p>
      </section>

      {/* Compact 2×2 Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statConfig.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className="bg-card border-none shadow-md shadow-primary/5 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2 rounded-xl', stat.iconBg)}>
                  <Icon className={cn('h-4 w-4', stat.iconColor)} />
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              </div>
              <p className="text-3xl font-black font-headline tracking-tighter leading-none">{statValues[stat.key]}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{statSubs[stat.key]}</p>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link href="/dashboard/learn" className="flex-1">
          <div className="bg-primary text-primary-foreground rounded-2xl p-4 flex items-center justify-between active:scale-95 transition-transform">
            <div>
              <p className="font-black text-base">Lernen</p>
              <p className="text-xs opacity-70 mt-0.5">Weiter üben</p>
            </div>
            <Zap className="h-5 w-5 opacity-80" />
          </div>
        </Link>
        <Link href="/dashboard/community" className="flex-1">
          <div className="bg-secondary text-foreground rounded-2xl p-4 flex items-center justify-between active:scale-95 transition-transform">
            <div>
              <p className="font-black text-base">Community</p>
              <p className="text-xs text-muted-foreground mt-0.5">Freunde</p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      </div>

      {/* Subjects Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Deine Fächer</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 px-3 rounded-xl gap-1.5 text-xs font-bold">
                <Plus className="h-3.5 w-3.5" />
                Neu
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

        {/* Subject list – compact rows on mobile, cards on larger screens */}
        <div className="space-y-2 md:grid md:gap-4 md:grid-cols-2 md:space-y-0 lg:grid-cols-3">
          {isLoading && subjectsWithCounts.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-card shadow-sm">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          ) : subjectsWithCounts.length === 0 ? (
            <div className="col-span-full text-center py-12 rounded-2xl bg-card shadow-sm">
              <p className="text-4xl mb-3">📚</p>
              <p className="font-bold text-foreground">Noch keine Fächer</p>
              <p className="text-sm text-muted-foreground mt-1">Erstelle dein erstes Fach oben.</p>
            </div>
          ) : (
            subjectsWithCounts.map((subject) => (
              <Link
                key={subject.id}
                href={`/dashboard/subjects/${subject.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card shadow-sm hover:shadow-md active:scale-98 transition-all duration-150 border border-transparent hover:border-primary/10"
              >
                <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0">
                  {subject.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-base tracking-tight truncate">{subject.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {subject.vocabCount} Vokabeln · {subject.verbCount} Verben
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
