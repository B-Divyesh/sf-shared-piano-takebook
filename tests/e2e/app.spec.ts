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

test.afterEach(async ({ page }) => {
  expect((page as typeof page & { __consoleErrors?: string[] }).__consoleErrors ?? []).toEqual([]);
});

test('records, annotates, saves and reopens a take with the keyboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.getByRole('button',{name:'Record'}).click();
  await page.keyboard.down('a'); await page.waitForTimeout(100); await page.keyboard.up('a');
  await page.keyboard.down('d'); await page.waitForTimeout(100); await page.keyboard.up('d');
  await page.getByRole('button',{name:/Stop recording/}).click();
  await page.getByLabel('Take name').fill('Friday duet');
  await page.getByLabel('Teacher note').fill('Keep the second note light.');
  await page.getByRole('button',{name:'Save take'}).click();
  await expect(page.getByText('Friday duet')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Friday duet')).toBeVisible();
  await page.getByRole('button',{name:'Open',exact:true}).click();
  await expect(page.getByLabel('Teacher note')).toHaveValue('Keep the second note light.');
});

test('installed shell works offline after a first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker?.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading',{name:/Keep the take/})).toBeVisible();
  await expect(page.getByText(/Offline · takes available/)).toBeVisible();
});

test('announces an installed service-worker update', async ({ page }) => {
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
  for (const path of ['/privacy/','/terms/']) { await page.goto(path); await expect(page.locator('html')).toHaveAttribute('lang','en'); await expect(page.locator('main')).toHaveCount(1); await expect(page.locator('h1')).toHaveCount(1); }
});

test('has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  for(const path of ['/','/privacy/','/terms/']){
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

test('390px piano targets meet the touch size and spacing contract', async ({ page }) => {
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
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth-document.documentElement.clientWidth);
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

test('an unavailable hosted checkout is disclosed without a broken purchase link', async ({ page }) => {
  const externalRequests:string[]=[];
  page.on('request',request=>{if(new URL(request.url()).origin!=='http://127.0.0.1:4173')externalRequests.push(request.url());});
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Purchases temporarily paused'})).toBeDisabled();
  await expect(page.locator('#checkout-status')).toContainText('New checkout is not available yet');
  expect(externalRequests).toEqual([]);
});

test('fresh use stays on-origin and legal pages remain tracker-free', async ({ page }) => {
  const origins=new Set<string>();
  page.on('request',request=>origins.add(new URL(request.url()).origin));
  await page.goto('/');
  await page.goto('/privacy/');
  await page.goto('/terms/');
  expect([...origins]).toEqual(['http://127.0.0.1:4173']);
});
