import { useState } from 'react';

import { endOfLocalDay, parseBrDate, parseDecimal } from '@/core/dates';
import { deleteGoal, insertGoal } from '@/db/repo';
import { useStore } from '@/db/store';
import { useActiveProfile, useGoals, useProfileReadings } from '@/hooks/use-data';
import { GoalCard } from '@/ui/goal-card';
import { Button, Card, Field, Row, Section, Screen, T } from '@/ui/kit';
import { confirm } from '@/ui/profile-editor';
import { ProfileSwitcher } from '@/ui/profile-switcher';
import { Sheet } from '@/ui/sheet';

export default function Goals() {
  const { db, invalidate } = useStore();
  const { profiles, active, setActive } = useActiveProfile();
  const readings = useProfileReadings(active);
  const goals = useGoals(active);
  const [adding, setAdding] = useState(false);
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [startKgText, setStartKgText] = useState('');
  const [tried, setTried] = useState(false);
  const now = Date.now();

  const weights = readings.map((r) => ({ t: r.measuredAt, v: r.weightKg }));
  const lastKg = weights.length ? weights[weights.length - 1].v : null;
  const activeGoals = goals.filter((g) => g.completedAt === null);
  const doneGoals = goals.filter((g) => g.completedAt !== null);

  const targetKg = parseDecimal(target);
  const deadlineIso = parseBrDate(deadline);
  const startKg = lastKg ?? parseDecimal(startKgText);
  const errors = {
    target: targetKg && targetKg > 2 && targetKg < 300 ? (startKg !== null && Math.abs(targetKg - startKg) < 0.1 ? 'Igual ao peso atual' : null) : 'Peso em kg',
    deadline: deadlineIso && endOfLocalDay(deadlineIso) > now ? null : 'Data futura DD/MM/AAAA',
    start: startKg ? null : 'Informe o peso inicial',
  };

  const save = async () => {
    setTried(true);
    if (!active || errors.target || errors.deadline || errors.start) return;
    await insertGoal(db, { profileId: active.id, targetKg: targetKg!, deadline: endOfLocalDay(deadlineIso!), startDate: now, startKg: startKg! });
    invalidate();
    setAdding(false);
    setTarget('');
    setDeadline('');
    setTried(false);
  };

  const remove = (id: number) =>
    confirm('Apagar meta?', 'O histórico de pesagens não é afetado.', async () => {
      await deleteGoal(db, id);
      invalidate();
    });

  if (!active) {
    return (
      <Screen title="Metas">
        <T tone="textSecondary">Crie um perfil na aba Início para definir metas.</T>
      </Screen>
    );
  }

  return (
    <Screen title="Metas" right={<Button label="+ Nova" kind="plain" onPress={() => setAdding(true)} testID="goal-new" />}>
      <ProfileSwitcher profiles={profiles} active={active} onChange={setActive} />

      {activeGoals.length === 0 && (
        <Card>
          <T variant="heading">Nenhuma meta ativa</T>
          <T tone="textSecondary">
            Você pode ter várias metas ao mesmo tempo, por exemplo 90 kg até março e 85 kg até junho. Cada uma mostra o ritmo
            necessário e a previsão de chegada.
          </T>
          <Button label="Criar meta" onPress={() => setAdding(true)} />
        </Card>
      )}

      {activeGoals.map((g) => (
        <GoalCard
          key={g.id}
          goal={g}
          weights={weights}
          now={now}
          footer={
            <Row style={{ justifyContent: 'flex-end' }}>
              <Button label="Apagar" kind="plain" onPress={() => remove(g.id)} />
            </Row>
          }
        />
      ))}

      {doneGoals.length > 0 && (
        <Section title="Concluídas">
          {doneGoals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              weights={weights}
              now={now}
              footer={
                <Row style={{ justifyContent: 'flex-end' }}>
                  <Button label="Apagar" kind="plain" onPress={() => remove(g.id)} />
                </Row>
              }
            />
          ))}
        </Section>
      )}

      <Sheet visible={adding} title="Nova meta" onClose={() => setAdding(false)}>
        <T tone="textSecondary">
          {lastKg !== null ? `Peso atual: ${lastKg.toFixed(1).replace('.', ',')} kg` : 'Sem pesagens ainda: informe o peso inicial.'}
        </T>
        {lastKg === null && (
          <Field label="Peso inicial (kg)" value={startKgText} onChangeText={setStartKgText} keyboardType="decimal-pad" error={tried ? errors.start : null} />
        )}
        <Field label="Peso-alvo (kg)" placeholder="85" value={target} onChangeText={setTarget} keyboardType="decimal-pad" error={tried ? errors.target : null} testID="goal-target" />
        <Field
          label="Até a data"
          placeholder="DD/MM/AAAA"
          value={deadline}
          onChangeText={setDeadline}
          keyboardType="numbers-and-punctuation"
          error={tried ? errors.deadline : null}
          testID="goal-deadline"
        />
        {!errors.target && !errors.deadline && startKg !== null && (
          <T tone="textSecondary">
            Ritmo necessário:{' '}
            {(((targetKg! - startKg) / Math.max(1, (endOfLocalDay(deadlineIso!) - now) / 86_400_000)) * 7).toFixed(2).replace('.', ',')} kg/semana
          </T>
        )}
        <Button label="Salvar meta" onPress={save} testID="goal-save" />
      </Sheet>
    </Screen>
  );
}
