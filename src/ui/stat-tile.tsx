import { StyleSheet, View } from 'react-native';

import { bandFor, formatMetric, metricDef, type MetricKey } from '@/core/metrics';
import type { Sex } from '@/core/bia';
import { useTheme } from '@/hooks/use-theme';

import { T } from './kit';

const toneOf = { low: 'low', ok: 'good', warn: 'warn', bad: 'bad' } as const;

export function StatTile({ k, value, delta, sex }: { k: MetricKey; value: number | null | undefined; delta?: number | null; sex: Sex }) {
  const c = useTheme();
  const def = metricDef(k);
  const band = value === null || value === undefined ? null : bandFor(k, value, sex);
  const deltaTone =
    delta === null || delta === undefined || Math.abs(delta) < 10 ** -def.decimals || def.upIs === 'neutral'
      ? 'textSecondary'
      : (delta > 0) === (def.upIs === 'good')
        ? 'good'
        : 'bad';
  return (
    <View style={[styles.tile, { backgroundColor: c.card }]}>
      <T variant="caption" tone="textSecondary">
        {def.label}
      </T>
      <T variant="heading">{formatMetric(k, value)}</T>
      <View style={styles.footer}>
        {band && (
          <T variant="caption" tone={toneOf[band.tone]} style={{ fontWeight: '600' }}>
            {band.label}
          </T>
        )}
        {delta !== null && delta !== undefined && (
          <T variant="caption" tone={deltaTone}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {Math.abs(delta).toFixed(def.decimals).replace('.', ',')}
          </T>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flexBasis: '47%', flexGrow: 1, borderRadius: 14, padding: 12, gap: 2 },
  footer: { flexDirection: 'row', gap: 8, minHeight: 16 },
});
