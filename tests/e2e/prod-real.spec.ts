import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { type BrowserContext, chromium, expect, type Page, test } from '@playwright/test';
import {
  approveOnce,
  cleanup,
  FREIGHTER,
  launchWithFreighter,
  onboardFreighter,
} from '../../../../../shared/freighter/freighter-fixture';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://lakbay-ashy.vercel.app';
const PUB = FREIGHTER.deployerPublic;
const TX_LINK = 'a[href*="/testnet/tx/"]';

const SHOTS = path.resolve(__dirname, '../../../screen-shot');
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) =>
  page.screenshot({ path: path.join(SHOTS, name), type: 'jpeg', quality: 85 });

test.describe.configure({ mode: 'serial' });

let context: BrowserContext;
let userDataDir: string;

test.beforeAll(async () => {
  const launched = await launchWithFreighter(chromium);
  context = launched.context;
  userDataDir = launched.userDataDir;
  await onboardFreighter(context);
});

test.afterAll(async () => {
  if (context) await cleanup(context, userDataDir);
});

async function capturePopup(popup: Page, name: string): Promise<void> {
  await popup.waitForLoadState('domcontentloaded').catch(() => {});
  await popup.waitForTimeout(1500);
  await popup.screenshot({ path: path.join(SHOTS, name), type: 'jpeg', quality: 85 }).catch(() => {});
}

async function connectWallet(page: Page): Promise<void> {
  const grantPopup = context.waitForEvent('page', { timeout: 60_000 });
  await page.getByRole('button', { name: /connect wallet/i }).first().click();
  await grantPopup.then((p) => capturePopup(p, '02-connect-popup.jpg')).catch(() => {});

  const signPopup = context.waitForEvent('page', { timeout: 90_000 });
  await approveOnce(context, { timeout: 60_000 });
  await signPopup.then((p) => capturePopup(p, '03-sign-challenge-popup.jpg')).catch(() => {});
  await approveOnce(context, { timeout: 90_000 });
}

async function attemptOnChain(
  trigger: () => Promise<void>,
  confirm: () => Promise<void>,
  popupTimeout: number,
): Promise<boolean> {
  try {
    await trigger();
    await approveOnce(context, { timeout: popupTimeout });
    await confirm();
    return true;
  } catch {
    return false;
  }
}

async function onChainWithRetry(
  page: Page,
  label: string,
  trigger: () => Promise<void>,
  confirm: () => Promise<void>,
  popupTimeout = 90_000,
): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await attemptOnChain(trigger, confirm, popupTimeout)) return;
    await page.waitForTimeout(2500);
  }
  throw new Error(`${label} did not settle after 4 attempts`);
}

async function createFund(page: Page, name: string): Promise<void> {
  await page.locator('#name').fill(name);
  await page.locator('#destination').fill('Palawan, Philippines');
  await onChainWithRetry(
    page,
    'create fund',
    () => page.getByRole('button', { name: /create fund/i }).click(),
    () => page.waitForURL(/\/trips\/[0-9a-f-]{36}/, { timeout: 150_000 }),
  );
  await expect(page.getByText(/Pool balance/i).first()).toBeVisible({ timeout: 30_000 });
}

async function contributeToPool(page: Page, amount: string): Promise<void> {
  await page.locator('#c-amount').fill(amount);
  await page.locator('#c-label').fill('Trip kitty');
  await onChainWithRetry(
    page,
    'contribute',
    () => page.getByRole('button', { name: /contribute xlm/i }).click(),
    () => expect(page.locator(TX_LINK).first()).toBeVisible({ timeout: 150_000 }),
  );
}

async function spendFromPool(page: Page, amount: string): Promise<void> {
  await page.locator('#s-desc').fill('Island hopping boat');
  await page.locator('#s-recipient').fill(PUB);
  await page.locator('#s-amount').fill(amount);
  await onChainWithRetry(
    page,
    'spend',
    () => page.getByRole('button', { name: /^pay /i }).click(),
    () => expect(page.locator(TX_LINK)).toHaveCount(2, { timeout: 150_000 }),
  );
}

async function readTxHash(page: Page): Promise<string> {
  const href = await page.locator(TX_LINK).first().getAttribute('href');
  expect(href).toContain('stellar.expert/explorer/testnet/tx/');
  const hash = (href ?? '').split('/tx/')[1];
  expect(hash).toBeTruthy();
  return hash;
}

test('real Freighter: connect + open pool + contribute + spend -> real on-chain tx hash', async () => {
  test.setTimeout(600_000);
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: /one pooled travel fund/i }),
  ).toBeVisible({ timeout: 20_000 });
  await shot(page, '01-landing.jpg');

  await page.goto(`${BASE_URL}/trips`, { waitUntil: 'domcontentloaded' });
  await connectWallet(page);
  await expect(
    page.getByText(new RegExp(`${PUB.slice(0, 4)}.+${PUB.slice(-4)}`)),
  ).toBeVisible({ timeout: 60_000 });

  const stamp = Date.now().toString().slice(-5);
  await createFund(page, `Coron Run ${stamp}`);
  await page.waitForTimeout(1200);
  await shot(page, '04-fund.jpg');

  await contributeToPool(page, '12');
  const txHash = await readTxHash(page);
  await page.waitForTimeout(1200);
  await shot(page, '05-contribute.jpg');

  await spendFromPool(page, '4');
  await page.waitForTimeout(1200);
  await shot(page, '06-spend.jpg');

  await page.goto(`${BASE_URL}/stats`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Lakbay in numbers/i })).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForTimeout(1200);
  await shot(page, '07-stats.jpg');

  // biome-ignore lint/suspicious/noConsole: surface the real tx hash for the run report
  console.log('CORE_FLOW_TX=' + txHash);
  expect(txHash).toBeTruthy();
});

test('mobile landing renders', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: /one pooled travel fund/i }),
  ).toBeVisible({ timeout: 20_000 });
  await shot(page, '08-mobile.jpg');
});
