import { createApp } from './app.factory';

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT || 3005;
  await app.listen(port, '0.0.0.0');
  
  const url = await app.getUrl();
  // NestJS getUrl() often returns [::1] or 127.0.0.1, but we want to confirm 0.0.0.0 is used
  console.log(`[Main] Backend is listening on port: ${port} (All Interfaces: 0.0.0.0)`);
  console.log(`[Main] Swagger documentation available at: ${url}/api/docs`);
}
bootstrap();
