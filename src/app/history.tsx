import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { dateTime } from '@/core/dates';
import { formatMetric, METRICS, metricDef, type MetricKey } from '@/core/metrics';
import { navyBodyFat } from '@/core/navy';
import { DAY } from '@/core/series';
import { trendSeries } from '@/core/trend';
import { listUnassigned } from '@/db/repo';
import type { Reading } from '@/db/schema';
import { useQuery } from '@/db/store';
import { useActiveProfile, useGoals, useMeasurements, useProfileReadings, type ReadingWithMetrics } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import { Button, Card, Chips, Divider, Row, Section, Screen, T } from '@/ui/kit';
import { LineChart } from '@/ui/line-chart';
import { ProfileSwitcher } from '@/ui/profile-switcher';
import { ReadingSheet } from '@/ui/reading-sheet';

type ChartKey = MetricKey | 'waistCm' | 'navyBf';

const TAPE_METRICS: { key: ChartKey; label: string; format(v: number): string }[] = [
  { key: 'navyBf', label: 'Gordura (fita)', format: (v) => `${v.toFixed(1).replace('.', ',')}%` },
  { key: 'waistCm', label: 'Cintura', format: (v) => `${v.toFixed(1).replace('.', ',')} cm` },
];

const PERIODS = [
  { key: 30, label: '1M' },
  { key: 90, label: '3M' },
  { key: 180, label: '6M' },
  { key: 365, label: '1A' },
  { key: 0, label: 'Tudo' },
];

