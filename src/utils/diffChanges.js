// src/utils/diffChanges.js
// Utilidad simple para calcular diferencias (diff) (solo campos listados)
export function pickDiff(prev = {}, next = {}, keys = []) {
  const diff = {};
  for (const k of keys) {
    const a = prev?.[k];
    const b = next?.[k];
    const changed =
      Array.isArray(a) || Array.isArray(b)
        ? JSON.stringify(a) !== JSON.stringify(b)
        : a !== b;
    if (changed) diff[k] = { from: a, to: b };
  }
  return diff;
}
