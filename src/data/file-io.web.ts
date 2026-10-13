import * as DocumentPicker from 'expo-document-picker';

export async function shareText(filename: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function pickText(): Promise<{ name: string; text: string } | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'application/json', 'text/plain'] });
  if (res.canceled) return null;
  const asset = res.assets[0];
  return { name: asset.name, text: asset.file ? await asset.file.text() : await (await fetch(asset.uri)).text() };
}