export default function History() {
  const c = useTheme();
  const { profiles, active, setActive } = useActiveProfile();
  const readings = useProfileReadings(active);
  const goals = useGoals(active);
  const unassigned = useQuery(listUnassigned, [], [] as Reading[]);
  const measurements = useMeasurements(active);
  const [metric, setMetric] = useState<ChartKey>('weightKg');
  const [days, setDays] = useState(90);
  const [open, setOpen] = useState<Reading | null>(null);
  const [compare, setCompare] = useState<number[]>([]);

  const options = [
    ...METRICS.filter((d) => readings.some((r) => r.m[d.key] != null)).map((d) => ({ key: d.key as ChartKey, label: d.label })),
    ...(measurements.length ? TAPE_METRICS.map((m) => ({ key: m.key, label: m.label })) : []),
  ];
  const tape = TAPE_METRICS.find((m) => m.key === metric);
  const format = (v: number) => (tape ? tape.format(v) : formatMetric(metric as MetricKey, v));
  const now = Date.now();
  const series = useMemo(() => {
    const all =
      metric === 'waistCm'
        ? measurements.map((m) => ({ t: m.measuredAt, v: m.waistCm }))
        : metric === 'navyBf'
          ? measurements.flatMap((m) => {
              const v = active && navyBodyFat(active.sex, active.heightCm, m);
              return v == null ? [] : [{ t: m.measuredAt, v }];
            })
          : readings.filter((r) => r.m[metric] != null).map((r) => ({ t: r.measuredAt, v: r.m[metric]! }));
    return all.filter((p) => days === 0 || p.t >= now - days * DAY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings, measurements, metric, days, active]);
  const pair = compare.map((id) => readings.find((r) => r.id === id)).filter(Boolean) as ReadingWithMetrics[];
  pair.sort((a, b) => a.measuredAt - b.measuredAt);

  const toggleCompare = (id: number) =>
    setCompare((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur.slice(-1), id]));

  return (
    <Screen title="Histórico">
      <ProfileSwitcher profiles={profiles} active={active} onChange={setActive} />

      {unassigned.length > 0 && (
        <Section title="Sem perfil">
          <Card>
            {unassigned.map((r) => (
              <Pressable key={r.id} onPress={() => setOpen(r)}>
                <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                  <T>{dateTime(r.measuredAt)}</T>
                  <T style={{ fontWeight: '600' }}>{formatMetric('weightKg', r.weightKg)} ›</T>
                </Row>
              </Pressable>
            ))}
          </Card>
        </Section>
      )}

      {active && readings.length > 0 && (
        <>
          <Chips options={options} value={metric} onChange={setMetric} />
          <View style={{ gap: 12 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <T variant="heading">{tape ? tape.label : metricDef(metric as MetricKey).label}</T>
              {series.length > 1 && (
                <T tone="textSecondary">
                  {(() => {
                    const d = series[series.length - 1].v - series[0].v;
                    return `${d > 0 ? '+' : ''}${format(d)} no período`;
                  })()}
                </T>
              )}
            </Row>
            <Chips options={PERIODS} value={days} onChange={setDays} />
            <LineChart
              raw={series}
              trend={tape ? series : trendSeries(series)}
              goals={
                metric === 'weightKg'
                  ? goals.filter((g) => g.completedAt === null).map((g) => ({ value: g.targetKg, label: `Meta ${g.targetKg.toString().replace('.', ',')} kg` }))
                  : []
              }
              format={format}
            />
          </View>

          {pair.length === 2 && (
            <Section title="Comparação" right={<Button label="Limpar" kind="plain" onPress={() => setCompare([])} />}>
              <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T variant="small" tone="textSecondary" style={{ flex: 1.3 }} />
                  {pair.map((r) => (
                    <T key={r.id} variant="caption" tone="textSecondary" style={{ flex: 1, textAlign: 'right' }}>
                      {new Date(r.measuredAt).toLocaleDateString('pt-BR')}
                    </T>
                  ))}
                  <T variant="caption" tone="textSecondary" style={{ flex: 1, textAlign: 'right' }}>
                    Diferença
                  </T>
                </Row>
                {METRICS.filter((d) => pair.every((r) => r.m[d.key] != null)).map((d) => {
                  const diff = pair[1].m[d.key]! - pair[0].m[d.key]!;
                  const tone = d.upIs === 'neutral' || Math.abs(diff) < 10 ** -d.decimals ? 'textSecondary' : (diff > 0) === (d.upIs === 'good') ? 'good' : 'bad';
                  return (
                    <Row key={d.key} style={{ justifyContent: 'space-between' }}>
                      <T variant="small" style={{ flex: 1.3 }}>
                        {d.label}
                      </T>
                      {pair.map((r) => (
                        <T key={r.id} variant="small" style={{ flex: 1, textAlign: 'right' }}>
                          {formatMetric(d.key, r.m[d.key])}
                        </T>
                      ))}
                      <T variant="small" tone={tone} style={{ flex: 1, textAlign: 'right', fontWeight: '600' }}>
                        {diff > 0 ? '+' : ''}
                        {diff.toFixed(d.decimals).replace('.', ',')}
                      </T>
                    </Row>
                  );
                })}
              </Card>
            </Section>
          )}

          <Section title={`Pesagens (${readings.length})`}>
            <Card style={{ gap: 0, paddingVertical: 4 }}>
              {[...readings].reverse().map((r, i) => {
                const selected = compare.includes(r.id);
                return (
                  <View key={r.id}>
                    {i > 0 && <Divider />}
                    <Row style={{ paddingVertical: 10 }}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel="Comparar"
                        onPress={() => toggleCompare(r.id)}
                        hitSlop={10}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 2,
                          borderColor: selected ? c.accent : c.separator,
                          backgroundColor: selected ? c.accent : 'transparent',
                        }}
                      />
                      <Pressable style={{ flex: 1 }} onPress={() => setOpen(r)}>
                        <Row style={{ justifyContent: 'space-between' }}>
                          <View>
                            <T>{dateTime(r.measuredAt)}</T>
                            <T variant="caption" tone="textSecondary">
                              {r.m.bodyFatPct != null ? `Gordura ${formatMetric('bodyFatPct', r.m.bodyFatPct)}` : r.variant === 'manual' ? 'Manual' : 'Só peso'}
                            </T>
                          </View>
                          <T style={{ fontWeight: '600' }}>{formatMetric('weightKg', r.weightKg)} ›</T>
                        </Row>
                      </Pressable>
                    </Row>
                  </View>
                );
              })}
            </Card>
            <T variant="caption" tone="textMuted">
              Marque duas pesagens para compará-las.
            </T>
          </Section>
        </>
      )}

      {active && readings.length === 0 && (
        <Card>
          <T tone="textSecondary">Ainda não há pesagens para {active.name}.</T>
        </Card>
      )}

      <ReadingSheet reading={open} profiles={profiles} onClose={() => setOpen(null)} />
    </Screen>
  );
}

