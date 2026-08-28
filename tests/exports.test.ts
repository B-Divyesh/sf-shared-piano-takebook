import { describe, expect, it } from 'vitest';
import { midiBytes, safeFilename, variableLength, wavBytes } from '../src/exports';
import type { Take } from '../src/types';

const take: Take = { id:'one',title:'Warm up #1',teacherNote:'Again',folder:'',tempo:120,createdAt:'2026-01-01',updatedAt:'2026-01-01',duration:1,loopStart:0,loopEnd:1,notes:[{note:60,velocity:100,start:0,duration:.5}] };

describe('file exports', () => {
  it('encodes MIDI variable lengths', () => { expect(variableLength(0)).toEqual([0]); expect(variableLength(128)).toEqual([0x81,0]); });
  it('builds a type 0 standard MIDI file', () => { const bytes=midiBytes(take); expect(new TextDecoder().decode(bytes.slice(0,4))).toBe('MThd'); expect(new TextDecoder().decode(bytes.slice(14,18))).toBe('MTrk'); expect(bytes.length).toBeGreaterThan(30); });
  it('renders PCM WAV locally', () => { const bytes=new Uint8Array(wavBytes(take)); expect(new TextDecoder().decode(bytes.slice(0,4))).toBe('RIFF'); expect(new TextDecoder().decode(bytes.slice(8,12))).toBe('WAVE'); expect(bytes.length).toBeGreaterThan(44000); });
  it('makes safe filenames', () => { expect(safeFilename(take.title)).toBe('warm-up-1'); expect(safeFilename('♬')).toBe('take'); });
});
