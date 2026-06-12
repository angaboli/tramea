/** Déclenche le téléchargement d'octets sous un nom de fichier donné. */
export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes.slice()], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
