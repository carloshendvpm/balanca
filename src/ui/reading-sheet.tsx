import { View } from 'react-native';

import { dateTime } from '@/core/dates';
import { formatMetric, METRICS, metricsFor } from '@/core/metrics';
import { settleGoals } from '@/db/actions';
import { assignReading, deleteReading } from '@/db/repo';
import type { Profile, Reading } from '@/db/schema';
import { useStore } from '@/db/store';

import { Button, Chips, Divider, Row, T } from './kit';
import { confirm } from './profile-editor';
import { Sheet } from './sheet';

export function ReadingSheet({ reading, profiles, onClose }: { reading: Reading | null; profiles: Profile[]; onClose(): void }) {
  const { db, invalidate } = useStore();
  const owner = profiles.find((p) => p.id === reading?.profileId) ?? null;
  const m = reading && owner ? metricsFor(reading, owner) : null;

  const reassign = async (profileId: number) => {
    await assignReading(db, reading!.id, profileId);
    await settleGoals(db, profileId);
    invalidate();
    onClose();
  };
  const remove = () =>
    confirm('Apagar pesagem?', 'Esta ação não pode ser desfeita.', async () => {
      await deleteReading(db, reading!.id);
      invalidate();
      onClose();
    });

  return (
    <Sheet visible={reading !== null} title={reading ? dateTime(reading.measuredAt) : ''} onClose={onClose}>
      {reading && (
        <>
          <View style={{ gap: 6 }}>
            {(m ? METRICS.filter((d) => m[d.key] != null) : METRICS.slice(0, 1)).map((d) => (
              <Row key={d.key} style={{ justifyContent: 'space-between' }}>
                <T tone="textSecondary">{d.label}</T>
                <T>{formatMetric(d.key, m ? m[d.key] : reading.weightKg)}</T>
              </Row>
            ))}
            <Row style={{ justifyContent: 'space-between' }}>
              <T tone="textSecondary">Impedância</T>
              <T>{reading.impedance === null ? '—' : `${reading.impedance.toFixed(1)} Ω`}</T>
            </Row>
          </View>
          <Divider />
          <T variant="small" tone="textSecondary">
            {owner ? 'Mover para outro perfil' : 'Atribuir a um perfil'}
          </T>
          <Chips
            options={profiles.filter((p) => p.id !== owner?.id).map((p) => ({ key: p.id, label: p.name, color: p.color }))}
            value={null}
            onChange={reassign}
          />
          <T variant="mono" tone="textMuted">
            {reading.variant === 'manual' ? 'Registrada manualmente' : `Variante ${reading.variant}${reading.rawHex ? `, dados ${reading.rawHex}` : ''}`}
          </T>
          <Button label="Apagar pesagem" kind="danger" onPress={remove} />
        </>
      )}
    </Sheet>
  );
}
