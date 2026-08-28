import { describe, expect, it } from 'vitest';
import { takeProblem } from '../src/db';
import type { Take } from '../src/types';

const validTake = (): Take => ({
  id: 'take-1', title: 'Scale turn', teacherNote: 'Lighter here', folder: '', tempo: 96,
  createdAt: '2026-08-28T00:00:00.000Z', updatedAt: '2026-08-28T00:00:00.000Z',
  duration: 1, loopStart: 0, loopEnd: 1,
  notes: [{ note: 60, velocity: 96, start: 0, duration: 0.5 }]
});

describe('take backup validation', () => {
  it('accepts a complete take at the 60-second boundary', () => {
    const take = validTake();
    take.duration = 60; take.loopEnd = 60; take.notes[0] = { note: 127, velocity: 127, start: 59.5, duration: 0.5 };
    expect(takeProblem(take)).toBeNull();
  });

  it('rejects the incomplete record that poisoned the verified candidate', () => {
    expect(takeProblem({ id: 'broken', notes: [] })).toBe('the take name is missing or too long');
  });

  it.each([
    ['unsafe note number', { note: 128, velocity: 96, start: 0, duration: 0.5 }],
    ['unsafe velocity', { note: 60, velocity: 0, start: 0, duration: 0.5 }],
    ['note beyond take', { note: 60, velocity: 96, start: 0.8, duration: 0.5 }]
  ])('rejects %s', (_name, note) => {
    expect(takeProblem({ ...validTake(), notes: [note] })).not.toBeNull();
  });
});
