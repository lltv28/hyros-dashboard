# Railway Deployment Guide

## Quick Deploy (5 minutes)

### Option 1: Deploy from Local
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Navigate to project: `cd /tmp/hyros-dashboard`
4. Deploy: `railway up`
5. Add environment variable: `railway variables set HYROS_API_KEY=your_key_here`
6. Get URL: `railway domain`

### Option 2: Deploy from GitHub
1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select the `hyros-dashboard` repo
5. Add environment variable:
   - Key: `HYROS_API_KEY`
   - Value: `API_ae63d682ad9f45a900ae0af73d1e35053e5391d069893af28405324163f532ed`
6. Deploy!

### Option 3: One-Click Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

## After Deployment

1. Railway will provide a URL like: `https://your-app.railway.app`
2. Visit the URL to see your dashboard
3. Dashboard auto-refreshes every 2 minutes

## Environment Variables

Required:
- `HYROS_API_KEY` - Your HYROS API key

Optional:
- `PORT` - Port number (Railway auto-assigns this)

## Troubleshooting

**Dashboard not loading?**
- Check Railway logs: `railway logs`
- Verify HYROS_API_KEY is set correctly
- Check if HYROS API is responding

**API errors?**
- Test API manually: `curl https://api.hyros.com/v1/api/v1.0/leads -H "API-Key: YOUR_KEY"`
- Check API key permissions in HYROS dashboard

## Local Testing

Before deploying:
```bash
npm install
npm start
# Visit http://localhost:3000
```

---

Need help? Check Railway docs: https://docs.railway.app/
