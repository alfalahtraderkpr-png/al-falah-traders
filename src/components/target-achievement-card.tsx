'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, TrendingDown, Minus, BarChart3, Package, Weight, DollarSign } from 'lucide-react';

interface TargetData {
  id: string;
  orderBookerId: string;
  companyId: string;
  month: number;
  year: number;
  targetCtns: number;
  targetTonnage: number;
  targetValue: number;
  orderBooker: { id: string; name: string };
  company: { id: string; name: string; category?: string };
  achievement: {
    achievedValue: number;
    achievedCash: number;
    achievedCredit: number;
    totalRecovery: number;
    valueAchievementPct: number;
    ctnsAchievementPct: number;
    tonnageAchievementPct: number;
    daysWorked: number;
  };
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function formatPKR(n: number | null | undefined) {
  return (n ?? 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatCompact(n: number | null | undefined) {
  const v = n ?? 0;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return v.toString();
}

export default function TargetAchievementCard() {
  const now = new Date();
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTargets = async () => {
      setLoading(true);
      try {
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const res = await fetch(`/api/targets?month=${month}&year=${year}&includeAchievement=true`);
        if (res.ok) {
          const data = await res.json();
          setTargets(data.targets || []);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetchTargets();
  }, []);

  if (loading) {
    return (
      <Card className="glass-card-v2 card-hover border border-rose-200/50 dark:border-rose-800/50 animate-fade-in-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-500 animate-pulse" />
            Target Achievement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
            Loading targets...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (targets.length === 0) {
    return (
      <Card className="glass-card-v2 card-hover border border-rose-200/50 dark:border-rose-800/50 animate-fade-in-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-500" />
            Target Achievement — {MONTHS[now.getMonth()]} {now.getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No targets set for this month</p>
            <p className="text-xs mt-1">Go to Settings → Sales Targets to set monthly targets</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalTargetValue = targets.reduce((s, t) => s + (t.targetValue || 0), 0);
  const totalAchievedValue = targets.reduce((s, t) => s + (t.achievement?.achievedValue || 0), 0);
  const overallPct = totalTargetValue > 0 ? Math.round((totalAchievedValue / totalTargetValue) * 100) : 0;

  const getBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (pct: number) => {
    if (pct >= 100) return <Badge className="bg-emerald-500 text-white text-[9px] gap-0.5 h-5"><TrendingUp className="w-2.5 h-2.5" />Achieved</Badge>;
    if (pct >= 70) return <Badge className="bg-amber-500 text-white text-[9px] gap-0.5 h-5"><Minus className="w-2.5 h-2.5" />On Track</Badge>;
    return <Badge className="bg-red-500 text-white text-[9px] gap-0.5 h-5"><TrendingDown className="w-2.5 h-2.5" />Behind</Badge>;
  };

  // Group by OB
  const obMap: Record<string, { name: string; targets: TargetData[] }> = {};
  targets.forEach(t => {
    if (!obMap[t.orderBookerId]) {
      obMap[t.orderBookerId] = { name: t.orderBooker.name, targets: [] };
    }
    obMap[t.orderBookerId].targets.push(t);
  });

  return (
    <Card className="glass-card-v2 card-hover border border-rose-200/50 dark:border-rose-800/50 animate-fade-in-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-rose-500" />
          Target Achievement — {MONTHS[now.getMonth()]} {now.getFullYear()}
          <Badge className={`${overallPct >= 100 ? 'bg-emerald-500' : overallPct >= 70 ? 'bg-amber-500' : 'bg-red-500'} text-white text-[10px] ml-1`}>
            {overallPct}% Overall
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Target: PKR {formatCompact(totalTargetValue)}</span>
            <span>Achieved: PKR {formatCompact(totalAchievedValue)}</span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${getBarColor(overallPct)}`}
              style={{ width: `${Math.min(overallPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Per-OB Achievement */}
        <div className="space-y-3">
          {Object.entries(obMap).map(([obId, obData]) => {
            const obTargetVal = obData.targets.reduce((s, t) => s + (t.targetValue || 0), 0);
            const obAchievedVal = obData.targets.reduce((s, t) => s + (t.achievement?.achievedValue || 0), 0);
            const obPct = obTargetVal > 0 ? Math.round((obAchievedVal / obTargetVal) * 100) : 0;

            return (
              <div key={obId} className="p-3 rounded-xl bg-gradient-to-r from-rose-50/50 to-pink-50/50 dark:from-rose-950/10 dark:to-pink-950/10 border border-rose-200/30 dark:border-rose-800/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {obData.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{obData.name}</p>
                      <p className="text-[10px] text-muted-foreground">{obData.targets.length} companies</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      PKR {formatCompact(obAchievedVal)}
                    </span>
                    {getStatusBadge(obPct)}
                  </div>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(obPct)}`}
                    style={{ width: `${Math.min(obPct, 100)}%` }}
                  />
                </div>
                {/* Per-company mini bars */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {obData.targets.map(t => {
                    const pct = t.achievement?.valueAchievementPct || 0;
                    return (
                      <div key={t.id} className="flex items-center gap-1.5 p-1.5 rounded-md bg-white/50 dark:bg-black/10">
                        <span className="text-[9px] text-muted-foreground truncate flex-1" title={t.company.name}>{t.company.name}</span>
                        <span className="text-[9px] font-mono font-semibold min-w-[28px] text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
