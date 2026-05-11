# Production Setup & Deployment Guide

This project is now configured for production-grade containerization and Vercel deployment.

## 🐳 Docker Setup

The project includes a multi-stage Docker configuration optimized for production.

### Files Created/Updated:
- `Dockerfile`: Multi-stage build (Node 20 Alpine), non-root user security, and production dependency optimization.
- `docker-compose.yml`: Orchestrates the NestJS app and a MongoDB container with health checks and persistent volumes.
- `.dockerignore`: Ensures only necessary files are included in the image.

### How to Run Locally with Docker:
1. Make sure you have Docker and Docker Compose installed.
2. Run the following command:
   ```bash
   docker-compose up --build
   ```
3. The API will be available at `http://localhost:3005/api`.
4. Check health status at `http://localhost:3005/api/health`.

---

## 🚀 Vercel Deployment

The project is already configured for Vercel using serverless functions.

### Configuration:
- `vercel.json`: Routes all traffic to the `api/index.ts` serverless handler.
- `api/index.ts`: A specialized entry point that bootstraps the NestJS application within the Vercel environment.
- `src/app.factory.ts`: Optimized to use CDN-hosted Swagger assets to prevent 404 errors in production.

### 🚀 Railway Deployment (Recommended for BullMQ/Cron)

Railway is excellent for this project because it supports persistent processes and Docker.

1.  **Push to GitHub**: Ensure your code is on GitHub.
2.  **New Project**: In Railway, select **"Deploy from GitHub repo"**.
3.  **Add MongoDB**: Click **"New"** -> **"Database"** -> **"Add MongoDB"**.
4.  **Environment Variables**: 
    *   In your App settings, go to **"Variables"**.
    *   Add all vars from your `.env`.
    *   For the database, add a variable named `MONGODB_URI` (or whatever your app uses) and reference the MongoDB service's connection string.
5.  **Automatic Build**: Railway will detect the `Dockerfile` and build your app automatically.
6.  **Public URL**: Once deployed, Railway will provide a public URL (e.g., `edu-fusion-production.up.railway.app`).

### 💸 Tips for Vercel Free Tier (Hobby)
- **Max Duration**: Set to 10s (the maximum for Hobby). If your app takes longer to start, it will timeout. I've configured this in `vercel.json`.
- **Database**: Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) Free Tier. Vercel doesn't host MongoDB.
- **Cold Starts**: NestJS apps can be "heavy". I've configured the app to cache the instance in `api/index.ts`, which helps with subsequent requests.
- **Edge Runtime**: NestJS (with Mongoose/Express) generally requires the **Node.js Runtime**, not the Edge Runtime. Don't try to switch to Edge unless you refactor to use a compatible DB driver and framework.
- **Memory**: I've set the function memory to `1024MB` in `vercel.json` to give it more breathing room during startup.

### How to Deploy:
Since I cannot interactively log in to your Vercel account, please follow these steps:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

4. **Environment Variables**:
   Ensure you add the following variables in the Vercel Dashboard:
   - `DB_USERNAME`
   - `DB_PASS`
   - `DB_NAME`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `GEMINI_API_KEY`
   - `VERCEL=1` (This helps the app optimize its bootstrap process)

### Troubleshooting:
- **Cold Starts**: The app is optimized to initialize quickly. If you experience timeouts, check the Vercel logs.
- **Database Connection**: Ensure your MongoDB instance (e.g., MongoDB Atlas) allows connections from Vercel's IP ranges or has "Allow access from anywhere" enabled for testing.
