import './style.css';
import { PianoSynth } from './audio';
import { deleteTake, importTakes, listTakes, saveTake } from './db';
import { midiBytes, safeFilename, wavBytes } from './exports';
import { cachedVerdict, captureLicenseFromUrl, checkoutUrl, getToken, optimisticUnlock, setToken, verifyLicense } from './license';
import { EMPTY_TAKE, type NoteEvent, type Take } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
const synth = new PianoSynth();
const keyNotes = new Map([['a',60],['w',61],['s',62],['e',63],['d',64],['f',65],['t',66],['g',67],['y',68],['h',69],['u',70],['j',71],['k',72]]);
const noteNames = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];

let current = EMPTY_TAKE();
let takes: Take[] = [];
let isRecording = false;
let recordStarted = 0;
let recordTimer = 0;
let isPlaying = false;
let playStarted = 0;
let playTimer = 0;
let activeNotes = new Map<number, { start: number; velocity: number }>();
let heldInputs = new Set<number>();
let midiAccess: MIDIAccess | null = null;
let teacherUnlocked = optimisticUnlock();
let deferredInstall: Event | null = null;

app.innerHTML = `
  <header class="site-head shell">
    <a class="brand" href="/" aria-label="Takebook home"><span>TAKE</span><strong>BOOK</strong></a>
    <div class="head-actions"><div id="connection" class="connection"><span>Works offline</span></div><button id="install" class="button small install-button" type="button">Install app</button></div>
  </header>
  <main id="main">
    <section class="hero shell" aria-labelledby="hero-title">
      <div class="hero-copy"><p class="eyebrow">A pocket notebook for piano phrases</p><h1 id="hero-title">Keep the take. <em>Skip the DAW.</em></h1><p>Record a short phrase together, mark the bit to repeat, and leave a teacher note. Everything stays on this device until you export it.</p><div class="hero-links"><a class="button primary" href="#recorder">Start a take <span aria-hidden="true">↓</span></a><button id="midi-top" class="button ghost" type="button">Connect MIDI piano</button></div></div>
      <figure class="hero-art"><picture><source type="image/avif" srcset="/assets/takebook-kiosk-960.avif 960w, /assets/takebook-kiosk-1440.avif 1440w" sizes="(max-width:900px) 100vw, 48vw"><source type="image/webp" srcset="/assets/takebook-kiosk-960.webp 960w, /assets/takebook-kiosk-1440.webp 1440w" sizes="(max-width:900px) 100vw, 48vw"><img src="/assets/takebook-kiosk-960.webp" width="960" height="640" alt="An empty night-market piano stall with two stools and a curling roll of saved notes" fetchpriority="high" decoding="async"></picture><figcaption>Two seats. One phrase. No studio.</figcaption></figure>
    </section>
    <section id="recorder" class="desk shell" aria-labelledby="desk-title">
      <div class="section-heading"><div><p class="eyebrow">Take desk</p><h2 id="desk-title">Catch the phrase while it’s fresh.</h2></div><p>Computer keys A–K · 60 seconds maximum</p></div>
      <div class="workbench">
        <div class="panel recorder-panel">
          <div class="panel-head"><h3 class="panel-title">Piano roll</h3><output id="timer" class="timer" aria-label="Recording time">00:00.0</output></div>
          <div class="limit-meter" aria-hidden="true"><span id="limit-fill"></span></div>
          <div class="transport">
            <button id="record" class="button record" type="button"><span aria-hidden="true">●</span><span>Record</span></button>
            <button id="play" class="button" type="button"><span aria-hidden="true">▶</span><span>Play loop</span></button>
            <button id="clear" class="button ghost" type="button">Clear notes</button>
          </div>
          <div id="roll" class="roll-wrap" aria-label="Piano roll timeline"><div class="roll-grid"></div><div id="loop-region" class="loop-region"></div><div id="playhead" class="playhead" hidden></div><div id="empty-roll" class="empty-roll"><div><strong>Your first phrase lands here.</strong>Press Record, then play the keys below.</div></div><div id="notes-layer"></div></div>
          <p id="roll-summary" class="sr-only" aria-live="polite">No notes recorded.</p>
          <div class="loop-controls">
            <div class="field"><label for="loop-start">Loop starts: <output id="loop-start-out">0.0 s</output></label><input id="loop-start" type="range" min="0" max="4" value="0" step="0.1"></div>
            <div class="field"><label for="loop-end">Loop ends: <output id="loop-end-out">4.0 s</output></label><input id="loop-end" type="range" min="0.2" max="4" value="4" step="0.1"></div>
          </div>
          <p class="keys-help">Play one octave with <strong>A W S E D F T G Y H U J K</strong>. Space starts/stops recording; Enter plays/stops.</p>
          <div id="piano" class="piano" aria-label="Playable piano keyboard"></div>
          <div class="input-status"><span>Input: <strong id="input-name">Computer keyboard</strong></span><button id="midi" class="button small ghost" type="button">Connect MIDI piano</button></div>
        </div>
        <form id="take-form" class="panel" novalidate>
          <div class="panel-head"><h3 class="panel-title">Take card</h3><span id="autosave" class="autosave" role="status"></span></div>
          <div class="field"><label for="title">Take name</label><input id="title" maxlength="80" value="Untitled phrase" required autocomplete="off"></div>
          <div class="field"><label for="teacher-note">Teacher note</label><textarea id="teacher-note" maxlength="600" placeholder="Try it lighter at the turn; keep the left hand steady."></textarea><span class="note-count"><span id="note-count">0</span>/600</span></div>
          <div class="loop-controls"><div class="field"><label for="tempo">Tempo</label><input id="tempo" type="number" min="30" max="240" value="96" inputmode="numeric"><small>Beats per minute</small></div><div class="field"><label for="folder">Folder <span id="folder-tier">· Teacher pack</span></label><input id="folder" list="folder-options" maxlength="60" placeholder="Unfiled" disabled><datalist id="folder-options"><option value="Monday studio"><option value="Recital prep"><option value="Technique"></datalist></div></div>
          <div class="editor-actions"><button class="button primary" type="submit">Save take</button><button id="new-take" class="button" type="button">New take</button><button id="print-sheet" class="button ghost" type="button">Print practice sheet</button></div>
          <div class="export-actions" aria-label="Export this take"><button id="export-midi" class="button small" type="button">Export MIDI</button><button id="export-wav" class="button small" type="button">Export WAV</button><button id="export-json" class="button small ghost" type="button">Export backup</button></div>
        </form>
      </div>
    </section>
    <section class="library shell" aria-labelledby="library-title"><p class="eyebrow">On this device</p><h2 id="library-title">Saved takes</h2><div class="library-tools"><div class="field"><label for="take-filter">Show folder</label><select id="take-filter"><option value="">All takes</option></select></div><div><input id="import-file" class="sr-only" type="file" accept="application/json,.json" aria-label="Choose a Takebook backup file"><button id="import-json" class="button small ghost" type="button">Import backup</button></div></div><ul id="take-list" class="take-list"></ul></section>
    <section id="teacher-pack" class="pack shell" aria-labelledby="pack-title"><div><p class="eyebrow">For a teaching week</p><h2 id="pack-title">Teacher pack</h2><p>Keep a larger takebook tidy without changing the free recorder.</p><ul><li>Group takes into practice folders</li><li>Print a clean practice sheet with the phrase and note</li><li>One-time purchase, yours on licensed devices</li></ul><p class="price">$9 one time</p><a id="buy-link" class="button primary" href="${checkoutUrl()}">Buy Teacher pack</a></div><div class="license-box"><h3>Restore a purchase</h3><p id="license-status" class="license-status" role="status">The free recorder is ready. Add a license only for teacher tools.</p><div class="field"><label for="license-token">License token</label><input id="license-token" type="text" inputmode="text" autocomplete="off" spellcheck="false" value="${escapeAttr(getToken())}"></div><div class="editor-actions"><button id="verify-license" class="button" type="button">Verify license</button></div><p><small>Verification contacts Sociobot at most once per day. Checkout is handled by Sociobot/Dodo, the merchant of record. <a href="/terms/">Terms</a> apply.</small></p></div></section>
  </main>
  <footer class="site-foot"><div class="shell foot-inner"><div>Takebook · Local-first piano practice<br><span class="generated-note">The night-market illustration was generated for this project and reviewed by the maker.</span></div><div><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="https://github.com/B-Divyesh/sf-shared-piano-takebook">Source</a></div></div></footer>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <dialog id="confirm-dialog"><h2>Delete this take?</h2><p id="confirm-copy"></p><div class="dialog-actions"><button id="cancel-delete" class="button" type="button">Keep take</button><button id="confirm-delete" class="button danger" type="button">Delete take</button></div></dialog>
`;

