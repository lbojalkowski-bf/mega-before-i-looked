import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest page', () => {
  it('renders the night with warn marking and dashes', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of ['rig/rotate-logs', 'lane/sync', 'fixtures/refresh', 'notes/backup', 'digest/render']) {
      expect(html).toContain(job);
    }
    expect(html).toMatch(/<tr class="warn"><td>fixtures\/refresh/);
    expect(html).toMatch(/<tr class="warn"><td>notes\/backup/);
    expect(html).toMatch(/<tr><td>digest\/render<\/td><td>—<\/td>/);
    expect(html).toContain('+01:00');
  });

  it('404s for a night without a file', async () => {
    const res = await createApp(config).request('/digest/2026-01-01');
    expect(res.status).toBe(404);
  });
});
