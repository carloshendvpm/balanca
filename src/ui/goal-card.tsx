import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { evaluateGoal, type GoalStatus } from '@/core/goals';
import type { Point } from '@/core/series';
import type { GoalRow } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

import { Card, Row, T } from './kit';

const STATUS: Record<GoalStatus, { label: string; icon: string; tone: 'good' | 'warn' | 'bad' | 'accent' }> = {
  achieved: { label: 'Concluída', icon: '✓', tone: 'good' },
  ahead: { label: 'Adiantado', icon: '▲', tone: 'good' },
  on_track: { label: 'No ritmo', icon: '●', tone: 'accent' },
  behind: { label: 'Atrasado', icon: '▼', tone: 'warn' },
  overdue: { label: 'Prazo vencido', icon: '!', tone: 'bad' },
};

const kg = (v: number, signed = false) => (signed && v > 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + ' kg';
const monthDay = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
const fullDate = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });

export function GoalCard({ goal, weights, now, footer }: { goal: GoalRow; weights: Point[]; now: number; footer?: ReactNode }) {
  const c = useTheme();
  const done = goal.completedAt !== null;
  const g = evaluateGoal(goal, weights, done ? goal.completedAt! : now);
  const s = STATUS[done ? 'achieved' : g.status];
  const finished = done || g.status === 'achieved';

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flexShrink: 1 }}>
          <T variant="title">{kg(goal.targetKg)}</T>
          <T variant="small" tone="textSecondary">
            {finished ? `Concluída em ${fullDate(goal.completedAt ?? now)}` : `até ${fullDate(goal.deadline)}, faltam ${Math.max(g.daysLeft, 0)} dias`}
          </T>
        </View>
        <T variant="small" tone={s.tone} numberOfLines={1} style={{ fontWeight: '700', marginTop: 8, flexShrink: 0 }}>
          {s.icon} {s.label}
        </T>
      </Row>

      <View style={{ gap: 6 }}>
        <View style={[styles.track, { backgroundColor: c.separator }]}>
          <View style={[styles.fill, { width: `${g.progressPct}%`, backgroundColor: c[s.tone] }]} />
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="caption" tone="textSecondary">
            {kg(goal.startKg)} em {monthDay(goal.startDate)}
          </T>
          <T variant="caption" tone="textSecondary">
            {finished ? '100%' : `${g.progressPct.toFixed(0)}%, faltam ${kg(Math.abs(g.remainingKg))}`}
          </T>
        </Row>
      </View>

      {!finished && (
        <Row style={{ gap: 0, alignItems: 'flex-start' }}>
          <Stat label="Precisa" value={g.requiredKgPerWeek === null ? '—' : `${kg(g.requiredKgPerWeek, true)}/sem`} />
          <Stat label="Ritmo atual" value={g.currentKgPerWeek === null ? '—' : `${kg(g.currentKgPerWeek, true)}/sem`} />
          <Stat
            label="Previsão"
            value={g.projectedDate === null ? '—' : monthDay(g.projectedDate)}
            tone={g.projectedDate !== null && g.projectedDate > goal.deadline ? 'warn' : undefined}
          />
        </Row>
      )}
      {!finished && g.currentKgPerWeek === null && (
        <T variant="caption" tone="textMuted">
          Ritmo e previsão aparecem depois de uma semana de pesagens.
        </T>
      )}
      {!finished && g.currentKgPerWeek !== null && g.projectedDate === null && (
        <T variant="caption" tone="warn">
          No ritmo atual, o peso está se afastando desta meta.
        </T>
      )}
      {footer}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <View style={{ flex: 1 }}>
      <T variant="caption" tone="textSecondary">
        {label}
      </T>
      <T variant="number" tone={tone ?? 'text'} style={{ fontSize: 19 }}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
