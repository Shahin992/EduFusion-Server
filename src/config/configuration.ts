import { databaseConfig } from './db';

export default () => ({
  port: parseInt(process.env.PORT, 10) || 8888,
  database: {
    uri: databaseConfig.uri,
    options: databaseConfig.options,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  geminiApiKey: process.env.GEMINI_API_KEY,
});
