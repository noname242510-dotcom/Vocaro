'use client';

import { useMemo, useEffect, useState } from 'react';
import type { Subject, Stack, VocabularyItem, Verb } from '@/lib/types';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useFirebase } from '@/firebase/provider';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Sparkles, Target, Activity, Zap } from 'lucide-react';
import Link from 'next/link';

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
  const maxCount = Math.max(...data.map(d => d.count), 5); // Ensure a minimum maxCount
  const yAxisWidth = 30;
  const chartHeight = 150;
  const chartWidth = 400;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - (d.count / maxCount) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const yAxisLabels = Array.from({ length: 5 }, (_, i) => {
    const value = Math.round(maxCount * (i / 4));
    const y = chartHeight - (chartHeight * (i / 4));
    return { y, value };
  });

  return (
    <div className="w-full h-48 flex items-end relative">
      <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + yAxisWidth} ${chartHeight + 30}`} preserveAspectRatio="none" className="overflow-visible">
        <g transform={`translate(${yAxisWidth}, 0)`}>
          {/* Grid Lines and Y-Axis Labels */}
          {yAxisLabels.map((label, i) => (
            <g key={i}>
              <line x1="0" y1={label.y} x2={chartWidth} y2={label.y} className="stroke-border/50" strokeDasharray="4" />
              <text x="-10" y={label.y + 5} textAnchor="end" className="text-xs fill-muted-foreground font-mono">
                {label.value}
              </text>
            </g>
          ))}

          {/* Fill Area */}
          <polyline
            points={`0,${chartHeight + 10} ${points} ${chartWidth},${chartHeight + 10}`}
            className="fill-primary/10"
          />
          {/* Stroke Line */}
          <polyline
            points={points}
            fill="none"
            className="stroke-primary"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * chartWidth;
            const y = chartHeight - (d.count / maxCount) * chartHeight;
            return (
              <circle key={i} cx={x} cy={y} r="3" className={cn(d.count > 0 ? "fill-primary" : "fill-background", "stroke-primary stroke-2")} />
            );
          })}
        </g>
        
        {/* X Axis Labels */}
        <g transform={`translate(${yAxisWidth}, ${chartHeight + 20})`}>
          {data.map((d, i) => {
             const x = (i / (data.length - 1)) * chartWidth;
            return (
              <text key={i} x={x} y="0" textAnchor="middle" className="text-xs font-bold fill-muted-foreground">{d.day}</text>
            )
          })}
        </g>
      </svg>
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
    <div className="space-y-12">
      <div className="space-y-2 pb-4 border-b">
        <h1 className="text-5xl font-bold font-creative tracking-tight text-foreground">
          Lern-Statistiken
        </h1>
        <p className="text-xl text-muted-foreground">
          Verfolge deinen Fortschritt und maximiere deinen Lernerfolg.
        </p>
      </div>

      {/* Hero Metric: Mastery */}
      <Card className="bg-card border-none shadow-xl shadow-primary/5 rounded-[3rem] p-12 overflow-hidden relative">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="relative flex-shrink-0">
            <ProgressRing pct={masteryPct} size={180} stroke={16} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black font-headline">{masteryPct}%</span>
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Mastery</span>
            </div>
          </div>

          <div className="space-y-6 text-center md:text-left">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold font-headline tracking-tighter">Dein aktueller Rang: {rank.label} {rank.emoji}</h2>
              <p className="text-muted-foreground text-lg max-w-md">
                Du gehörst zu den Top 10% der Lernenden in diesem Monat. Bleib dran für den nächsten Meilenstein!
              </p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="bg-background/50 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-3 border">
                <Zap className="h-6 w-6 text-orange-400" />
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60 leading-none">Streak</p>
                  <p className="text-xl font-black">{streak} Tage</p>
                </div>
              </div>
              <div className="bg-background/50 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-3 border">
                <Sparkles className="h-6 w-6 text-blue-300" />
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60 leading-none">AI Items</p>
                  <p className="text-xl font-black">{aiUsageCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative background logo */}
        <Activity className="absolute right-[-40px] bottom-[-40px] w-64 h-64 text-primary/5 pointer-events-none" />
      </Card>

      {/* Activity Chart */}
      <Card className="bg-card border-none shadow-xl shadow-primary/5 rounded-[2.5rem] p-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-bold font-headline uppercase tracking-widest text-muted-foreground text-xs">Wöchentliche Aktivität</h3>
          </div>
        </div>
        <ActivityLineChart data={weekActivity} />
      </Card>

      {/* Subject Details Grid */}
      <section className="space-y-8 pt-8">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold font-headline uppercase tracking-widest text-muted-foreground text-xs">Fächer-Analysen & Fehler-Radar</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {subjectDetails.map((stat) => (
            <Card key={stat.subject.id} className="group bg-card border-none shadow-xl shadow-primary/5 rounded-[2.5rem] hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col">
              <div className="p-8 border-b bg-secondary/10 flex items-center justify-between group-hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-card rounded-2xl flex items-center justify-center text-3xl shadow-sm border group-hover:scale-110 transition-transform">
                    {stat.subject.emoji}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-headline group-hover:text-primary transition-colors">{stat.subject.name}</h3>
                    <p className="text-sm font-bold text-muted-foreground opacity-60 uppercase tracking-wider">
                      {stat.masteredCount} / {stat.vocabCount} Mastered
                    </p>
                  </div>
                </div>
                <div className="relative flex items-center justify-center">
                  <ProgressRing pct={stat.vocabCount > 0 ? Math.round((stat.masteredCount / stat.vocabCount) * 100) : 0} size={60} stroke={6} />
                  <span className="absolute text-xs font-black">
                    {stat.vocabCount > 0 ? Math.round((stat.masteredCount / stat.vocabCount) * 100) : 0}%
                  </span>
                </div>
              </div>

              <div className="p-8 flex-1 space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Top Error Radar</h4>
                  <Link href={`/dashboard/learn?subject=${stat.subject.id}`} className="text-xs font-bold text-primary hover:underline">Focus now</Link>
                </div>

                {stat.errorWords.length > 0 ? (
                  <div className="grid gap-3">
                    {stat.errorWords.map((word) => (
                      <div key={word.id} className="p-4 bg-background rounded-2xl flex items-center justify-between group-hover:bg-primary/5 transition-colors">
                        <span className="font-bold text-foreground truncate">{word.term}</span>
                        <span className="text-sm font-medium text-muted-foreground mr-4 truncate max-w-[120px]">{word.definition}</span>
                        <span className="text-xs font-black uppercase tracking-widest text-destructive/80 bg-destructive/10 px-3 py-1 rounded-full">Error</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                    <Sparkles className="h-10 w-10 mb-4" />
                    <p className="font-bold uppercase tracking-widest text-xs">Radar Clear</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {totalItemsCount === 0 && (
        <Card className="p-20 text-center bg-card border-none shadow-xl rounded-[3rem]">
          <Target className="h-16 w-16 mx-auto mb-6 text-muted-foreground/30" />
          <h3 className="text-3xl font-bold font-headline mb-2">Noch keine Daten vorhanden</h3>
          <p className="text-xl text-muted-foreground max-w-sm mx-auto">
            Füge Vokabeln in deinen Fächern hinzu, um hier detaillierte Analysen zu sehen.
          </p>
        </Card>
      )}
    </div>
  );
}
