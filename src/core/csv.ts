// Minimal RFC 4180 CSV helpers + importers for the formats we accept.

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\n') + '\n';
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cur += '"'), i++;
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') row.push(cur), (cur = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur), rows.push(row), (row = []), (cur = '');
    } else cur += c;
  }
  if (cur !== '' || row.length) row.push(cur), rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export interface ImportedReading {
  measuredAt: number;
  weightKg: number;
  impedance: number | null;
  variant: string;
  rawHex: string;
  profileName: string | null;
}

const num = (s: string | undefined) => {
  if (s === undefined || s.trim() === '') return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/**
 * Accepts our own export (data, perfil, peso_kg, impedancia_ohm, …) and the
 * CSV written by okok_ble_reader.py (timestamp, device, variant, weight_kg, …).
 */
export function importReadingsCsv(text: string): ImportedReading[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h.trim().toLowerCase()));
  const iTime = col('data', 'timestamp');
  const iWeight = col('peso_kg', 'weight_kg');
  const iImp = col('impedancia_ohm', 'impedance_ohm');
  const iVariant = col('variante', 'variant');
  const iRaw = col('payload', 'raw_payload');
  const iProfile = col('perfil');
  if (iTime < 0 || iWeight < 0) throw new Error('CSV sem colunas de data e peso');

  const out: ImportedReading[] = [];
  for (const r of rows) {
    const measuredAt = Date.parse(r[iTime]);
    const weightKg = num(r[iWeight]);
    if (!Number.isFinite(measuredAt) || weightKg === null) continue;
    out.push({
      measuredAt,
      weightKg,
      impedance: iImp >= 0 ? num(r[iImp]) : null,
      variant: (iVariant >= 0 && r[iVariant]) || 'manual',
      rawHex: (iRaw >= 0 && r[iRaw]) || '',
      profileName: (iProfile >= 0 && r[iProfile]) || null,
    });
  }
  return out;
}
