# Deployment Guide

## Overview
This project uses Vercel for client deployment and Railway for server deployment.

## Prerequisites
- Node.js 18+
- Vercel CLI: `npm i -g vercel`
- Railway CLI: `npm i -g @railway/cli`

## Environment Setup

### Client (.env)
```bash
cp client/.env.example client/.env
```
Update with your production URLs:
```
VITE_SERVER_URL=https://your-railway-app.railway.app
VITE_SOCKET_URL=https://your-railway-app.railway.app
VITE_GORBAGANA_RPC_URL=https://testnet.gorbagana.io
VITE_ENVIRONMENT=production
```

### Server (.env)
```bash
cp server/.env.example server/.env
```
Update with your production settings:
```
NODE_ENV=production
CLIENT_URL=https://your-vercel-app.vercel.app
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
REDIS_URL=redis://your-railway-redis:6379
GORBAGANA_RPC_URL=https://testnet.gorbagana.io
```

## Manual Deployment

### Deploy Server to Railway
1. Login to Railway: `railway login`
2. Create new project: `railway create`
3. Add Redis service: `railway add redis`
4. Deploy: `cd server && railway up`
5. Set environment variables in Railway dashboard

### Deploy Client to Vercel
1. Login to Vercel: `vercel login`
2. Deploy: `cd client && vercel --prod`
3. Set environment variables in Vercel dashboard

## Automatic Deployment (GitHub Actions)

### Required Secrets
Add these to GitHub repository secrets:

**Vercel:**
- `VERCEL_TOKEN`: Get from Vercel Settings > Tokens
- `VERCEL_ORG_ID`: Found in project settings
- `VERCEL_PROJECT_ID`: Found in project settings

**Railway:**
- `RAILWAY_TOKEN`: Get from Railway Settings > Tokens
- `RAILWAY_SERVICE_ID`: Found in project settings

### Deployment Flow
1. Push to `main` branch triggers deployment
2. Tests run first (lint, build, test)
3. If tests pass, deploys to production
4. Client deploys to Vercel
5. Server deploys to Railway

## Environment Variables

### Vercel Environment Variables
Set in Vercel dashboard > Project > Settings > Environment Variables:
- `VITE_SERVER_URL`: Your Railway app URL
- `VITE_SOCKET_URL`: Your Railway app URL  
- `VITE_GORBAGANA_RPC_URL`: Gorbagana testnet RPC
- `VITE_ENVIRONMENT`: production

### Railway Environment Variables
Set in Railway dashboard > Project > Variables:
- `NODE_ENV`: production
- `CLIENT_URL`: Your Vercel app URL
- `ALLOWED_ORIGINS`: Your Vercel app URL
- `GORBAGANA_RPC_URL`: Gorbagana testnet RPC
- `REDIS_URL`: Auto-configured by Railway Redis service

## Health Checks
- Server health: `https://your-railway-app.railway.app/health`
- Client build: Check Vercel deployment logs

## Troubleshooting

### Common Issues
1. **CORS errors**: Check `ALLOWED_ORIGINS` matches client URL
2. **Socket connection fails**: Ensure `VITE_SOCKET_URL` is correct
3. **Redis connection**: Verify Redis service is running on Railway
4. **Build failures**: Check environment variables are set

### Logs
- **Vercel**: View in Vercel dashboard > Deployments
- **Railway**: View in Railway dashboard > Deployments

## Scripts
- `npm run deploy` - Deploy to production (both client and server)
- `npm run build:prod` - Production build
- `npm run preview` - Preview production build locally