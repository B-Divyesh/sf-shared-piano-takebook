import type { NoteEvent } from './types';

type Voice = { oscillators: OscillatorNode[]; gain: GainNode };

export class PianoSynth {
  private context: AudioContext | null = null;
  private active = new Map<number, Voice>();
  private scheduled: AudioScheduledSourceNode[] = [];

  private async ctx(): Promise<AudioContext> {
    this.context ??= new AudioContext({ latencyHint: 'interactive' });
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context;
  }

  async noteOn(note: number, velocity = 92): Promise<void> {
    if (this.active.has(note)) return;
    const ctx = await this.ctx();
    const voice = this.makeVoice(ctx, note, velocity, ctx.currentTime);
    this.active.set(note, voice);
  }

  noteOff(note: number): void {
    const voice = this.active.get(note);
    if (!voice || !this.context) return;
    const now = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0.0001, now, .07);
    voice.oscillators.forEach(o => o.stop(now + .45));
    this.active.delete(note);
  }

  async schedule(notes: NoteEvent[], segmentStart: number, segmentEnd: number): Promise<void> {
    this.cancelScheduled();
    const ctx = await this.ctx();
    const now = ctx.currentTime + .035;
    for (const note of notes) {
      const noteEnd = note.start + note.duration;
      if (noteEnd <= segmentStart || note.start >= segmentEnd) continue;
      const start = Math.max(note.start, segmentStart);
      const duration = Math.min(noteEnd, segmentEnd) - start;
      const voice = this.makeVoice(ctx, note.note, note.velocity, now + start - segmentStart, Math.max(.03, duration));
      this.scheduled.push(...voice.oscillators);
    }
  }

  cancelScheduled(): void {
    for (const source of this.scheduled) { try { source.stop(); } catch { /* already stopped */ } }
    this.scheduled = [];
  }

  private makeVoice(ctx: AudioContext, note: number, velocity: number, start: number, duration?: number): Voice {
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 3600; filter.Q.value = .7;
    gain.connect(filter).connect(ctx.destination);
    const level = Math.max(.03, velocity / 127 * .18);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + .008);
    gain.gain.exponentialRampToValueAtTime(level * .42, start + .3);
    const frequency = 440 * 2 ** ((note - 69) / 12);
    const oscillators = [
      { type: 'triangle' as OscillatorType, ratio: 1, amount: 1 },
      { type: 'sine' as OscillatorType, ratio: 2, amount: .18 }
    ].map(spec => {
      const oscillator = ctx.createOscillator();
      const partial = ctx.createGain();
      oscillator.type = spec.type; oscillator.frequency.value = frequency * spec.ratio; partial.gain.value = spec.amount;
      oscillator.connect(partial).connect(gain); oscillator.start(start);
      if (duration !== undefined) {
        const release = start + duration;
        gain.gain.setTargetAtTime(.0001, release, .06);
        oscillator.stop(release + .4);
      }
      return oscillator;
    });
    return { oscillators, gain };
  }
}
