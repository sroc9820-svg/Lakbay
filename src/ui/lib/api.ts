type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: Envelope<T>;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }
  if (!json.ok) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body: unknown) => request<T>('POST', url, body),
};

export function shorten(addr: string, lead = 4, tail = 4): string {
  if (!addr) return '';
  if (addr.length <= lead + tail + 1) return addr;
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

export function fmtAmount(raw: string | number): string {
  const n = typeof raw === 'number' ? raw : Number.parseFloat(raw || '0');
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 7 });
}

export function explorerTx(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function explorerAccount(addr: string): string {
  return `https://stellar.expert/explorer/testnet/account/${addr}`;
}

export function explorerContract(contractId: string): string {
  return `https://stellar.expert/explorer/testnet/contract/${contractId}`;
}
