import { createApp } from './app.factory';

async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT || 3005, '0.0.0.0');
  console.log(`Backend is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();
