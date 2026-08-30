import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  (page as typeof page & { __consoleErrors?: string[] }).__consoleErrors = errors;
});

test.afterEach(async ({ page }, testInfo) => {
  const errors = (page as typeof page & { __consoleErrors?: string[] }).__consoleErrors ?? [];
  const unexpected = testInfo.title.includes('429 Retry-After') ? errors.filter(error => !/status of 429/.test(error)) : errors;
  expect(unexpected).toEqual([]);
});

test('@claim:local-persistence records, annotates, saves and reopens a take with the keyboard', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.getByRole('button',{name:/^Record(?: again)?$/}).click();
  await page.keyboard.down('a'); await page.waitForTimeout(100); await page.keyboard.up('a');
  await page.keyboard.down('d'); await page.waitForTimeout(100); await page.keyboard.up('d');
  await page.getByRole('button',{name:/Stop recording/}).click();
  await page.getByLabel('Take name').fill('Friday duet');
  await page.getByLabel('Teacher note').fill('Keep the second note light.');
  await page.getByRole('button',{name:'Save take'}).click();
  await expect(page.locator('.take-open strong').filter({hasText:'Friday duet'})).toBeVisible();
  await page.reload();
  await expect(page.locator('.take-open strong').filter({hasText:'Friday duet'})).toBeVisible();
  await page.getByRole('button',{name:'Open',exact:true}).first().click();
  await expect(page.getByLabel('Teacher note')).toHaveValue('Keep the second note light.');
});

test('@claim:demo-sandbox opens three samples in separate storage and discards them on exit', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve,reject) => {
      const request=indexedDB.open('takebook',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('takes',{keyPath:'id'});
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    const transaction=db.transaction('takes','readwrite');
    transaction.objectStore('takes').put({
      id:'real-private',title:'Private real take',teacherNote:'Not demo data',folder:'',tempo:96,
      createdAt:'2026-08-30T00:00:00.000Z',updatedAt:'2026-08-30T00:00:00.000Z',duration:1,loopStart:0,loopEnd:1,
      notes:[{note:60,velocity:96,start:0,duration:.5}]
    });
    await new Promise<void>((resolve,reject)=>{transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);});
    db.close();
  });
  await page.getByRole('link',{name:'Try it with sample data'}).click();
  await expect(page).toHaveURL('/?demo=1');
  await expect(page).toHaveTitle('Demo — Takebook');
  await expect(page.getByText('Demo — sample data, nothing is saved to your takebook')).toBeVisible();
  await expect(page.locator('.take-item')).toHaveCount(3);
  await expect(page.locator('#empty-roll')).toBeHidden();
  await expect(page.getByText('Private real take')).toHaveCount(0);
  expect(await page.evaluate(async () => (await indexedDB.databases()).map(database => database.name))).toEqual(expect.arrayContaining(['takebook','demo:takebook']));

  await page.getByLabel('Take name').fill('Changed demo title');
  await page.getByRole('button',{name:'Save take'}).click();
  await expect(page.getByText('Changed demo title')).toBeVisible();
  await page.getByRole('button',{name:'Reset demo'}).click();
  await expect(page.locator('.take-open strong').filter({hasText:'Lighten the turn'})).toBeVisible();
  await expect(page.getByText('Changed demo title')).toHaveCount(0);

  await page.getByRole('button',{name:'Start for real'}).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('Private real take')).toBeVisible();
  expect(await page.evaluate(async () => {
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('demo:takebook',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const count=await new Promise<number>((resolve,reject)=>{const request=db.transaction('takes').objectStore('takes').count();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    db.close();return count;
  })).toBe(0);
});

test('@claim:keyboard-fallback records with computer keys when MIDI permission fails', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))});
  });
  await page.goto('/?demo=1');
  await page.getByRole('button',{name:'Connect MIDI piano'}).first().click();
  await expect(page.getByRole('status').filter({hasText:'MIDI permission was not granted. The computer keys still work.'})).toBeVisible();
  await page.getByRole('button',{name:'Record'}).click();
  await page.keyboard.down('a'); await page.waitForTimeout(100); await page.keyboard.up('a');
  await page.getByRole('button',{name:/Stop recording/}).click();
  await expect(page.locator('.note-block')).toHaveCount(1);
});

