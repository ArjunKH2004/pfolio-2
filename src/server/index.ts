import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { VIEWER_ID_HEADER, VIEWER_ORG_HEADER, VIEWER_WORKSPACE_HEADER } from '@mfg-agent/apps';
import { users } from './schema.js';

// Viewer Identity is injected by the dispatch Worker on every authenticated
// request (AD-16). Read it only through the imported constants — never
// restate the header names here.

/** Bindings available to the Starter Worker at runtime. DB and BUCKET are opt-in (AD-18). */
type Bindings = {
  /** Cloudflare Assets binding — enables env.ASSETS.fetch for asset/SPA routing (DW-22). */
  ASSETS: Fetcher;
  /** App Database D1 binding, opt-in (AD-18). Absent on the default Starter. */
  DB?: D1Database;
  /** App object-storage R2 binding, opt-in (AD-18). Absent on the default Starter. */
  BUCKET?: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/viewer', (c) => {
  const id = c.req.header(VIEWER_ID_HEADER);
  const org = c.req.header(VIEWER_ORG_HEADER);
  const workspace = c.req.header(VIEWER_WORKSPACE_HEADER);
  return c.json({ id, org, workspace });
});

// Read the App's own database (DW-25). When env.DB is unbound (default DB-less
// App per AD-18) return a clear not-configured 2xx — never a 500.
app.get('/api/db', async (c) => {
  if (!c.env.DB) return c.json({ database: 'not-configured' });
  try {
    const rows = await drizzle(c.env.DB).select().from(users).limit(10);
    return c.json({ database: 'ok', users: rows });
  } catch (e) {
    return c.json({ database: 'error', message: (e as Error).message });
  }
});

// Store and read back visitor files (Story 5.12). When env.BUCKET is unbound
// (default bucket-less App per AD-18) return a clear not-configured 2xx — never
// a 500 from calling a method on an undefined binding.
app.get('/api/files/:key', async (c) => {
  if (!c.env.BUCKET) return c.json({ files: 'not-configured' });
  try {
    const object = await c.env.BUCKET.get(c.req.param('key'));
    if (!object) return c.json({ files: 'not-found' }, 404);
    return new Response(object.body);
  } catch (e) {
    return c.json({ files: 'error', message: (e as Error).message });
  }
});

app.post('/api/files/:key', async (c) => {
  if (!c.env.BUCKET) return c.json({ files: 'not-configured' });
  try {
    // Stream the body straight into R2 — buffering a multi-MB upload burns the
    // 200 ms dispatch CPU ceiling.
    await c.env.BUCKET.put(c.req.param('key'), c.req.raw.body);
    return c.json({ files: 'stored', key: c.req.param('key') });
  } catch (e) {
    return c.json({ files: 'error', message: (e as Error).message });
  }
});

// Forward every non-API request to the Cloudflare Assets binding (DW-22).
// Asset paths serve their file; unmatched paths return the SPA app shell
// (index.html, 200) via not_found_handling: single-page-application.
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
