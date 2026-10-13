import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { dateTime } from '@/core/dates';
import { formatMetric, type MetricKey } from '@/core/metrics';
import { DAY, deltaOver, movingAverage, type Point } from '@/core/series';
import { listUnassigned } from '@/db/repo';
import type { Reading } from '@/db/schema';
import { useQuery } from '@/db/store';
import { useActiveProfile, useGoals, useProfileReadings } from '@/hooks/use-data';
import { GoalCard } from '@/ui/goal-card';
import { Button, Card, Row, Section, Screen, T } from '@/ui/kit';
import { LineChart } from '@/ui/line-chart';
import { ProfileEditor } from '@/ui/profile-editor';
import { ProfileSwitcher } from '@/ui/profile-switcher';
import { StatTile } from '@/ui/stat-tile';

const TILES: MetricKey[] = ['bodyFatPct', 'muscleKg', 'visceralFat', 'waterPct', 'bmi', 'bmrKcal', 'boneKg', 'bodyAge'];

export default function Home() {
  const { profiles, active, setActive } = useActiveProfile();
  const readings = useProfileReadings(active);
  const goals = useGoals(active);
  const unassigned = useQuery(listUnassigned, [], [] as Reading[]);
  const [editing, setEditing] = useState(false);
  const now = Date.now();

  const weights: Point[] = useMemo(() => readings.map((r) => ({ t: r.measuredAt, v: r.weightKg })), [readings]);
  const last = readings[readings.length - 1];
  const prev = readings[readings.length - 2];
  const lastBia = [...readings].reverse().find((r) => r.impedance !== null);
  const recent = weights.filter((p) => p.t >= now - 90 * DAY);
  const activeGoals = goals.filter((g) => g.completedAt === null);

  if (!active) {
    return (
      <Screen title="Balança">
        <Card>
          <T variant="heading">Bem-vindo</T>
          <T tone="textSecondary">
            Crie seu perfil para calcular gordura, músculo e as demais métricas. Seus dados ficam só neste aparelho.
          </T>
          <Button label="Criar perfil" onPress={() => setEditing(true)} testID="create-profile" />
        </Card>
        <ProfileEditor visible={editing} profile={null} usedColors={[]} onClose={() => setEditing(false)} />
      </Screen>
    );
  }

  const seriesDelta = (k: MetricKey) => {
    const pts = readings.filter((r) => r.m[k] != null).map((r) => ({ t: r.measuredAt, v: r.m[k]! }));
    return pts.length >= 2 ? pts[pts.length - 1].v - pts[pts.length - 2].v : null;
  };

  return (
    <Screen title={active.name}>
      <ProfileSwitcher profiles={profiles} active={active} onChange={setActive} />

      {unassigned.length > 0 && (
        <Card>
          <T>
            {unassigned.length} pesagem(ns) sem perfil.
          </T>
          <Button label="Atribuir no Histórico" kind="secondary" onPress={() => router.navigate('/history')} />
        </Card>
      )}

      {last ? (
        <Card>
          <T variant="small" tone="textSecondary">
            Última pesagem · {dateTime(last.measuredAt)}
          </T>
          <T variant="hero" testID="last-weight">
            {last.weightKg.toFixed(2).replace('.', ',')}
            <T variant="heading" tone="textSecondary">
              {' '}
              kg
            </T>
          </T>
          <Row style={{ flexWrap: 'wrap', gap: Spacing.four }}>
            <Delta label="vs. anterior" v={prev ? last.weightKg - prev.weightKg : null} />
            <Delta label="7 dias" v={deltaOver(weights, 7)} />
            <Delta label="30 dias" v={deltaOver(weights, 30)} />
          </Row>
        </Card>
      ) : (
        <Card>
          <T variant="heading">Nenhuma pesagem ainda</T>
          <T tone="textSecondary">Abra a aba Pesar e suba na balança.</T>
          <Button label="Pesar agora" onPress={() => router.navigate('/weigh')} />
        </Card>
      )}

      {recent.length > 0 && (
        <Section title="Peso · 90 dias">
          <Card>
            <LineChart
              raw={recent}
              trend={movingAverage(recent)}
              goals={activeGoals.map((g) => ({ value: g.targetKg, label: `Meta ${formatMetric('weightKg', g.targetKg).replace(',00', '')}` }))}
              format={(v) => formatMetric('weightKg', v)}
            />
          </Card>
        </Section>
      )}

      {lastBia && (
        <Section title={`Composição corporal · ${dateTime(lastBia.measuredAt)}`}>
          <View style={styles.grid}>
            {TILES.map((k) => (
              <StatTile key={k} k={k} value={lastBia.m[k]} delta={seriesDelta(k)} sex={active.sex} />
            ))}
          </View>
          <T variant="caption" tone="textMuted">
            Estimativas por bioimpedância (fórmulas do app OKOK). Não substituem avaliação profissional.
          </T>
        </Section>
      )}

      {activeGoals.length > 0 && (
        <Section title="Metas" right={<Button label="Ver todas" kind="plain" onPress={() => router.navigate('/goals')} />}>
          {activeGoals.map((g) => (
            <GoalCard key={g.id} goal={g} weights={weights} now={now} />
          ))}
        </Section>
      )}
    </Screen>
  );
}

function Delta({ label, v }: { label: string; v: number | null }) {
  return (
    <View>
      <T variant="caption" tone="textSecondary">
        {label}
      </T>
      <T variant="body" style={{ fontWeight: '600' }}>
        {v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')} kg`}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
