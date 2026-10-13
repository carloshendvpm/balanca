import { View } from 'react-native';

import { shortDate } from '@/core/dates';
import { evaluateGoal, type GoalStatus } from '@/core/goals';
import type { Point } from '@/core/series';
import type { GoalRow } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

import { Card, ProgressBar, Row, T } from './kit';

const STATUS: Record<GoalStatus, { label: string; icon: string; tone: 'good' | 'warn' | 'bad' | 'accent' }> = {
  achieved: { label: 'Concluída', icon: '✓', tone: 'good' },
  ahead: { label: 'Adiantado', icon: '▲', tone: 'good' },
  on_track: { label: 'No ritmo', icon: '●', tone: 'accent' },
  behind: { label: 'Atrasado', icon: '▼', tone: 'warn' },
  overdue: { label: 'Prazo vencido', icon: '!', tone: 'bad' },
};

const kg = (v: number, signed = false) =>
  (signed && v > 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + ' kg';

export function GoalCard({ goal, weights, now, footer }: { goal: GoalRow; weights: Point[]; now: number; footer?: React.ReactNode }) {
  const c = useTheme();
  const done = goal.completedAt !== null;
  const g = evaluateGoal(goal, weights, done ? goal.completedAt! : now);
  const s = STATUS[done ? 'achieved' : g.status];
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T variant="heading">{kg(goal.targetKg)}</T>
          <T variant="small" tone="textSecondary">
            até {shortDate(goal.deadline)}
            {!done && g.daysLeft >= 0 ? ` · ${g.daysLeft} dias` : ''}
          </T>
        </View>
        <T variant="small" tone={s.tone} style={{ fontWeight: '600' }}>
          {s.icon} {s.label}
        </T>
      </Row>
      <ProgressBar pct={g.progressPct} color={c[s.tone]} />
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <T variant="caption" tone="textSecondary">
          {g.progressPct.toFixed(0)}% · início {kg(goal.startKg)}
        </T>
        <T variant="caption" tone="textSecondary">
          {done || g.status === 'achieved' ? 'Meta atingida' : `faltam ${kg(Math.abs(g.remainingKg))}`}
        </T>
      </Row>
      {!done && g.status !== 'achieved' && (
        <View style={{ gap: 2 }}>
          {g.requiredKgPerWeek !== null && (
            <T variant="small">
              Necessário: <T variant="small" style={{ fontWeight: '600' }}>{kg(g.requiredKgPerWeek, true)}/semana</T>
            </T>
          )}
          <T variant="small" tone="textSecondary">
            Ritmo atual: {g.currentKgPerWeek === null ? 'poucos dados (pese-se por 1 semana)' : `${kg(g.currentKgPerWeek, true)}/semana`}
          </T>
          {g.currentKgPerWeek !== null && (
            <T variant="small" tone="textSecondary">
              Previsão:{' '}
              {g.projectedDate === null
                ? 'no ritmo atual a meta não será atingida'
                : `${shortDate(g.projectedDate)}${g.projectedDate > goal.deadline ? ' (depois do prazo)' : ''}`}
            </T>
          )}
        </View>
      )}
      {footer}
    </Card>
  );
}