function byId<T extends HTMLElement>(id: string): T { return document.getElementById(id) as T; }
const recordButton = byId<HTMLButtonElement>('record');
const playButton = byId<HTMLButtonElement>('play');
const timer = byId<HTMLOutputElement>('timer');
const titleInput = byId<HTMLInputElement>('title');
const noteInput = byId<HTMLTextAreaElement>('teacher-note');
const tempoInput = byId<HTMLInputElement>('tempo');
const folderInput = byId<HTMLInputElement>('folder');
const loopStartInput = byId<HTMLInputElement>('loop-start');
const loopEndInput = byId<HTMLInputElement>('loop-end');
const toastElement = byId('toast');

function escapeAttr(value: string): string { return value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c] ?? c)); }
function elapsed(): number { return Math.min(60, (performance.now() - recordStarted) / 1000); }
function formatTime(seconds: number): string { const mins = Math.floor(seconds / 60); return `${String(mins).padStart(2,'0')}:${(seconds % 60).toFixed(1).padStart(4,'0')}`; }
function announce(message: string): void { toastElement.textContent = message; toastElement.classList.add('show'); window.setTimeout(() => toastElement.classList.remove('show'), 2800); }

function buildPiano(): void {
  const whites = [60,62,64,65,67,69,71,72];
  const blacks = [61,63,66,68,70];
  const keyFor = (note: number) => [...keyNotes].find(([,n]) => n === note)?.[0]?.toUpperCase() ?? '';
  byId('piano').innerHTML = [...whites,...blacks].map(note => `<button class="key ${blacks.includes(note)?'black':''}" type="button" data-note="${note}" aria-label="${noteNames[note%12]}${Math.floor(note/12)-1}, key ${keyFor(note)}"><span>${keyFor(note)}</span></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('.key').forEach(key => {
    const note = Number(key.dataset.note);
    key.addEventListener('pointerdown', e => { e.preventDefault(); key.setPointerCapture(e.pointerId); void inputDown(note, 96); });
    key.addEventListener('pointerup', () => inputUp(note));
    key.addEventListener('pointercancel', () => inputUp(note));
    key.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !heldInputs.has(note)) { e.preventDefault(); void inputDown(note, 96); } });
    key.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputUp(note); } });
  });
}

async function inputDown(note: number, velocity: number): Promise<void> {
  if (heldInputs.has(note)) return;
  heldInputs.add(note); document.querySelector(`[data-note="${note}"]`)?.classList.add('pressed');
  await synth.noteOn(note, velocity);
  if (isRecording) activeNotes.set(note, { start: elapsed(), velocity });
}

function inputUp(note: number): void {
  if (!heldInputs.has(note)) return;
  heldInputs.delete(note); document.querySelector(`[data-note="${note}"]`)?.classList.remove('pressed'); synth.noteOff(note);
  const active = activeNotes.get(note);
  if (isRecording && active) addRecordedNote(note, active.velocity, active.start, elapsed());
  activeNotes.delete(note);
}

function addRecordedNote(note: number, velocity: number, start: number, end: number): void {
  current.notes.push({ note, velocity, start, duration: Math.max(.05, end - start) });
  current.duration = Math.max(current.duration, end);
  if (current.loopEnd < current.duration) current.loopEnd = Math.min(60, Math.ceil(current.duration * 10) / 10);
  renderRoll();
}

function startRecording(): void {
  stopPlayback();
  isRecording = true; recordStarted = performance.now(); current.notes = []; current.duration = 0; current.loopStart = 0; current.loopEnd = 4;
  recordButton.classList.add('active'); recordButton.innerHTML = '<span aria-hidden="true">■</span><span>Stop recording</span>';
  renderRoll(); tickRecording(); announce('Recording started. Play the phrase.');
}

function tickRecording(): void {
  if (!isRecording) return;
  const time = elapsed(); timer.value = formatTime(time); timer.textContent = formatTime(time); byId('limit-fill').style.width = `${time/60*100}%`;
  if (time >= 60) { stopRecording(); announce('Take stopped at the 60-second limit.'); return; }
  recordTimer = requestAnimationFrame(tickRecording);
}

function stopRecording(): void {
  if (!isRecording) return;
  const end = elapsed();
  for (const [note, active] of activeNotes) addRecordedNote(note, active.velocity, active.start, end);
  activeNotes.clear(); isRecording = false; cancelAnimationFrame(recordTimer); current.duration = Math.max(current.duration, end);
  recordButton.classList.remove('active'); recordButton.innerHTML = '<span aria-hidden="true">●</span><span>Record again</span>';
  timer.value = formatTime(current.duration); timer.textContent = formatTime(current.duration); renderRoll();
}

async function startPlayback(): Promise<void> {
  if (!current.notes.length) { announce('Record or open a take before playing.'); return; }
  if (isRecording) stopRecording();
  isPlaying = true; playStarted = performance.now(); playButton.innerHTML = '<span aria-hidden="true">■</span><span>Stop</span>';
  await synth.schedule(current.notes, current.loopStart, current.loopEnd); byId('playhead').hidden = false; tickPlayback();
}

function tickPlayback(): void {
  if (!isPlaying) return;
  const span = Math.max(.1, current.loopEnd - current.loopStart);
  const passed = (performance.now() - playStarted) / 1000;
  if (passed >= span) { playStarted = performance.now(); void synth.schedule(current.notes, current.loopStart, current.loopEnd); }
  const now = current.loopStart + (passed % span); const axis = timelineDuration();
  byId('playhead').style.left = `${now / axis * 100}%`; playTimer = requestAnimationFrame(tickPlayback);
}

function stopPlayback(): void {
  if (!isPlaying) return;
  isPlaying = false; cancelAnimationFrame(playTimer); synth.cancelScheduled(); byId('playhead').hidden = true;
  playButton.innerHTML = '<span aria-hidden="true">▶</span><span>Play loop</span>';
}

function timelineDuration(): number { return Math.min(60, Math.max(4, Math.ceil(current.duration), current.loopEnd)); }
function renderRoll(): void {
  const axis = timelineDuration();
  const layer = byId('notes-layer');
  layer.innerHTML = current.notes.map(note => `<span class="note-block" title="${noteNames[note.note%12]} · ${note.duration.toFixed(1)} seconds" style="left:${note.start/axis*100}%;width:${Math.max(.45,note.duration/axis*100)}%;top:${(71-note.note)/12*100}%"></span>`).join('');
  byId('empty-roll').hidden = current.notes.length > 0;
  byId('roll-summary').textContent = current.notes.length ? `${current.notes.length} recorded notes over ${current.duration.toFixed(1)} seconds. Loop from ${current.loopStart.toFixed(1)} to ${current.loopEnd.toFixed(1)} seconds.` : 'No notes recorded.';
  loopStartInput.max = String(axis); loopEndInput.max = String(axis); loopStartInput.value = String(current.loopStart); loopEndInput.value = String(current.loopEnd);
  byId('loop-start-out').textContent = `${current.loopStart.toFixed(1)} s · bar ${barAt(current.loopStart)}`;
  byId('loop-end-out').textContent = `${current.loopEnd.toFixed(1)} s · bar ${barAt(current.loopEnd)}`;
  const region = byId('loop-region'); region.style.left = `${current.loopStart/axis*100}%`; region.style.width = `${(current.loopEnd-current.loopStart)/axis*100}%`;
}

function barAt(seconds: number): string { return (seconds / (240 / current.tempo) + 1).toFixed(1); }
function syncFromForm(): void {
  current.title = titleInput.value.trim() || 'Untitled phrase'; current.teacherNote = noteInput.value.trim();
  current.tempo = Math.min(240, Math.max(30, Number(tempoInput.value) || 96)); current.folder = teacherUnlocked ? folderInput.value : '';
  byId('note-count').textContent = String(noteInput.value.length);
}

function loadIntoEditor(take: Take): void {
  stopPlayback(); if (isRecording) stopRecording(); current = structuredClone(take); titleInput.value = take.title; noteInput.value = take.teacherNote;
  tempoInput.value = String(take.tempo); folderInput.value = take.folder; timer.value = formatTime(take.duration); timer.textContent = formatTime(take.duration); byId('note-count').textContent = String(take.teacherNote.length);
  renderRoll(); renderLibrary(); byId('recorder').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); announce(`Opened ${take.title}.`);
}

async function persistCurrent(): Promise<void> {
  syncFromForm();
  if (!current.notes.length) { announce('Record at least one note before saving.'); return; }
  current.updatedAt = new Date().toISOString(); await saveTake(current); takes = await listTakes(); renderLibrary(); byId('autosave').textContent = 'Saved on this device'; announce('Take saved on this device.');
}

function renderLibrary(): void {
  const filter = byId<HTMLSelectElement>('take-filter').value;
  const shown = filter ? takes.filter(t => t.folder === filter) : takes;
  byId('take-list').innerHTML = shown.length ? shown.map(take => `<li class="take-item ${take.id===current.id?'selected':''}"><button class="take-open" type="button" data-open="${take.id}"><strong>${escapeAttr(take.title)}</strong><span class="take-meta"><span>${take.notes.length} notes</span><span>${take.duration.toFixed(1)} sec</span><span>${new Date(take.updatedAt).toLocaleDateString()}</span>${take.folder?`<span>Folder: ${escapeAttr(take.folder)}</span>`:''}</span></button><div class="take-actions"><button class="button small" type="button" data-open="${take.id}">Open</button><button class="button small danger" type="button" data-delete="${take.id}" aria-label="Delete ${escapeAttr(take.title)}">Delete</button></div></li>`).join('') : `<li class="empty-library"><strong>No saved takes${filter?' in this folder':''}.</strong><br>Record a phrase above, add a note, then save it here.</li>`;
  document.querySelectorAll<HTMLElement>('[data-open]').forEach(el => el.addEventListener('click', () => { const take = takes.find(t => t.id === el.dataset.open); if (take) loadIntoEditor(take); }));
  document.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(el => el.addEventListener('click', () => showDelete(el.dataset.delete!)));
  refreshFolderFilters();
}

function refreshFolderFilters(): void {
  const select = byId<HTMLSelectElement>('take-filter'); const selected = select.value;
  const folders = [...new Set(takes.map(t => t.folder).filter(Boolean))];
  select.innerHTML = '<option value="">All takes</option>' + folders.map(f => `<option ${f===selected?'selected':''}>${escapeAttr(f)}</option>`).join('');
  byId<HTMLDataListElement>('folder-options').innerHTML = [...new Set(['Monday studio','Recital prep','Technique',...folders])].map(f => `<option value="${escapeAttr(f)}"></option>`).join('');
}

let pendingDelete = '';
function showDelete(id: string): void {
  const take = takes.find(t => t.id === id); if (!take) return; pendingDelete = id;
  byId('confirm-copy').textContent = `“${take.title}” will be removed from this device. Export a backup first if you may need it.`;
  byId<HTMLDialogElement>('confirm-dialog').showModal(); byId<HTMLButtonElement>('cancel-delete').focus();
}

function download(data: BlobPart, type: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([data], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function updateLicenseUI(message?: string): void {
  folderInput.disabled = !teacherUnlocked; byId('folder-tier').textContent = teacherUnlocked ? '· Unlocked' : '· Teacher pack';
  const status = byId('license-status'); status.classList.toggle('unlocked', teacherUnlocked);
  status.textContent = message ?? (teacherUnlocked ? 'Teacher pack unlocked on this device.' : 'The free recorder is ready. Add a license only for teacher tools.');
}

async function connectMidi(): Promise<void> {
  if (!navigator.requestMIDIAccess) { announce('Web MIDI is not available here. The computer keys still work.'); return; }
  try {
    midiAccess = await navigator.requestMIDIAccess();
    const attach = () => { for (const input of midiAccess!.inputs.values()) input.onmidimessage = handleMidi; const names = [...midiAccess!.inputs.values()].map(i => i.name).filter(Boolean); byId('input-name').textContent = names.join(', ') || 'MIDI ready — connect a piano'; };
    attach(); midiAccess.onstatechange = attach; announce('MIDI input connected.');
  } catch { announce('MIDI permission was not granted. The computer keys still work.'); }
}

function handleMidi(event: MIDIMessageEvent): void {
  if (!event.data) return;
  const [status = 0, note = 0, velocity = 0] = event.data; const command = status & 0xf0;
  if (command === 0x90 && velocity > 0) void inputDown(note, velocity); else if (command === 0x80 || (command === 0x90 && velocity === 0)) inputUp(note);
}

function wireEvents(): void {
  recordButton.addEventListener('click', () => isRecording ? stopRecording() : startRecording());
  playButton.addEventListener('click', () => isPlaying ? stopPlayback() : void startPlayback());
  byId('clear').addEventListener('click', () => { stopPlayback(); current.notes=[]; current.duration=0; current.loopStart=0; current.loopEnd=4; timer.value='00:00.0';timer.textContent='00:00.0';renderRoll();announce('Notes cleared. The take card is unchanged.'); });
  [byId('midi'),byId('midi-top')].forEach(button => button.addEventListener('click', () => void connectMidi()));
  loopStartInput.addEventListener('input', () => { current.loopStart = Math.min(Number(loopStartInput.value), current.loopEnd - .2); renderRoll(); });
  loopEndInput.addEventListener('input', () => { current.loopEnd = Math.max(Number(loopEndInput.value), current.loopStart + .2); renderRoll(); });
  tempoInput.addEventListener('input', () => { syncFromForm(); renderRoll(); }); noteInput.addEventListener('input', syncFromForm);
  byId<HTMLFormElement>('take-form').addEventListener('submit', e => { e.preventDefault(); void persistCurrent(); });
  byId('new-take').addEventListener('click', () => { loadIntoEditor(EMPTY_TAKE()); byId('autosave').textContent=''; });
  byId('export-midi').addEventListener('click', () => { syncFromForm(); if (!current.notes.length) return announce('Record or open a take before exporting.'); const bytes=midiBytes(current); download(bytes.buffer as ArrayBuffer, 'audio/midi', `${safeFilename(current.title)}.mid`); announce('MIDI exported.'); });
  byId('export-wav').addEventListener('click', () => { syncFromForm(); if (!current.notes.length) return announce('Record or open a take before exporting.'); download(wavBytes(current), 'audio/wav', `${safeFilename(current.title)}.wav`); announce('WAV rendered on this device.'); });
  byId('export-json').addEventListener('click', () => { download(JSON.stringify(takes, null, 2), 'application/json', `takebook-backup-${new Date().toISOString().slice(0,10)}.json`); announce('Takebook backup exported.'); });
  byId('import-json').addEventListener('click', () => byId<HTMLInputElement>('import-file').click());
  byId<HTMLInputElement>('import-file').addEventListener('change', async e => { const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return; try { const count=await importTakes(JSON.parse(await file.text()));takes=await listTakes();renderLibrary();announce(`Imported ${count} ${count===1?'take':'takes'}.`); } catch(error) { announce(error instanceof Error ? error.message : 'That backup could not be imported.'); } });
  byId<HTMLSelectElement>('take-filter').addEventListener('change', renderLibrary);
  byId('print-sheet').addEventListener('click', () => { if (!teacherUnlocked) { location.hash='teacher-pack'; announce('Practice sheets are included in the Teacher pack.'); return; } syncFromForm(); window.print(); });
  byId('cancel-delete').addEventListener('click', () => byId<HTMLDialogElement>('confirm-dialog').close());
  byId('confirm-delete').addEventListener('click', async () => { await deleteTake(pendingDelete); takes=await listTakes(); if(current.id===pendingDelete){const next=EMPTY_TAKE();current=next;titleInput.value=next.title;noteInput.value='';tempoInput.value=String(next.tempo);folderInput.value='';timer.value='00:00.0';timer.textContent='00:00.0';renderRoll();} byId<HTMLDialogElement>('confirm-dialog').close(); renderLibrary(); announce('Take deleted from this device.'); });
  byId('verify-license').addEventListener('click', async () => { const token=byId<HTMLInputElement>('license-token').value.trim(); if(!token){announce('Paste your license token first.');return;} setToken(token); byId('license-status').textContent='Checking license…'; try{const verdict=await verifyLicense(true);teacherUnlocked=Boolean(verdict?.valid);updateLicenseUI(teacherUnlocked?'Teacher pack unlocked on this device.':'This license is not active. Check the token or buy a new license.');}catch{updateLicenseUI('Could not verify while offline. Your free takes are unaffected.');} });
  window.addEventListener('keydown', e => { const target=e.target as HTMLElement; const editing=target.matches('input,textarea,select'); const note=keyNotes.get(e.key.toLowerCase()); if(note!==undefined&&!e.repeat&&!editing){e.preventDefault();void inputDown(note,94);} else if(!target.matches('input,textarea,select,button,a')&&e.code==='Space'&&!e.repeat){e.preventDefault();isRecording?stopRecording():startRecording();} else if(!target.matches('input,textarea,select,button,a')&&e.key==='Enter'&&!e.repeat){e.preventDefault();isPlaying?stopPlayback():void startPlayback();} });
  window.addEventListener('keyup', e => { const note=keyNotes.get(e.key.toLowerCase()); if(note!==undefined){e.preventDefault();inputUp(note);} });
  window.addEventListener('online', updateConnection); window.addEventListener('offline', updateConnection);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall=e; byId('install').style.display='inline-flex'; });
  byId('install').addEventListener('click', async () => { if(deferredInstall && 'prompt' in deferredInstall) await (deferredInstall as Event & {prompt:()=>Promise<void>}).prompt(); });
}

function updateConnection(): void { const element=byId('connection');element.classList.toggle('offline',!navigator.onLine);element.querySelector('span')!.textContent=navigator.onLine?'Works offline':'Offline · takes available'; }

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try { const registration=await navigator.serviceWorker.register('/sw.js'); registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)announce('An update is ready. Reload to use it.');});}); } catch { /* The app remains usable without install support. */ }
}

async function init(): Promise<void> {
  buildPiano(); wireEvents(); updateConnection(); renderRoll();
  try { takes=await listTakes(); renderLibrary(); } catch { byId('take-list').innerHTML='<li class="empty-library"><strong>Local storage is unavailable.</strong><br>You can still record and export this session. Check private browsing or storage settings.</li>'; announce('Saved takes could not be opened. Exports still work.'); }
  const returned=captureLicenseFromUrl(); if(returned) byId<HTMLInputElement>('license-token').value=getToken();
  updateLicenseUI(returned?'Purchase returned. Verifying your license…':undefined);
  if(getToken()){try{const verdict=await verifyLicense();teacherUnlocked=Boolean(verdict?.valid);updateLicenseUI();}catch{const cached=cachedVerdict();teacherUnlocked=Boolean(cached?.valid);updateLicenseUI(teacherUnlocked?'Teacher pack available from the last check.':'License check needs a connection; the free recorder is ready.');}}
  void registerServiceWorker();
}

void init();
