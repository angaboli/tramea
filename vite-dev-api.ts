/**
 * Pont `/api` pour le serveur de DÉVELOPPEMENT (`pnpm dev`).
 *
 * En production, les fichiers `api/*.ts` sont des fonctions serverless exécutées
 * par Vercel. Sous Vite pur, ces routes n'existent pas → elles renvoient 404 et
 * l'app retombe silencieusement sur des chemins dégradés (ex. l'import PDF sans
 * Gemini). Ce plugin monte chaque handler `api/<nom>.ts` en middleware de dev,
 * avec un shim minimal du couple req/res à la Vercel (`req.query`, `req.body`,
 * `res.status().json()/.send()`), et charge les variables `.env` (y compris
 * NON préfixées VITE_, comme GEMINI_API_KEY et les clés R2) dans `process.env`.
 *
 * Dev uniquement (`apply: 'serve'`) : aucun effet sur le build/déploiement.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

export function devApi(): Plugin {
  return {
    name: 'tramea-dev-api',
    apply: 'serve',
    configureServer(server) {
      // .env → process.env (les handlers lisent process.env.GEMINI_API_KEY…).
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const url = new URL(req.url, 'http://localhost');
        const name = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
        if (!name || !existsSync(resolve(process.cwd(), 'api', `${name}.ts`))) {
          return next();
        }

        // ── Shim req (façon Vercel) ────────────────────────────────────────
        const query: Record<string, string> = {};
        url.searchParams.forEach((v, k) => (query[k] = v));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).query = query;

        if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (req as any).body = raw ? JSON.parse(raw) : {};
          } catch {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (req as any).body = raw;
          }
        }

        // ── Shim res (status / json / send) ────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = res as any;
        r.status = (code: number) => ((res.statusCode = code), r);
        r.json = (obj: unknown) => {
          if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(obj));
          return r;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        r.send = (data: any) => {
          if (Buffer.isBuffer(data) || typeof data === 'string') res.end(data);
          else r.json(data);
          return r;
        };

        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          await mod.default(req, res);
        } catch (err) {
          server.config.logger.error(`[dev-api] ${name}: ${String(err)}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
          }
        }
      });
    },
  };
}