test('asks before clearing an unsaved recorded phrase and preserves it when cancelled', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Record'}).click();
  await page.keyboard.down('a'); await page.waitForTimeout(100); await page.keyboard.up('a');
  await page.getByRole('button',{name:/Stop recording/}).click();
  await expect(page.locator('.note-block')).toHaveCount(1);
  await page.getByRole('button',{name:'Clear notes'}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading',{name:'Clear recorded notes?'})).toBeVisible();
  await expect(dialog).toContainText('Clear 1 recorded note from this unsaved phrase?');
  await expect(page.locator('.note-block')).toHaveCount(1);
  await expect(page.locator('#cancel-confirm')).toBeFocused();
  await page.getByRole('button',{name:'Keep notes'}).press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.locator('.note-block')).toHaveCount(1);
  await page.getByRole('button',{name:'Clear notes'}).click();
  await page.getByRole('button',{name:'Clear notes'}).last().click();
  await expect(page.locator('.note-block')).toHaveCount(0);
  await expect(page.getByRole('status').filter({hasText:'Recorded notes cleared. The take card is unchanged.'})).toBeVisible();
});

test('asks before New take or Record again discards an unsaved phrase', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Record'}).click();
  await page.keyboard.down('a'); await page.waitForTimeout(100); await page.keyboard.up('a');
  await page.getByRole('button',{name:/Stop recording/}).click();
  await page.getByLabel('Take name').fill('Unsaved lesson phrase');

  await page.getByRole('button',{name:'New take'}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading',{name:'Start a new take?'})).toBeVisible();
  await expect(dialog).toContainText('1 recorded note');
  await expect(page.locator('#cancel-confirm')).toBeFocused();
  await page.getByRole('button',{name:'Keep this phrase'}).click();
  await expect(page.locator('.note-block')).toHaveCount(1);
  await expect(page.getByLabel('Take name')).toHaveValue('Unsaved lesson phrase');

  await page.getByRole('button',{name:'Record again'}).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading',{name:'Record this phrase again?'})).toBeVisible();
  await expect(dialog).toContainText('1 recorded note');
  await page.getByRole('button',{name:'Keep this phrase'}).click();
  await expect(page.locator('.note-block')).toHaveCount(1);

  await page.getByRole('button',{name:'Record again'}).click();
  await page.getByRole('button',{name:'Discard and record'}).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.note-block')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Stop recording'})).toBeVisible();
});

test('visibly clamps tempo 0 before saving and persists the shown value', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Record'}).click();
  await page.keyboard.down('a'); await page.waitForTimeout(100); await page.keyboard.up('a');
  await page.getByRole('button',{name:/Stop recording/}).click();
  await page.getByLabel('Tempo').fill('0');
  await page.getByRole('button',{name:'Save take'}).click();
  await expect(page.getByLabel('Tempo')).toHaveValue('30');
  await expect(page.locator('#tempo-help')).toContainText('Changed to 30 BPM');
  await page.reload();
  await page.getByRole('button',{name:'Open',exact:true}).click();
  await expect(page.getByLabel('Tempo')).toHaveValue('30');
});

test('@claim:offline-reload installed shell works offline after a first visit', async ({ page, context }) => {
  await page.goto('/?demo=1');
  await page.waitForFunction(() => navigator.serviceWorker?.ready);
  await page.reload();
  expect(await page.evaluate(async()=>await caches.keys())).toContain('takebook-v4');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading',{name:'Record a piano phrase together'})).toBeVisible();
  await expect(page.locator('.take-open strong').filter({hasText:'Lighten the turn'})).toBeVisible();
  await expect(page.getByText(/Offline · takes available/)).toBeVisible();
  await page.goto('/privacy/');
  await expect(page.getByRole('heading',{name:'Your practice stays yours.'})).toBeVisible();
});

