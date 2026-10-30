import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

type Api = { night: string; rows: { job: string }[]; badLines: number };

const line = (at: string, job: string, status: string, extra: object = {}) =>
  JSON.stringify({ at, job, status, owner: 'rook', ...extra });

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  writeFileSync(
    join(dir, '2026-02-01.jsonl'),
    [
      line('2026-02-01T23:00:00+01:00', 'zeta/job', 'ok'),
      line('2026-02-02T00:00:00+01:00', 'alpha/job', 'ok'),
      line('2026-02-02T01:00:00+01:00', 'alpha/job', 'fail', { error: 'boom' }),
      line('2026-02-02T02:00:00+01:00', 'mid/job', 'ok'),
    ].join('\n') + '\n',
  );
  writeFileSync(join(dir, '2026-02-03.jsonl'), '');
  writeFileSync(
    join(dir, '2026-02-04.jsonl'),
    [
      line('2026-02-04T23:00:00+01:00', 'good/one', 'ok'),
      '{this is not json',
      line('2026-02-05T00:00:00+01:00', 'good/two', 'ok'),
    ].join('\n') + '\n',
  );
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('GET /digest/:night (temp runs dir)', () => {
  it('200 for a normal night', async () => {
    const res = await app.request('/digest/2026-02-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of ['alpha/job', 'mid/job', 'zeta/job']) expect(html).toContain(job);
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/2026-02-09')).status).toBe(404);
  });

  it('empty night says nothing ran', async () => {
    const res = await app.request('/digest/2026-02-03');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('bad-line night still renders the good rows', async () => {
    const res = await app.request('/digest/2026-02-04');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('good/one');
    expect(html).toContain('good/two');
    expect(html).toContain('1 unreadable line skipped');
  });
});

describe('GET /api/digest/:night (temp runs dir)', () => {
  it('200 for a normal night', async () => {
    const res = await app.request('/api/digest/2026-02-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Api;
    expect(body.night).toBe('2026-02-01');
    expect(body.rows.map((r) => r.job)).toEqual(['alpha/job', 'mid/job', 'zeta/job']);
    expect(body.badLines).toBe(0);
  });

  it('404 JSON error for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-02-09');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('empty night has no rows and no bad lines', async () => {
    const res = await app.request('/api/digest/2026-02-03');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Api;
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('bad-line night is 200 with badLines 1 and the good rows', async () => {
    const res = await app.request('/api/digest/2026-02-04');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Api;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['good/one', 'good/two']);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-02-01')).text();
    const body = (await (await app.request('/api/digest/2026-02-01')).json()) as Api;
    const pageJobs = [...html.matchAll(/<tr(?: class="warn")?><td>([^<]+)<\/td>/g)].map((m) => m[1]);
    expect(pageJobs).toEqual(body.rows.map((r) => r.job));
    expect(pageJobs).toHaveLength(3);
  });
});
