'use client';

import { useMemo, useEffect, useState } from 'react';
import type { Subject, Stack, VocabularyItem, Verb } from '@/lib/types';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useFirebase } from '@/firebase/provider';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Sparkles, Target, Activity } from 'lucide-react';

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

// 7-Day Activity Line Chart (SVG)
function ActivityLineChart({ data }: { data: { day: string; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const chartHeight = 60;
  const chartWidth = 300;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - (d.count / maxCount) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full h-32 flex flex-col justify-end relative">
      <svg width="100%" height="80%" viewBox={`0 0 ${chartWidth} ${chartHeight + 10}`} preserveAspectRatio="none" className="overflow-visible">
        {/* Fill Area */}
        <polyline
          points={`0,${chartHeight + 10} ${points} ${chartWidth},${chartHeight + 10}`}
          className="fill-foreground/10"
        />
        {/* Stroke Line */}
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * chartWidth;
          const y = chartHeight - (d.count / maxCount) * chartHeight;
          return (
            <circle key={i} cx={x} cy={y} r="4" className={cn(d.count > 0 ? "fill-foreground" : "fill-background", "stroke-foreground stroke-2")} />
          );
        })}
      </svg>
      {/* X Axis Labels */}
      <div className="flex justify-between mt-4">
        {data.map((d, i) => (
          <span key={i} className="text-xs font-bold text-muted-foreground">{d.day}</span>
        ))}
      </div>
    </div>
  );
}

type SubjectStats = {
  subject: Subject;
  vocabCount: number;
  masteredCount: number;
  errorWords: VocabularyItem[]; // Words that should be on the "Error Radar"
};

