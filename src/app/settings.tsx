import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { readingFromAdvertisement, startScale, type Advertisement } from '@/ble/scale-source';
import { exportCsv, exportJson, importFile } from '@/data/backup';
import { pickText, shareText } from '@/data/file-io';
import { formatBrDate } from '@/core/dates';
import { useStore } from '@/db/store';
import { useActiveProfile } from '@/hooks/use-data';
import type { Profile } from '@/db/schema';
import { Button, Card, Divider, Row, Section, Screen, T } from '@/ui/kit';
import { ProfileEditor } from '@/ui/profile-editor';

export default function Settings() {
  const { db, invalidate } = useStore();
  const { profiles, active } = useActiveProfile();
  const [editing, setEditing] = useState<Profile | 'new' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [diag, setDiag] = useState(false);

  const stamp = new Date().toISOString().slice(0, 10);
  const run = async (fn: () => Promise<string | void>) => {
    try {
      const msg = await fn();
      if (msg) setMessage(msg);
    } catch (e) {
      setMessage(`Erro: ${(e as Error).message}`);
    }
  };

  return (
    <Screen title="Ajustes">
      <Section title="Perfis" right={<Button label="+ Novo" kind="plain" onPress={() => setEditing('new')} testID="profile-new" />}>
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          {profiles.length === 0 && <T tone="textSecondary" style={{ paddingVertical: 10 }}>Nenhum perfil.</T>}
          {profiles.map((p, i) => (
            <View key={p.id}>
              {i > 0 && <Divider />}
              <Pressable onPress={() => setEditing(p)} style={{ paddingVertical: 12 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} />
                    <T>{p.name}</T>
                  </Row>
                  <T variant="small" tone="textSecondary">
                    {p.heightCm} cm · {formatBrDate(p.birthDate)} ›
                  </T>
                </Row>
              </Pressable>
            </View>
          ))}
        </Card>
        <T variant="caption" tone="textMuted">
          Cada pesagem vai automaticamente para o perfil com o peso mais próximo. Se houver dúvida, o app pergunta.
        </T>
      </Section>

      <Section title="Seus dados">
        <Card>
          <T variant="small" tone="textSecondary">
            Tudo fica só neste iPhone, sem conta e sem nuvem. Faça backups de vez em quando (Arquivos/iCloud Drive).
          </T>
          <Button label="Exportar planilha (CSV)" kind="secondary" onPress={() => run(async () => shareText(`balanca-${stamp}.csv`, await exportCsv(db), 'text/csv'))} />
          <Button label="Backup completo (JSON)" kind="secondary" onPress={() => run(async () => shareText(`balanca-backup-${stamp}.json`, await exportJson(db), 'application/json'))} />
          <Button
            label="Importar CSV ou backup"
            kind="secondary"
            onPress={() =>
              run(async () => {
                const f = await pickText();
                if (!f) return;
                const msg = await importFile(db, f.text, active?.id ?? null);
                invalidate();
                return msg;
              })
            }
          />
          <T variant="caption" tone="textMuted">
            CSV: aceita o exportado aqui e o do okok_ble_reader.py (pesagens sem perfil vão para o perfil ativo). JSON: substitui todos os dados.
          </T>
          {message && <T variant="small">{message}</T>}
        </Card>
      </Section>

      <Section title="Avançado">
        <Card>
          <Button label={diag ? 'Parar diagnóstico' : 'Diagnóstico Bluetooth'} kind="secondary" onPress={() => setDiag((d) => !d)} />
          {diag && <Diagnostics />}
        </Card>
      </Section>

      <T variant="caption" tone="textMuted">
        As métricas de composição corporal usam as fórmulas de bioimpedância do app OKOK (engenharia reversa por
        100nandoo/okok-bia-formulas). São estimativas e não substituem avaliação profissional.
      </T>

      <ProfileEditor
        visible={editing !== null}
        profile={editing === 'new' ? null : editing}
        usedColors={profiles.map((p) => p.color)}
        onClose={() => setEditing(null)}
      />
    </Screen>
  );
}

/** Lists raw advertisements with manufacturer data, to identify the scale's variant. */
function Diagnostics() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [state, setState] = useState('');
  const latest = useRef(new Map<string, Advertisement>());

  useEffect(() => {
    const stop = startScale({
      onState: setState,
      onReading: () => {},
      onAdvertisement: (ad) => latest.current.set(ad.id, ad),
    });
    const timer = setInterval(() => setAds([...latest.current.values()].sort((a, b) => b.rssi - a.rssi)), 500);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, []);

  return (
    <View style={{ gap: 8 }}>
      <T variant="caption" tone="textSecondary">
        Bluetooth: {state || '…'} · {ads.length} aparelhos. Suba na balança: ela aparece no topo (sinal mais forte).
      </T>
      {ads.slice(0, 15).map((ad) => {
        const r = readingFromAdvertisement(ad);
        return (
          <View key={ad.id} style={{ gap: 2 }}>
            <T variant="small" tone={r ? 'good' : 'text'}>
              {ad.name || '(sem nome)'} · {ad.rssi} dBm{r ? ` · OKOK ${r.variant} ${r.weightKg} kg${r.stable ? ' estável' : ''}` : ''}
            </T>
            <T variant="mono" tone="textMuted" selectable>
              {ad.manufacturerData}
            </T>
          </View>
        );
      })}
    </View>
  );
}
