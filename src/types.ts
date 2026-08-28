export type NoteEvent = { note: number; velocity: number; start: number; duration: number };

export type Take = {
  id: string;
  title: string;
  teacherNote: string;
  folder: string;
  tempo: number;
  createdAt: string;
  updatedAt: string;
  duration: number;
  loopStart: number;
  loopEnd: number;
  notes: NoteEvent[];
};

export const EMPTY_TAKE = (): Take => ({
  id: crypto.randomUUID(), title: 'Untitled phrase', teacherNote: '', folder: '', tempo: 96,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), duration: 0,
  loopStart: 0, loopEnd: 4, notes: []
});
