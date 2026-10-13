import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { ProfileColors } from '@/constants/theme';
import type { Sex } from '@/core/bia';
import { formatBrDate, parseBrDate, parseDecimal } from '@/core/dates';
import { deleteProfile, saveProfile } from '@/db/repo';
import type { Profile } from '@/db/schema';
import { useStore } from '@/db/store';

import { Button, Chips, Field, Row, T } from './kit';
import { Sheet } from './sheet';

export function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Confirmar', style: 'destructive', onPress: onYes },
  ]);
}

export function ProfileEditor({
  visible,
  profile,
  usedColors,
  onClose,
}: {
  visible: boolean;
  profile: Profile | null; // null = new
  usedColors: string[];
  onClose(): void;
}) {
  const { db, invalidate, setActiveProfileId } = useStore();
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [birth, setBirth] = useState('');
  const [height, setHeight] = useState('');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(profile?.name ?? '');
    setSex(profile?.sex ?? 'male');
    setBirth(profile ? formatBrDate(profile.birthDate) : '');
    setHeight(profile ? String(profile.heightCm).replace('.', ',') : '');
    setTried(false);
  }, [visible, profile]);

  const birthIso = parseBrDate(birth);
  const heightCm = parseDecimal(height);
  const errors = {
    name: name.trim() ? null : 'Informe um nome',
    birth: birthIso && birthIso < new Date().toISOString().slice(0, 10) ? null : 'Use DD/MM/AAAA',
    height: heightCm && heightCm >= 80 && heightCm <= 250 ? null : 'Altura em cm (80–250)',
  };
  const valid = !errors.name && !errors.birth && !errors.height;

  const save = async () => {
    setTried(true);
    if (!valid) return;
    const color = profile?.color ?? ProfileColors.find((c) => !usedColors.includes(c)) ?? ProfileColors[usedColors.length % ProfileColors.length];
    const id = await saveProfile(db, { id: profile?.id, name: name.trim(), sex, birthDate: birthIso!, heightCm: heightCm!, color });
    setActiveProfileId(id);
    invalidate();
    onClose();
  };

  const remove = () =>
    confirm('Apagar perfil?', `As pesagens de ${profile!.name} ficarão sem perfil e as metas serão apagadas.`, async () => {
      await deleteProfile(db, profile!.id);
      setActiveProfileId(null);
      invalidate();
      onClose();
    });

  return (
    <Sheet visible={visible} title={profile ? 'Editar perfil' : 'Novo perfil'} onClose={onClose}>
      <Field label="Nome" value={name} onChangeText={setName} error={tried ? errors.name : null} testID="profile-name" />
      <T variant="small" tone="textSecondary">
        Sexo (usado nas fórmulas de bioimpedância)
      </T>
      <Chips
        options={[
          { key: 'male' as Sex, label: 'Masculino' },
          { key: 'female' as Sex, label: 'Feminino' },
        ]}
        value={sex}
        onChange={setSex}
      />
      <Field
        label="Data de nascimento"
        placeholder="DD/MM/AAAA"
        value={birth}
        onChangeText={setBirth}
        keyboardType="numbers-and-punctuation"
        error={tried ? errors.birth : null}
        testID="profile-birth"
      />
      <Field
        label="Altura (cm)"
        placeholder="175"
        value={height}
        onChangeText={setHeight}
        keyboardType="decimal-pad"
        error={tried ? errors.height : null}
        testID="profile-height"
      />
      <Button label="Salvar" onPress={save} testID="profile-save" />
      {profile && (
        <Row style={{ justifyContent: 'center' }}>
          <Button label="Apagar perfil" kind="danger" onPress={remove} />
        </Row>
      )}
    </Sheet>
  );
}
