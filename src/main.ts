import { createApp } from './app.factory';

async function bootstrap() {
  const app = await createApp();
  // We will force port 3005 for maximum reliability with our Docker EXPOSE
  const port = 3005;
  await app.listen(port, '0.0.0.0');
  
  console.log(`[Main] !! CRITICAL !! Backend is FORCED to port: ${port} on 0.0.0.0`);
  console.log(`[Main] If you see this, the app has successfully started the web server.`);
}
bootstrap();
