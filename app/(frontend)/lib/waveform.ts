/** Nombre de valeurs enregistrées pour la forme d'onde d'un mix. */
export const WAVEFORM_BARS = 500;

/** Au-delà, le décodage dans le navigateur demanderait trop de mémoire : pas de forme d'onde. */
const MAX_DECODE_BYTES = 400 * 1024 * 1024;

/** Fréquence de décodage : largement suffisante pour l'enveloppe du volume, et légère en mémoire. */
const DECODE_SAMPLE_RATE = 8000;

/**
 * Réduit une suite de volumes (RMS par bloc) à `bars` valeurs entières de 0 à 100.
 * Le RMS, plutôt que la crête, garde le relief d'une musique mixée fort : les crêtes y
 * touchent presque toujours le maximum et donneraient un bloc uniforme.
 */
export function toWaveform(peaks: ArrayLike<number>, bars = WAVEFORM_BARS): number[] {
  if (peaks.length === 0) return [];
  const out = new Array<number>(bars).fill(0);
  for (let b = 0; b < bars; b++) {
    const start = Math.floor((b * peaks.length) / bars);
    const end = Math.max(start + 1, Math.floor(((b + 1) * peaks.length) / bars));
    let max = 0;
    for (let i = start; i < end && i < peaks.length; i++) max = Math.max(max, peaks[i]);
    out[b] = max;
  }
  const top = Math.max(...out) || 1;
  return out.map((v) => Math.round((v / top) * 100));
}

/**
 * Forme d'onde d'un fichier audio, calculée dans le navigateur au moment de l'envoi.
 * Retourne null si le fichier est trop lourd ou si le navigateur ne sait pas le décoder :
 * le mix fonctionne alors normalement, sans forme d'onde.
 */
export async function computeWaveform(file: File): Promise<number[] | null> {
  if (file.size > MAX_DECODE_BYTES || typeof OfflineAudioContext === "undefined") return null;
  try {
    const ctx = new OfflineAudioContext(1, 1, DECODE_SAMPLE_RATE);
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    const samples = buffer.getChannelData(0);
    // Volume (RMS) par bloc de 0,1 s, puis réduction aux 500 barres
    const block = Math.max(1, Math.floor(buffer.sampleRate / 10));
    const levels = new Float32Array(Math.ceil(samples.length / block));
    for (let j = 0; j < levels.length; j++) {
      const end = Math.min(samples.length, (j + 1) * block);
      let sum = 0;
      for (let i = j * block; i < end; i++) sum += samples[i] * samples[i];
      levels[j] = Math.sqrt(sum / (end - j * block));
    }
    return toWaveform(levels);
  } catch {
    return null;
  }
}

/** Regroupe les 500 valeurs en `count` barres pour l'affichage (maximum de chaque groupe). */
export function resampleWaveform(values: number[], count: number): number[] {
  if (values.length <= count) return values;
  return Array.from({ length: count }, (_, b) => {
    const start = Math.floor((b * values.length) / count);
    const end = Math.floor(((b + 1) * values.length) / count);
    let max = 0;
    for (let i = start; i < end; i++) max = Math.max(max, values[i]);
    return max;
  });
}