test('@claim:60-second-limit stops a recording at 60 seconds', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?demo=1');
  await page.getByRole('button',{name:'Record'}).click();
  await page.clock.runFor(60_100);
  await expect(page.locator('#timer')).toHaveText('01:00.0');
  await expect(page.getByRole('status').filter({hasText:'Take stopped at the 60-second limit.'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Record again'})).toBeVisible();
});

test('@claim:local-exports @claim:json-import downloads valid exports and imports a backup in the demo', async ({ page }) => {
  await page.goto('/?demo=1');
  const midiDownload = page.waitForEvent('download');
  await page.getByRole('button',{name:'Export MIDI'}).click();
  const midiPath = await (await midiDownload).path();
  expect(midiPath).not.toBeNull();
  expect((await readFile(midiPath!)).subarray(0,4).toString()).toBe('MThd');

  const wavDownload = page.waitForEvent('download');
  await page.getByRole('button',{name:'Export WAV'}).click();
  const wavPath = await (await wavDownload).path();
  expect(wavPath).not.toBeNull();
  const wav = await readFile(wavPath!);
  expect(wav.subarray(0,4).toString()).toBe('RIFF');
  expect(wav.subarray(8,12).toString()).toBe('WAVE');

  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button',{name:'Export backup'}).click();
  const jsonPath = await (await jsonDownload).path();
  expect(jsonPath).not.toBeNull();
  expect(JSON.parse(await readFile(jsonPath!,'utf8'))).toHaveLength(3);

  const imported = {
    id:'demo-imported',title:'Imported scale turn',teacherNote:'Use equal weight.',folder:'Technique',tempo:92,
    createdAt:'2026-08-30T00:00:00.000Z',updatedAt:'2026-08-30T00:00:00.000Z',duration:1.2,loopStart:0,loopEnd:1.2,
    notes:[{note:60,velocity:80,start:0,duration:.3},{note:62,velocity:82,start:.5,duration:.3}]
  };
  await page.getByLabel('Choose a Takebook backup file').setInputFiles({name:'import.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([imported]))});
  await expect(page.getByRole('status').filter({hasText:'Imported 1 take.'})).toBeVisible();
  await expect(page.locator('.take-open strong').filter({hasText:'Imported scale turn'})).toBeVisible();
});

test('announces an installed service-worker update', async ({ page }) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL),'Synthetic worker-byte update is a local artifact test.');
  const workerPath=resolve('dist/sw.js');
  const original=await readFile(workerPath,'utf8');
  try {
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker?.ready);
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
    await writeFile(workerPath,`${original}\n// update regression ${Date.now()}\n`);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await expect(page.getByRole('status').filter({hasText:'An update is ready. Reload to use it.'})).toBeVisible({timeout:10_000});
  } finally { await writeFile(workerPath,original); }
});

test('legal pages have semantic essentials', async ({ page }) => {
  for (const path of ['/privacy/','/terms/','/404.html']) { await page.goto(path); await expect(page.locator('html')).toHaveAttribute('lang','en'); await expect(page.locator('main')).toHaveCount(1); await expect(page.locator('h1')).toHaveCount(1); }
});

test('has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  for(const path of ['/','/?demo=1','/privacy/','/terms/','/404.html']){
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(violation => ['serious','critical'].includes(violation.impact ?? ''))).toEqual([]);
  }
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const mobile = await new AxeBuilder({ page }).analyze();
  expect(mobile.violations.filter(violation => ['serious','critical'].includes(violation.impact ?? ''))).toEqual([]);
  const reducedDuration=await page.locator('.button').first().evaluate(element=>parseFloat(getComputedStyle(element).transitionDuration));
  expect(reducedDuration).toBeLessThanOrEqual(.001);
});

