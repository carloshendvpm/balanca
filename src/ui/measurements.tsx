import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { parseDecimal, shortDate } from '@/core/dates';
import { navyBodyFat, waistToHeight } from '@/core/navy';
import { deleteMeasurement, insertMeasurement } from '@/db/repo';
import type { Measurement, Profile } from '@/db/schema';
import { useStore } from '@/db/store';
import { useTheme } from '@/hooks/use-theme';

import { Button, Card, Divider, Field, Row, Section, T } from './kit';
import { confirm } from './profile-editor';
import { Sheet } from './sheet';

const pct = (v: number) => `${v.toFixed(1).replace('.', ',')}%`;
const cm = (v: number) => `${v.toFixed(1).replace('.', ',')} cm`;

export function navyFor(p: Profile, m: Measurement) {
  return navyBodyFat(p.sex, p.heightCm, m);
}

function whtBand(r: number) {
  if (r < 0.5) return { label: 'Saudável', tone: 'good' as const };
  if (r < 0.6) return { label: 'Atenção', tone: 'warn' as const };
  return { label: 'Alto', tone: 'bad' as const };
}

/** Body fat from tape measurements, for scales that do not send impedance. */
export function MeasurementsSection({ profile, measurements, hasBia }: { profile: Profile; measurements: Measurement[]; hasBia: boolean }) {
  const c = useTheme();
  const [adding, setAdding] = useState(false);
  const remove = useDeleteMeasurement();
  const last = measurements[measurements.length - 1];
  const prev = measurements[measurements.length - 2];
  const bf = last ? navyFor(profile, last) : null;
  const bfPrev = prev ? navyFor(profile, prev) : null;
  const wht = last ? waistToHeight(last.waistCm, profile.heightCm) : null;

  return (
    <Section
      title="Medidas"
      hint="Gordura corporal pela fita métrica (método da Marinha dos EUA)"
      right={last ? <Button label="Medir de novo" kind="plain" onPress={() => setAdding(true)} testID="measure-new" /> : undefined}>
      {last ? (
        <Card>
          <Row style={{ alignItems: 'flex-end', gap: 28, flexWrap: 'wrap' }}>
            <View>
              <T variant="caption" tone="textSecondary">
                Gordura
              </T>
              <T variant="title" testID="navy-bf">
                {bf === null ? '—' : pct(bf)}
              </T>
              {bf !== null && bfPrev !== null && (
                <T variant="caption" tone={bf < bfPrev ? 'good' : bf > bfPrev ? 'bad' : 'textSecondary'}>
                  {bf - bfPrev > 0 ? '+' : ''}
                  {(bf - bfPrev).toFixed(1).replace('.', ',')} desde {shortDate(prev.measuredAt)}
                </T>
              )}
            </View>
            <View>
              <T variant="caption" tone="textSecondary">
                Cintura
              </T>
              <T variant="number">{cm(last.waistCm)}</T>
              {wht !== null && (
                <T variant="caption" tone={whtBand(wht).tone}>
                  {whtBand(wht).label}: {wht.toFixed(2).replace('.', ',')} da altura
                </T>
              )}
            </View>
          </Row>
          <T variant="caption" tone="textMuted">
            Medido em {shortDate(last.measuredAt)}. Meça a cada 2–4 semanas, sempre no mesmo horário.
          </T>
          {measurements.length > 1 && (
            <View style={{ gap: 0 }}>
              <Divider />
              {[...measurements].reverse().slice(0, 4).map((m) => (
                <Pressable key={m.id} onLongPress={() => remove(m.id)} accessibilityHint="Toque e segure para apagar">
                <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
                  <T variant="small" tone="textSecondary">
                    {shortDate(m.measuredAt)}
                  </T>
                  <T variant="small">
                    {cm(m.waistCm)} de cintura, {(() => {
                      const v = navyFor(profile, m);
                      return v === null ? '—' : pct(v);
                    })()}
                  </T>
                </Row>
                </Pressable>
              ))}
            </View>
          )}
        </Card>
      ) : (
        <Card style={{ backgroundColor: c.accentSoft }}>
          <T>
            {hasBia ? '' : 'Sua balança não envia bioimpedância. '}Com pescoço e cintura{profile.sex === 'female' ? ' e quadril' : ''} medidos com fita, o app
            estima sua gordura corporal{hasBia ? ', em geral com mais precisão que a balança' : ''}.
          </T>
          <Button label="Registrar medidas" onPress={() => setAdding(true)} testID="measure-new" />
        </Card>
      )}
      <MeasurementSheet visible={adding} profile={profile} last={last ?? null} onClose={() => setAdding(false)} />
    </Section>
  );
}

