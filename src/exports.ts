import type { NoteEvent, Take } from './types';

const u16 = (n: number) => [(n >> 8) & 255, n & 255];
const u32 = (n: number) => [(n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];

export function variableLength(value: number): number[] {
  let buffer = value & 0x7f;
  const out: number[] = [];
  while ((value >>= 7)) { buffer <<= 8; buffer |= (value & 0x7f) | 0x80; }
  while (true) { out.push(buffer & 0xff); if (buffer & 0x80) buffer >>= 8; else break; }
  return out;
}

export function midiBytes(take: Take): Uint8Array {
  const ppq = 480;
  const tempo = Math.round(60_000_000 / take.tempo);
  const events: { tick: number; data: number[]; off: boolean }[] = [];
  take.notes.forEach(n => {
    const start = Math.max(0, Math.round(n.start * take.tempo / 60 * ppq));
    const end = Math.max(start + 1, Math.round((n.start + n.duration) * take.tempo / 60 * ppq));
    events.push({ tick: start, data: [0x90, n.note, n.velocity], off: false });
    events.push({ tick: end, data: [0x80, n.note, 0], off: true });
  });
  events.sort((a, b) => a.tick - b.tick || Number(b.off) - Number(a.off));
  const track: number[] = [0, 0xff, 0x51, 3, ...u32(tempo).slice(1)];
  let last = 0;
  events.forEach(e => { track.push(...variableLength(e.tick - last), ...e.data); last = e.tick; });
  track.push(0, 0xff, 0x2f, 0);
  return new Uint8Array([
    0x4d,0x54,0x68,0x64,...u32(6),...u16(0),...u16(1),...u16(ppq),
    0x4d,0x54,0x72,0x6b,...u32(track.length),...track
  ]);
}

function writeString(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

export function wavBytes(take: Take, sampleRate = 44100): ArrayBuffer {
  const tail = 0.35;
  const lengthSeconds = Math.max(0.5, take.duration + tail);
  const sampleCount = Math.ceil(lengthSeconds * sampleRate);
  const samples = new Float32Array(sampleCount);
  for (const note of take.notes) synthNote(samples, sampleRate, note);
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = peak > .95 ? .95 / peak : 1;
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + sampleCount * 2, true); writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeString(view, 36, 'data'); view.setUint32(40, sampleCount * 2, true);
  samples.forEach((sample, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample * gain)) * 0x7fff, true));
  return buffer;
}

function synthNote(samples: Float32Array, sampleRate: number, event: NoteEvent) {
  const start = Math.floor(event.start * sampleRate);
  const end = Math.min(samples.length, Math.ceil((event.start + event.duration + .28) * sampleRate));
  const frequency = 440 * 2 ** ((event.note - 69) / 12);
  const level = (event.velocity / 127) * .22;
  for (let i = start; i < end; i++) {
    const t = (i - start) / sampleRate;
    const released = Math.max(0, t - event.duration);
    const attack = Math.min(1, t / .008);
    const decay = Math.exp(-2.4 * t) * Math.exp(-12 * released);
    const tone = Math.sin(2 * Math.PI * frequency * t) + .32 * Math.sin(4 * Math.PI * frequency * t) + .11 * Math.sin(6 * Math.PI * frequency * t);
    samples[i] = (samples[i] ?? 0) + tone * level * attack * decay;
  }
}

export function safeFilename(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'take';
}
