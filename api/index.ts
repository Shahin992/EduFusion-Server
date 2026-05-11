import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { createApp } from '../src/app.factory';

let cachedApp: any = null;

async function getApp() {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  await createApp(adapter);
  
  cachedApp = expressApp;
  return cachedApp;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    
    // Handle root / by showing a simple health status since global prefix is /api
    if (req.url === '/' || req.url === '/api') {
      return res.status(200).json({
        status: 'EduFusion API is running',
        docs: '/api/docs',
        health: '/api/health'
      });
    }

    // Direct Express handling
    return app(req, res);
  } catch (error) {
    console.error('Vercel handler failed:', error);
    res.status(500).json({
      message: 'Server internal error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