function MeasurementSheet({ visible, profile, last, onClose }: { visible: boolean; profile: Profile; last: Measurement | null; onClose(): void }) {
  const { db, invalidate } = useStore();
  const [neck, setNeck] = useState('');
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const [tried, setTried] = useState(false);
  const female = profile.sex === 'female';

  useEffect(() => {
    if (!visible) return;
    setNeck(last ? String(last.neckCm).replace('.', ',') : '');
    setWaist('');
    setHip(last?.hipCm ? String(last.hipCm).replace('.', ',') : '');
    setTried(false);
  }, [visible, last]);

  const n = parseDecimal(neck);
  const w = parseDecimal(waist);
  const h = parseDecimal(hip);
  const inRange = (v: number | null, lo: number, hi: number) => v !== null && v >= lo && v <= hi;
  const errors = {
    neck: inRange(n, 20, 70) ? null : 'Entre 20 e 70 cm',
    waist: inRange(w, 40, 200) ? null : 'Entre 40 e 200 cm',
    hip: !female || inRange(h, 50, 200) ? null : 'Entre 50 e 200 cm',
  };
  const tape = { neckCm: n ?? 0, waistCm: w ?? 0, hipCm: female ? h : null };
  const preview = !errors.neck && !errors.waist && !errors.hip ? navyBodyFat(profile.sex, profile.heightCm, tape) : null;

  const save = async () => {
    setTried(true);
    if (errors.neck || errors.waist || errors.hip) return;
    await insertMeasurement(db, { profileId: profile.id, measuredAt: Date.now(), ...tape });
    invalidate();
    onClose();
  };

  return (
    <Sheet visible={visible} title="Registrar medidas" onClose={onClose}>
      <T tone="textSecondary">
        Fita justa, sem apertar, de pé e relaxado. Meça duas vezes e use a média.
      </T>
      <Field
        label="Pescoço: logo abaixo do pomo de adão"
        value={neck}
        onChangeText={setNeck}
        keyboardType="decimal-pad"
        placeholder="38"
        error={tried ? errors.neck : null}
        testID="m-neck"
      />
      <Field
        label={female ? 'Cintura: na parte mais fina' : 'Cintura: na altura do umbigo'}
        value={waist}
        onChangeText={setWaist}
        keyboardType="decimal-pad"
        placeholder="90"
        error={tried ? errors.waist : null}
        testID="m-waist"
      />
      {female && (
        <Field
          label="Quadril: na parte mais larga"
          value={hip}
          onChangeText={setHip}
          keyboardType="decimal-pad"
          placeholder="100"
          error={tried ? errors.hip : null}
        />
      )}
      {preview !== null && <T variant="heading">Gordura estimada: {pct(preview)}</T>}
      <Button label="Salvar medidas" onPress={save} testID="m-save" />
    </Sheet>
  );
}

export function useDeleteMeasurement() {
  const { db, invalidate } = useStore();
  return (id: number) =>
    confirm('Apagar medida?', 'Esta ação não pode ser desfeita.', async () => {
      await deleteMeasurement(db, id);
      invalidate();
    });
}
