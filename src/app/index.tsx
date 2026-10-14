import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { dateTime } from '@/core/dates';
import { formatMetric, type MetricKey } from '@/core/metrics';
import { DAY, deltaOver, type Point } from '@/core/series';
import { trendSeries } from '@/core/trend';
import { listUnassigned } from '@/db/repo';
import type { Reading } from '@/db/schema';
import { useQuery } from '@/db/store';
import { useActiveProfile, useGoals, useMeasurements, useProfileReadings } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { GoalCard } from '@/ui/goal-card';
import { Button, Card, Row, Section, Screen, T } from '@/ui/kit';
import { LineChart } from '@/ui/line-chart';
import { MeasurementsSection } from '@/ui/measurements';
import { ProfileEditor } from '@/ui/profile-editor';
import { ProfileSwitcher } from '@/ui/profile-switcher';
import { ScaleWindow } from '@/ui/scale-window';
import { StatTile } from '@/ui/stat-tile';

const TILES: MetricKey[] = ['bodyFatPct', 'muscleKg', 'visceralFat', 'waterPct', 'bmi', 'bmrKcal', 'boneKg', 'bodyAge'];

const kg1 = (v: number) => v.toFixed(1).replace('.', ',');
const today = () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Home() {
  const c = useTheme();
  const { profiles, active, setActive } = useActiveProfile();
  const readings = useProfileReadings(active);
  const goals = useGoals(active);
  const measurements = useMeasurements(active);
  const unassigned = useQuery(listUnassigned, [], [] as Reading[]);
  const [editing, setEditing] = useState(false);
  const now = Date.now();

  const weights: Point[] = useMemo(() => readings.map((r) => ({ t: r.measuredAt, v: r.weightKg })), [readings]);
  const trend = useMemo(() => trendSeries(weights), [weights]);
  const last = readings[readings.length - 1];
  const trendNow = trend.length ? trend[trend.length - 1].v : null;
  const lastBia = [...readings].reverse().find((r) => r.impedance !== null);
  const recent = weights.filter((p) => p.t >= now - 90 * DAY);
  const recentTrend = trend.filter((p) => p.t >= now - 90 * DAY);
  const activeGoals = goals.filter((g) => g.completedAt === null);

  if (!active) {
    return (
      <Screen title="Balança" subtitle={today()}>
        <View style={{ gap: Spacing.four }}>
          <T variant="heading">Seu peso, sem conta e sem nuvem</T>
          <T tone="textSecondary">
            Crie seu perfil para acompanhar a tendência do peso, as metas e as medidas. Tudo fica guardado só neste aparelho.
          </T>
          <Button label="Criar perfil" onPress={() => setEditing(true)} testID="create-profile" />
        </View>
        <ProfileEditor visible={editing} profile={null} usedColors={[]} onClose={() => setEditing(false)} />
      </Screen>
    );
  }

  const seriesDelta = (k: MetricKey) => {
    const pts = readings.filter((r) => r.m[k] != null);
    return pts.length >= 2 ? pts[pts.length - 1].m[k]! - pts[pts.length - 2].m[k]! : null;
  };

  return (
    <Screen title={active.name} subtitle={today()}>
      <ProfileSwitcher profiles={profiles} active={active} onChange={setActive} />

      {unassigned.length > 0 && (
        <Pressable onPress={() => router.navigate('/history')}>
          <Card style={{ backgroundColor: c.accentSoft }}>
            <T>
              {unassigned.length === 1 ? 'Uma pesagem está sem dono.' : `${unassigned.length} pesagens estão sem dono.`} Toque para escolher de quem são.
            </T>
          </Card>
        </Pressable>
      )}

      {trendNow !== null && last ? (
        <View style={{ gap: Spacing.three }}>
          <View>
            <T variant="small" tone="textSecondary">
              Peso de tendência
            </T>
            <Row style={{ alignItems: 'flex-end', gap: 8 }}>
              <T variant="hero" testID="trend-weight">
                {kg1(trendNow)}
              </T>
              <T variant="heading" tone="textSecondary" style={{ marginBottom: 10 }}>
                kg
              </T>
            </Row>
            <T variant="small" tone="textSecondary" testID="last-weight">
              Última pesagem: {last.weightKg.toFixed(2).replace('.', ',')} kg em {dateTime(last.measuredAt)}
            </T>
          </View>
          <ScaleWindow
            value={trendNow}
            raw={last.weightKg}
            goals={activeGoals.map((g) => ({ value: g.targetKg, label: `${kg1(g.targetKg)} kg` }))}
          />
          <Row style={{ gap: 0 }}>
            <Delta label="Em 7 dias" v={deltaOver(trend, 7)} />
            <Delta label="Em 30 dias" v={deltaOver(trend, 30)} />
            <Delta label="Desde o início" v={trend.length > 1 ? trendNow - trend[0].v : null} />
          </Row>
        </View>
      ) : (
        <View style={{ gap: Spacing.three }}>
          <T variant="heading">Nenhuma pesagem ainda</T>
          <T tone="textSecondary">Abra Pesar e suba na balança descalço. O peso aparece aqui assim que estabilizar.</T>
          <Button label="Pesar agora" onPress={() => router.navigate('/weigh')} />
        </View>
      )}

      {recent.length > 1 && (
        <Section title="Últimos 90 dias" right={<Button label="Histórico" kind="plain" onPress={() => router.navigate('/history')} />}>
          <LineChart
            raw={recent}
            trend={recentTrend}
            goals={activeGoals.map((g) => ({ value: g.targetKg, label: `${kg1(g.targetKg)} kg` }))}
            format={(v) => formatMetric('weightKg', v)}
          />
        </Section>
      )}

      {activeGoals.length > 0 && (
        <Section title="Metas" right={<Button label="Gerenciar" kind="plain" onPress={() => router.navigate('/goals')} />}>
          {activeGoals.map((g) => (
            <GoalCard key={g.id} goal={g} weights={weights} now={now} />
          ))}
        </Section>
      )}

      <MeasurementsSection profile={active} measurements={measurements} hasBia={!!lastBia} />

      {lastBia && (
        <Section title="Bioimpedância" hint={`Pesagem de ${dateTime(lastBia.measuredAt)}`}>
          <View style={styles.grid}>
            {TILES.map((k) => (
              <StatTile key={k} k={k} value={lastBia.m[k]} delta={seriesDelta(k)} sex={active.sex} />
            ))}
          </View>
          <T variant="caption" tone="textMuted">
            Estimativas com as fórmulas do app OKOK. Não substituem avaliação profissional.
          </T>
        </Section>
      )}
    </Screen>
  );
}

function Delta({ label, v }: { label: string; v: number | null }) {
  return (
    <View style={{ flex: 1 }}>
      <T variant="caption" tone="textSecondary">
        {label}
      </T>
      <T variant="number">{v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${kg1(Math.abs(v))} kg`}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
