/**
 * Angular SSR Server dengan BFF Pattern
 * BEST PRACTICE: Forward-only proxy (no body parsing)
 */

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
const angularApp = new AngularNodeAppEngine();

// ========================================
// CONFIG
// ========================================
const isDevelopment = process.env['NODE_ENV'] !== 'production';
const DEV_CONFIG = {
  BACKEND_URL: 'http://localhost:5000',
  API_KEY: 'e015a5d2-bc94-47bc-a691-00cfbf2534cf',
  PORT: 4200,
};
const PROD_CONFIG = {
  BACKEND_URL: process.env['BACKEND_URL'] || '',
  API_KEY: process.env['API_KEY_SERVER'] || '',
  PORT: process.env['PORT'] || 4200,
};
const CONFIG = isDevelopment ? DEV_CONFIG : PROD_CONFIG;

if (!isDevelopment && (!CONFIG.API_KEY || !CONFIG.BACKEND_URL)) {
  console.error('ERROR: API_KEY or BACKEND_URL required in production!');
  process.exit(1);
}

// ========================================
// MIDDLEWARE - RAW BODY (DO NOT PARSE!)
// ========================================
// ❌ REMOVE: express.json() - will parse and break multipart
// ❌ REMOVE: express.urlencoded() - will parse and break multipart
// ✅ USE: express.raw() to get raw buffer for forwarding

app.use(
  express.raw({
    type: () => true, // Accept all content types
    limit: '50mb', // Max upload size
  })
);

// ========================================
// BFF PROXY - FORWARD ONLY
// ========================================
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/api') {
    await handleBffProxy(req, res);
  } else {
    next();
  }
});

// PURE FORWARD PROXY (NO BODY PARSING)
async function handleBffProxy(req: express.Request, res: express.Response) {
  try {
    const targetUrl = `${CONFIG.BACKEND_URL}${req.originalUrl}`;
    console.log(`BFF ${req.method} ${req.originalUrl} → ${targetUrl}`);

    // ========================================
    // STEP 1: Prepare headers (FORWARD + ADD X-API-KEY)
    // ========================================
    const headers: HeadersInit = {
      // Forward Content-Type (IMPORTANT for multipart!)
      ...(req.headers['content-type'] && { 'Content-Type': req.headers['content-type'] }),

      // Forward Authorization
      ...(req.headers.authorization && { Authorization: req.headers.authorization }),

      // Add X-API-KEY (BFF's job)
      ...(CONFIG.API_KEY && { 'X-API-KEY': CONFIG.API_KEY }),
    };

    // ========================================
    // STEP 2: Prepare fetch options
    // ========================================
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      // Forward raw body (works for JSON, FormData, binary, etc)
      ...(req.body && { body: req.body }),
    };

    // ========================================
    // STEP 3: Forward request to backend
    // ========================================
    const response = await fetch(targetUrl, fetchOptions);

    // ========================================
    // STEP 4: Forward response back to client
    // ========================================
    // Set status code
    res.status(response.status);

    // Forward response headers (except hop-by-hop headers)
    response.headers.forEach((value, key) => {
      const hopByHopHeaders = [
        'connection',
        'keep-alive',
        'transfer-encoding',
        'upgrade',
        'proxy-authenticate',
        'proxy-authorization',
        'te',
        'trailer',
      ];

      if (!hopByHopHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Forward response body
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return res.send(buffer);
  } catch (error) {
    const err = error as Error;
    console.error('BFF Error:', err);

    // Connection error
    if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
      return res.status(503).json({
        code: 503,
        status: 'Service Unavailable',
        data: { message: 'Backend Golang tidak running!' },
      });
    }

    // Other errors
    return res.status(500).json({
      code: 500,
      status: 'Internal Server Error',
      data: {
        message: 'Error saat menghubungi backend',
        error: isDevelopment ? err.message : undefined,
      },
    });
  }
}

// ========================================
// STATIC FILES
// ========================================
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

// ========================================
// ANGULAR SSR
// ========================================
app.use((req, res, next) => {
  return angularApp
    .handle(req)
    .then((response) => {
      if (response) {
        writeResponseToNodeResponse(response, res);
      } else {
        next();
      }
    })
    .catch(next);
});

// ========================================
// ERROR HANDLER
// ========================================
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server Error:', err);
  if (!res.headersSent) {
    res.status(500).json({
      code: 500,
      status: 'Internal Server Error',
      data: { message: 'Server error', error: isDevelopment ? err.message : undefined },
    });
  }
});

// ========================================
// START SERVER
// ========================================
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = CONFIG.PORT;
  app.listen(port, () => {
    console.log('');
    console.log('ANGULAR SSR + BFF SERVER');
    console.log(`   Server: http://localhost:${port}`);
    console.log(`   Backend: ${CONFIG.BACKEND_URL}`);
    console.log(`   Mode: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);
    console.log('');
  });
}

export const reqHandler = createNodeRequestHandler(app);
