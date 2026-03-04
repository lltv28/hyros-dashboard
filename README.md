# HYROS Dashboard

Real-time lead & call tracking dashboard for Kodara.

## Features

- 📊 Real-time lead tracking
- 📞 Call booking monitoring
- 🎯 Attribution by campaign
- 📈 Conversion rate metrics
- ⚡ Auto-refresh every 2 minutes

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla JS (no frameworks)
- **API:** HYROS REST API
- **Deployment:** Railway

## Environment Variables

```
HYROS_API_KEY=your_api_key_here
PORT=3000
```

## Local Development

```bash
npm install
npm start
```

Dashboard will be available at `http://localhost:3000`

## Railway Deployment

1. Push to GitHub
2. Connect Railway to the repo
3. Add `HYROS_API_KEY` environment variable
4. Deploy

## API Endpoints

- `GET /api/leads` - Get recent leads
- `GET /api/calls` - Get recent calls
- `GET /api/attribution` - Get attribution data

---

Built for Kodara by Sage 🌿