test('rejects an incomplete backup atomically and keeps the library usable', async ({ page }) => {
  await page.goto('/');
  const complete = {
    id:'would-have-imported', title:'Valid first row', teacherNote:'', folder:'', tempo:96,
    createdAt:'2026-08-28T00:00:00.000Z', updatedAt:'2026-08-28T00:00:00.000Z',
    duration:1, loopStart:0, loopEnd:1, notes:[{note:60,velocity:96,start:0,duration:.5}]
  };
  await page.getByLabel('Choose a Takebook backup file').setInputFiles({
    name:'broken.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify([complete,{id:'broken',notes:[]}]))
  });
  await expect(page.getByRole('status').filter({hasText:/Take 2 is not valid.*Nothing was imported/})).toBeVisible();
  await expect(page.getByText('Valid first row')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(/Local storage is unavailable/)).toHaveCount(0);
  await expect(page.getByText('No saved takes.')).toBeVisible();
});

test('isolates and removes a legacy damaged row without hiding valid takes', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve,reject) => {
      const request=indexedDB.open('takebook',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    const transaction=db.transaction('takes','readwrite');
    transaction.objectStore('takes').put({
      id:'healthy',title:'Healthy take',teacherNote:'Still available',folder:'',tempo:96,
      createdAt:'2026-08-28T00:00:00.000Z',updatedAt:'2026-08-28T00:00:00.000Z',duration:1,loopStart:0,loopEnd:1,
      notes:[{note:60,velocity:96,start:0,duration:.5}]
    });
    transaction.objectStore('takes').put({id:'broken',notes:[]});
    await new Promise<void>((resolve,reject)=>{transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);});
    db.close();
  });
  await page.reload();
  await expect(page.getByText('Healthy take')).toBeVisible();
  await expect(page.getByText('Damaged saved entry',{exact:true})).toBeVisible();
  await expect(page.getByText(/Local storage is unavailable/)).toHaveCount(0);
  await page.getByRole('button',{name:'Remove damaged entry'}).click();
  await expect(page.getByText(/Remove only this entry/)).toBeVisible();
  await page.getByRole('button',{name:'Delete take'}).click();
  await expect(page.getByText('Damaged saved entry',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Healthy take')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Healthy take')).toBeVisible();
});

test('@claim:mobile-layout 390px piano targets meet the touch size and spacing contract', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const boxes = await page.locator('.key').evaluateAll(keys => keys.map(key => {
    const box=key.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height};
  }));
  expect(boxes).toHaveLength(13);
  for(const box of boxes){expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);}
  for(let first=0;first<boxes.length;first++)for(let second=first+1;second<boxes.length;second++){
    const firstBox=boxes[first]!;const secondBox=boxes[second]!;
    const horizontal=Math.max(0,Math.max(firstBox.left,secondBox.left)-Math.min(firstBox.right,secondBox.right));
    const vertical=Math.max(0,Math.max(firstBox.top,secondBox.top)-Math.min(firstBox.bottom,secondBox.bottom));
    expect(Math.max(horizontal,vertical)).toBeGreaterThanOrEqual(7.9);
  }
  await expect(page.locator('#install')).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test('390px connection status keeps its online and offline text visible', async ({ page, context }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const status=page.locator('#connection');
  await expect(status).toContainText('Works offline');
  await expect(status.locator('span')).toBeVisible();
  expect(await status.locator('span').evaluate(element => getComputedStyle(element).display)).not.toBe('none');
  await context.setOffline(true);
  await page.waitForFunction(() => document.querySelector('#connection span')?.textContent === 'Offline · takes available');
  await expect(status).toContainText('Offline · takes available');
  await expect(status.locator('span')).toBeVisible();
  const overflow=await page.evaluate(() => document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test('automatic invalid-license reconciliation names the inactive license', async ({ page }) => {
  let verifies=0;
  await page.route('https://api.sociobot.in/api/v1/products/shared-piano-takebook/verify?license=invalid-token', async route => {
    verifies++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({valid:false,reason:'invalid',expires_at:null})});
  });
  await page.goto('/?license=invalid-token');
  await expect(page).toHaveURL('/');
  await expect(page.locator('#license-status')).toContainText('license is no longer active');
  expect(await page.evaluate(() => localStorage.getItem('sb_license:shared-piano-takebook'))).toBe('invalid-token');
  await page.reload();
  expect(verifies).toBe(1);
  await expect(page.locator('#license-status')).toContainText('license is no longer active');
});

test('@claim:teacher-tools restores a valid checkout license and reuses its daily verdict', async ({ page }) => {
  let verifies=0;
  await page.route('https://api.sociobot.in/api/v1/products/shared-piano-takebook/verify?license=paid-token', async route => {
    verifies++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({valid:true,reason:'ok',expires_at:null})});
  });
  await page.goto('/?license=paid-token');
  await expect(page).toHaveURL('/');
  await expect(page.locator('#license-status')).toContainText('Teacher pack unlocked');
  await expect(page.getByLabel(/Folder/)).toBeEnabled();
  await page.evaluate(() => { window.print = () => localStorage.setItem('print-called','yes'); });
  await page.getByRole('button',{name:'Print practice sheet'}).click();
  expect(await page.evaluate(() => localStorage.getItem('print-called'))).toBe('yes');
  expect(await page.evaluate(() => localStorage.getItem('sb_license:shared-piano-takebook'))).toBe('paid-token');
  await page.reload();
  expect(verifies).toBe(1);
  await expect(page.getByLabel(/Folder/)).toBeEnabled();
});

