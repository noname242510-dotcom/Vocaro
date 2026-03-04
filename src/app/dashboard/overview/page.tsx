
'use client';

import { useMemo, useEffect, useState } from 'react';
import type { Subject, Stack, VocabularyItem, Verb } from '@/lib/types';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useFirebase } from '@/firebase/provider';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// --- Rank Tier ---
function getRankTier(pct: number): { label: string; emoji: string } {
  if (pct >= 90) return { label: 'Diamond', emoji: '💠' };
  if (pct >= 75) return { label: 'Platin', emoji: '💎' };
  if (pct >= 50) return { label: 'Gold', emoji: '🥇' };
  if (pct >= 25) return { label: 'Silber', emoji: '🥈' };
  return { label: 'Bronze', emoji: '🥉' };
}

// Minimal progress ring component
function ProgressRing({ pct, size = 100, stroke = 8 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-secondary fill-none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none"
        stroke="currentColor"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-foreground transition-all duration-700"
      />
    </svg>
  );
}

export default function DashboardOverviewPage() {
  const { firestore, user } = useFirebase();
  const [isLoading, setIsLoading] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allVocab, setAllVocab] = useState<VocabularyItem[]>([]);
  const [allVerbs, setAllVerbs] = useState<Verb[]>([]);

  // Metrics
  const [streak, setStreak] = useState(0);
  const [masteryPct, setMasteryPct] = useState(0);
  const [weekActivity, setWeekActivity] = useState<{ day: string; count: number }[]>([]);

  useEffect(() => {
    if (!user || !firestore) return;

    const fetchAllData = async () => {
      setIsLoading(true);

      // 1. Subjects
      const subjectsSnap = await getDocs(query(collection(firestore, 'users', user.uid, 'subjects'), orderBy('name')));
      const fetchedSubjects = subjectsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Subject));
      setSubjects(fetchedSubjects);

      // 2. Vocab & verbs across all subjects
      const tempVocab: VocabularyItem[] = [];
      const tempVerbs: Verb[] = [];
      for (const sub of fetchedSubjects) {
        const stacksSnap = await getDocs(collection(firestore, 'users', user.uid, 'subjects', sub.id, 'stacks'));
        for (const stackDoc of stacksSnap.docs) {
          const vocabSnap = await getDocs(collection(stackDoc.ref, 'vocabulary'));
          vocabSnap.docs.forEach(d => tempVocab.push({ ...d.data(), id: d.id } as VocabularyItem));
        }
        const verbsSnap = await getDocs(collection(firestore, 'users', user.uid, 'subjects', sub.id, 'verbs'));
        verbsSnap.docs.forEach(d => tempVerbs.push({ ...d.data(), id: d.id } as Verb));
      }
      setAllVocab(tempVocab);
      setAllVerbs(tempVerbs);

      // Mastery %
      const totalItems = tempVocab.length + tempVerbs.length;
      const masteredItems = tempVocab.filter(v => v.isMastered).length + tempVerbs.filter(v => v.isMastered).length;
      const pct = totalItems > 0 ? Math.round((masteredItems / totalItems) * 100) : 0;
      setMasteryPct(pct);

      // 3. Learning sessions for streak + weekly activity
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

      // Streak
      let computedStreak = 0;
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (activeDays.has(d.toISOString().split('T')[0])) {
          computedStreak++;
        } else if (i > 0) break;
      }
      setStreak(computedStreak);

      // Weekly activity (last 7 days)
      const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      const weekData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        const key = d.toISOString().split('T')[0];
        return { day: dayNames[d.getDay()], count: activeDays.has(key) ? 1 : 0 };
      });
      setWeekActivity(weekData);

      setIsLoading(false);
    };

    fetchAllData();
  }, [user, firestore]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) timer = setTimeout(() => setShowSpinner(true), 300);
    else setShowSpinner(false);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const rank = getRankTier(masteryPct);
  const totalItems = allVocab.length + allVerbs.length;
  const masteredItems = allVocab.filter(v => v.isMastered).length + allVerbs.filter(v => v.isMastered).length;

  if (showSpinner) return <LoadingSpinner fullPage />;
  if (isLoading) return null;

  return (
    <div className="space-y-8 pb-24">
      <div className="text-center my-4 md:my-8">
        <h1 className="text-3xl lg:text-4xl font-bold font-headline">Statistiken</h1>
        <p className="text-sm text-muted-foreground mt-1">Deine Lernübersicht</p>
      </div>

      {/* Top metric row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Rank */}
        <Card className="rounded-2xl p-6 border bg-card col-span-2 md:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Rang</p>
          <div className="flex items-center gap-3">
            <span className="text-5xl">{rank.emoji}</span>
            <div>
              <p className="text-2xl font-black">{rank.label}</p>
              <p className="text-xs text-muted-foreground">{masteryPct}% gemeistert</p>
            </div>
          </div>
        </Card>

        {/* Mastery ring */}
        <Card className="rounded-2xl p-6 border bg-card flex flex-col items-center justify-center gap-2">
          <div className="relative">
            <ProgressRing pct={masteryPct} size={80} stroke={8} />
            <span className="absolute inset-0 flex items-center justify-center text-lg font-black">
              {masteryPct}%
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Meisterung</p>
        </Card>

        {/* Streak */}
        <Card className="rounded-2xl p-6 border bg-card flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Streak</p>
          <p className="text-4xl font-black">{streak}</p>
          <p className="text-sm text-muted-foreground">Tage in Folge</p>
        </Card>

        {/* Total items */}
        <Card className="rounded-2xl p-6 border bg-card flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Gesamt</p>
          <p className="text-4xl font-black">{totalItems}</p>
          <p className="text-sm text-muted-foreground">{masteredItems} gemeistert</p>
        </Card>
      </div>

      {/* 7-Day Activity Chart */}
      <Card className="rounded-2xl p-6 border bg-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">Aktivität – letzte 7 Tage</p>
        <div className="flex items-end justify-between gap-3 h-24">
          {weekActivity.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div
                className={cn(
                  "w-full rounded-lg transition-all duration-500",
                  d.count > 0 ? "bg-foreground" : "bg-secondary"
                )}
                style={{ height: d.count > 0 ? '100%' : '30%' }}
              />
              <span className="text-xs font-bold text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Subjects summary */}
      {subjects.length > 0 && (
        <Card className="rounded-2xl p-6 border bg-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Fächer</p>
          <div className="space-y-3">
            {subjects.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-2xl">{s.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{s.name}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {totalItems === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-semibold">Noch keine Vokabeln vorhanden.</p>
          <p className="text-sm mt-1">Füge Vokabeln in deinen Fächern hinzu, um Statistiken zu sehen.</p>
        </div>
      )}
    </div>
  );
}
