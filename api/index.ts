import express from 'express';
import serverless from 'serverless-http';
import { ExpressAdapter } from '@nestjs/platform-express';
import { createApp } from '../src/app.factory';

let cachedHandler: ReturnType<typeof serverless> | null = null;

async function getHandler() {
  if (cachedHandler) {
    return cachedHandler;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  await createApp(adapter);

  cachedHandler = serverless(expressApp);
  return cachedHandler;
}

export default async function handler(req: any, res: any) {
  const start = Date.now();
  console.log(`[Handler] Received request: ${req.method} ${req.url}`);
  try {
    const serverlessHandler = await getHandler();
    const result = await serverlessHandler(req, res);
    console.log(`[Handler] Request processed in ${Date.now() - start}ms`);
    return result;
  } catch (error) {
    console.error(`[Handler] Vercel bootstrap failed after ${Date.now() - start}ms:`, error);
    res.status(500).json({
      message: 'Server startup failed',
      error:
        error instanceof Error
          ? error.message
          : 'Unknown startup error',
    });
  }
}