test('@claim:teacher-pack-price advertises the enabled $9 live Teacher pack checkout', async ({ page }) => {
  const externalRequests:string[]=[];
  const appOrigin=new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173').origin;
  page.on('request',request=>{if(new URL(request.url()).origin!==appOrigin)externalRequests.push(request.url());});
  await page.goto('/?demo=1');
  const checkout=page.getByRole('link',{name:'Buy Teacher pack for $9'});
  await expect(checkout).toHaveAttribute('href','https://api.sociobot.in/api/v1/products/shared-piano-takebook/checkout');
  await expect(page.locator('#checkout-status')).toContainText('one-time purchase');
  expect(externalRequests).toEqual([]);
});

test('license restore explains a 429 Retry-After response', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/shared-piano-takebook/verify?license=rate-limited-token', async route => {
    await route.fulfill({status:429,headers:{'Retry-After':'7'},contentType:'text/plain',body:'Too Many Requests! Wait for 7s'});
  });
  await page.goto('/');
  await page.getByLabel('License token').fill('rate-limited-token');
  await page.getByRole('button',{name:'Verify license'}).click();
  await expect(page.locator('#license-status')).toContainText('Try again in 7 seconds');
  await expect(page.getByLabel('License token')).toHaveValue('rate-limited-token');
});

test('@claim:privacy-local fresh use stays on-origin and legal pages remain tracker-free', async ({ page }) => {
  const origins=new Set<string>();
  page.on('request',request=>origins.add(new URL(request.url()).origin));
  await page.goto('/?demo=1');
  await page.getByRole('button',{name:'Record'}).click();
  await page.keyboard.down('a'); await page.waitForTimeout(50); await page.keyboard.up('a');
  await page.getByRole('button',{name:/Stop recording/}).click();
  await page.getByRole('button',{name:'Save take'}).click();
  for (const name of ['Export MIDI','Export WAV','Export backup']) {
    const download=page.waitForEvent('download');
    await page.getByRole('button',{name}).click();
    await download;
  }
  const imported={id:'privacy-import',title:'Private import',teacherNote:'',folder:'',tempo:96,createdAt:'2026-08-30T00:00:00.000Z',updatedAt:'2026-08-30T00:00:00.000Z',duration:1,loopStart:0,loopEnd:1,notes:[{note:60,velocity:80,start:0,duration:.5}]};
  await page.getByLabel('Choose a Takebook backup file').setInputFiles({name:'private.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([imported]))});
  await page.goto('/privacy/');
  await page.goto('/terms/');
  expect([...origins]).toEqual([new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173').origin]);
});
