import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

import { startScale, isSimulated, type BluetoothState } from '@/ble/scale-source';
import { setSimulatedWeight } from '@/ble/mock-scale';
import { StableDetector } from '@/core/capture';
import { parseDecimal } from '@/core/dates';
import { formatMetric, metricsFor } from '@/core/metrics';
import type { ScaleReading } from '@/core/protocol/parse';
import { syncReminders } from '@/data/reminders';
import { recordWeighing, settleGoals } from '@/db/actions';
import { assignReading, setReadingImpedance } from '@/db/repo';
import { useStore } from '@/db/store';
import { useProfiles } from '@/hooks/use-data';
import { Button, Card, Chips, Field, Row, Section, Screen, T } from '@/ui/kit';

const BT_MESSAGES: Partial<Record<BluetoothState | 'simulated', string>> = {
  poweredOff: 'Bluetooth desligado. Ative-o na Central de Controle.',
  unauthorized: 'Sem permissão de Bluetooth. Libere em Ajustes › Privacidade › Bluetooth.',
  unsupported: 'Este aparelho não suporta Bluetooth LE.',
  simulated: 'Modo simulação (sem Bluetooth neste ambiente).',
};

interface Saved {
  id: number;
  profileId: number | null;
  candidates: number[]; // profiles to offer when not matched
  weightKg: number;
  impedance: number | null;
  measuredAt: number;
}