export default function DashboardOverviewPage() {
  const { firestore, user } = useFirebase();
  const [isLoading, setIsLoading] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);

  // Overall metrics
  const [streak, setStreak] = useState(0);
  const [masteryPct, setMasteryPct] = useState(0);
  const [weekActivity, setWeekActivity] = useState<{ day: string; count: number }[]>([]);

  // AI usage metric
  const [aiUsageCount, setAiUsageCount] = useState(0);

  // Per-subject details
  const [subjectDetails, setSubjectDetails] = useState<SubjectStats[]>([]);

  // Totals
  const [totalItemsCount, setTotalItemsCount] = useState(0);

  useEffect(() => {
    if (!user || !firestore) return;

    const fetchAllData = async () => {
      setIsLoading(true);

      // 1. Subjects
      const subjectsSnap = await getDocs(query(collection(firestore, 'users', user.uid, 'subjects'), orderBy('name')));
      const fetchedSubjects = subjectsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Subject));

      let overallTotal = 0;
      let overallMastered = 0;
      let overallAiCount = 0;

      const statsPromises = fetchedSubjects.map(async (sub) => {
        let subVocabCount = 0;
        let subMasteredCount = 0;
        const subUnmastered: VocabularyItem[] = [];

        // Stacks & Vocab
        const stacksSnap = await getDocs(collection(firestore, 'users', user.uid, 'subjects', sub.id, 'stacks'));
        for (const stackDoc of stacksSnap.docs) {
          const vocabSnap = await getDocs(collection(stackDoc.ref, 'vocabulary'));
          vocabSnap.docs.forEach(d => {
            const v = { ...d.data(), id: d.id } as VocabularyItem;
            subVocabCount++;
            if (v.isMastered) subMasteredCount++;
            else subUnmastered.push(v);
            if (v.source === 'ai') overallAiCount++;
          });
        }

        // Verbs
        const verbsSnap = await getDocs(collection(firestore, 'users', user.uid, 'subjects', sub.id, 'verbs'));
        verbsSnap.docs.forEach(d => {
          const v = { ...d.data(), id: d.id } as Verb;
          subVocabCount++;
          if (v.isMastered) subMasteredCount++;
          if (v.source === 'ai') overallAiCount++;
        });

        overallTotal += subVocabCount;
        overallMastered += subMasteredCount;

        return {
          subject: sub,
          vocabCount: subVocabCount,
          masteredCount: subMasteredCount,
          // Sort or pick a few unmastered items as the "Error Radar" sample
          errorWords: subUnmastered.slice(0, 5)
        };
      });

      const resolvedStats = await Promise.all(statsPromises);
      setSubjectDetails(resolvedStats);

      setTotalItemsCount(overallTotal);
      setAiUsageCount(overallAiCount);

      // Mastery %
      const pct = overallTotal > 0 ? Math.round((overallMastered / overallTotal) * 100) : 0;
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

      // Map days to count of sessions (instead of just 1 if active)
      const dayCounts = new Map<string, number>();
      sessionsSnap.docs.forEach(doc => {
        const ts = doc.data().startTime as Timestamp;
        if (ts) {
          const dateStr = ts.toDate().toISOString().split('T')[0];
          dayCounts.set(dateStr, (dayCounts.get(dateStr) || 0) + 1);
        }
      });

      // Streak
      let computedStreak = 0;
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (dayCounts.has(d.toISOString().split('T')[0])) {
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
        return { day: dayNames[d.getDay()], count: dayCounts.get(key) || 0 };
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

  if (showSpinner) return <LoadingSpinner fullPage />;
  if (isLoading) return null;

  return (
    <div className="space-y-8 pb-24">
      <div className="text-center my-4 md:my-8">
        <h1 className="text-3xl lg:text-4xl font-bold font-headline">Statistiken</h1>
        <p className="text-sm text-muted-foreground mt-1">Deine detaillierte Lernübersicht</p>
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

        {/* AI Usage */}
        <Card className="rounded-2xl p-6 border bg-card flex flex-col justify-center relative overflow-hidden">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> AI-Nutzung
          </p>
          <p className="text-4xl font-black">{aiUsageCount}</p>
          <p className="text-sm text-muted-foreground">KI-erstellte Vokabeln</p>
          <Sparkles className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-secondary/50 pointer-events-none" />
        </Card>

        {/* Streak */}
        <Card className="rounded-2xl p-6 border bg-card flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Streak</p>
          <p className="text-4xl font-black">{streak}</p>
          <p className="text-sm text-muted-foreground">Tage in Folge</p>
        </Card>
      </div>

      {/* 7-Day Activity SVG Line Chart */}
      <Card className="rounded-2xl p-6 border bg-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-1">
          <Activity className="h-4 w-4" /> Aktivität (Sitzungen pro Tag)
        </p>
        <ActivityLineChart data={weekActivity} />
      </Card>

      {/* Subject-Specific Error Radars & Stats */}
      {subjectDetails.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-headline mt-10 mb-4 px-2">Fächer-Analysen</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {subjectDetails.map((stat) => (
              <Card key={stat.subject.id} className="rounded-2xl overflow-hidden border bg-card flex flex-col">
                <div className="p-5 border-b bg-secondary/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{stat.subject.emoji}</span>
                    <div>
                      <h3 className="font-bold">{stat.subject.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {stat.masteredCount} von {stat.vocabCount} gemeistert
                      </p>
                    </div>
                  </div>
                  <div className="h-10 w-10 relative flex items-center justify-center">
                    <ProgressRing pct={stat.vocabCount > 0 ? Math.round((stat.masteredCount / stat.vocabCount) * 100) : 0} size={40} stroke={4} />
                    <span className="absolute text-[10px] font-bold">
                      {stat.vocabCount > 0 ? Math.round((stat.masteredCount / stat.vocabCount) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Error Radar Section for this subject */}
                <div className="p-5 flex-1 bg-card">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-4">
                    <Target className="h-3 w-3" /> Fehler-Radar
                  </p>

                  {stat.errorWords.length > 0 ? (
                    <div className="space-y-3">
                      {stat.errorWords.map((word) => (
                        <div key={word.id} className="flex justify-between items-center text-sm p-3 rounded-xl bg-destructive/10 text-destructive-foreground/90 border border-destructive/20">
                          <span className="font-semibold truncate max-w-[60%]">{word.term}</span>
                          <span className="text-xs font-medium truncate opacity-80">{word.definition}</span>
                        </div>
                      ))}
                      <p className="text-xs text-center text-muted-foreground mt-4 pt-2 border-t border-dashed opacity-70">
                        Diese Vokabeln solltest du bald wiederholen.
                      </p>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                      <Target className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm font-medium">Radar ist sauber!</p>
                      <p className="text-xs">Alle Vokabeln scheinen zu sitzen.</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {totalItemsCount === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-semibold">Noch keine Vokabeln vorhanden.</p>
          <p className="text-sm mt-1">Füge Vokabeln in deinen Fächern hinzu, um Statistiken zu sehen.</p>
        </div>
      )}
    </div>
  );
}
