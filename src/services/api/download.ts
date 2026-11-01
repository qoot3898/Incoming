export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Opens a PDF/image in a new tab (falls back to download when blocked). */
export function openBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) saveBlob(blob, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