export default function Weigh() {
  const { db, invalidate } = useStore();
  const profiles = useProfiles();
  const [bt, setBt] = useState<BluetoothState | 'simulated' | null>(null);
  const [live, setLive] = useState<ScaleReading | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [run, setRun] = useState(0);
  const [simKg, setSimKg] = useState('82,4');
  const [manualKg, setManualKg] = useState('');
  const savedRef = useRef<Saved | null>(null);

  const keep = (s: Saved | null) => {
    savedRef.current = s;
    setSaved(s);
  };

  useFocusEffect(
    useCallback(() => {
      const detector = new StableDetector();
      const stop = startScale({
        onState: setBt,
        onReading: async (r) => {
          setLive(r);
          const ev = detector.push(r, Date.now());
          if (!ev) return;
          if (ev.kind === 'new') {
            const measuredAt = Date.now();
            const base = { measuredAt, weightKg: r.weightKg, impedance: r.impedance, variant: r.variant, rawHex: r.rawHex };
            const { id, match } = await recordWeighing(db, base);
            syncReminders(db).catch(() => {});
            keep({
              id,
              profileId: match.kind === 'match' ? match.profileId : null,
              candidates: match.kind === 'ambiguous' ? match.profileIds : [],
              weightKg: r.weightKg,
              impedance: r.impedance,
              measuredAt,
            });
          } else if (savedRef.current) {
            await setReadingImpedance(db, savedRef.current.id, r.impedance!, r.rawHex);
            keep({ ...savedRef.current, impedance: r.impedance });
          }
          invalidate();
        },
      });
      return stop;
    }, [db, invalidate, run]),
  );

  const assign = async (profileId: number) => {
    if (!saved) return;
    await assignReading(db, saved.id, profileId);
    await settleGoals(db, profileId);
    keep({ ...saved, profileId });
    invalidate();
  };

  const addManual = async () => {
    const kg = parseDecimal(manualKg);
    if (!kg || kg < 2 || kg > 300) return;
    const measuredAt = Date.now();
    const { id, match } = await recordWeighing(db, { measuredAt, weightKg: kg, impedance: null, variant: 'manual', rawHex: '' });
    syncReminders(db).catch(() => {});
    keep({
      id,
      profileId: match.kind === 'match' ? match.profileId : null,
      candidates: match.kind === 'ambiguous' ? match.profileIds : [],
      weightKg: kg,
      impedance: null,
      measuredAt,
    });
    setManualKg('');
    invalidate();
  };

  const owner = profiles.find((p) => p.id === saved?.profileId);
  const m = saved && owner ? metricsFor(saved, owner) : null;
  const offered = saved ? (saved.candidates.length ? profiles.filter((p) => saved.candidates.includes(p.id)) : profiles) : [];
  const status = !live ? 'Suba na balança…' : live.stable ? 'Peso estável' : 'Estabilizando…';

  return (
    <Screen title="Pesar">
      {bt && BT_MESSAGES[bt] && (
        <T variant="small" tone={bt === 'simulated' ? 'textSecondary' : 'warn'}>
          {BT_MESSAGES[bt]}
        </T>
      )}

      <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
        <T variant="small" tone={live?.stable ? 'good' : 'textSecondary'} testID="weigh-status">
          {status}
        </T>
        <T variant="hero" testID="live-weight" style={{ opacity: live && !live.stable ? 0.5 : 1 }}>
          {live ? live.weightKg.toFixed(2).replace('.', ',') : '--,--'}
          <T variant="heading" tone="textSecondary">
            {' '}
            kg
          </T>
        </T>
        <T variant="caption" tone="textMuted">
          {live
            ? live.impedance
              ? `Impedância ${live.impedance.toFixed(1).replace('.', ',')} Ω`
              : live.stable
                ? 'Peso registrado'
                : 'Fique parado'
            : 'Fique descalço para medir a composição corporal'}
        </T>
      </Card>

      {saved && (
        <Section title="Pesagem salva">
          <Card>
            {owner ? (
              <>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: owner.color }} />
                    <T variant="heading" testID="saved-owner">
                      {owner.name}
                    </T>
                  </Row>
                  <T tone="textSecondary">{formatMetric('weightKg', saved.weightKg)}</T>
                </Row>
                {m?.bodyFatPct != null ? (
                  <T tone="textSecondary">
                    Gordura {formatMetric('bodyFatPct', m.bodyFatPct)}, músculo {formatMetric('muscleKg', m.muscleKg)}, IMC{' '}
                    {formatMetric('bmi', m.bmi)}
                  </T>
                ) : (
                  <T tone="textSecondary">IMC {formatMetric('bmi', m?.bmi)}</T>
                )}
                {profiles.length > 1 && (
                  <>
                    <T variant="caption" tone="textSecondary">
                      Não é você? Trocar para:
                    </T>
                    <Chips
                      options={profiles.filter((p) => p.id !== owner.id).map((p) => ({ key: p.id, label: p.name, color: p.color }))}
                      value={null}
                      onChange={assign}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <T variant="heading">De quem é esta pesagem?</T>
                <T tone="textSecondary">{formatMetric('weightKg', saved.weightKg)}</T>
                {offered.length ? (
                  <Chips options={offered.map((p) => ({ key: p.id, label: p.name, color: p.color }))} value={null} onChange={assign} />
                ) : (
                  <T tone="textSecondary">Crie um perfil na aba Início ou Ajustes; a pesagem fica guardada sem perfil.</T>
                )}
              </>
            )}
          </Card>
        </Section>
      )}

      {isSimulated && (
        <Section title="Simulador" hint="Aparece só no navegador, onde não há Bluetooth">
          <Card>
            <Field label="Peso simulado (kg)" value={simKg} onChangeText={setSimKg} keyboardType="decimal-pad" testID="sim-weight" />
            <Button
              label="Simular pesagem"
              kind="secondary"
              testID="sim-run"
              onPress={() => {
                const kg = parseDecimal(simKg);
                if (kg) setSimulatedWeight(kg);
                setLive(null);
                setRun((n) => n + 1);
              }}
            />
          </Card>
        </Section>
      )}

      <Section title="Sem a balança por perto?" hint="Digite o peso para registrar manualmente">
        <Card>
          <Field label="Peso (kg)" placeholder="80,5" value={manualKg} onChangeText={setManualKg} keyboardType="decimal-pad" />
          <Button label="Salvar peso" kind="secondary" onPress={addManual} disabled={!parseDecimal(manualKg)} />
        </Card>
      </Section>
    </Screen>
  );
}
