const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const HYROS_API_KEY = process.env.HYROS_API_KEY || 'API_ae63d682ad9f45a900ae0af73d1e35053e5391d069893af28405324163f532ed';
const HYROS_BASE_URL = 'https://api.hyros.com/v1/api/v1.0';
const FB_AD_ACCOUNT_ID = '936566124905640'; // Your Meta Ads account

// Serve static files
app.use(express.static('public'));

// Helper: Get date range
function getDateRange(range) {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);
  let startDate = new Date(today);
  startDate.setHours(0, 0, 0, 0);
  
  switch(range) {
    case 'today':
      break;
    case 'yesterday':
      startDate.setDate(startDate.getDate() - 1);
      endDate.setDate(endDate.getDate() - 1);
      break;
    case 'last7days':
      startDate.setDate(startDate.getDate() - 6);
      break;
    case 'last14days':
      startDate.setDate(startDate.getDate() - 13);
      break;
    case 'mtd':
      startDate.setDate(1);
      break;
    case 'lastmonth':
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate.setMonth(endDate.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      break;
  }
  
  return {
    start: startDate.toISOString().split('T')[0] + 'T00:00:00',
    end: endDate.toISOString().split('T')[0] + 'T23:59:59'
  };
}

// API endpoint for attribution report
app.get('/api/attribution-report', async (req, res) => {
  try {
    const range = req.query.range || 'last7days';
    const dates = getDateRange(range);
    
    console.log(`Fetching attribution for ${range}: ${dates.start} to ${dates.end}`);
    
    const params = new URLSearchParams({
      attributionModel: 'scientific',  // Scientific attribution
      startDate: dates.start,
      endDate: dates.end,
      level: 'facebook_adset',  // Break down by ad set
      fields: 'sales,calls,cost,clicks,cost_per_call,cost_per_sale,cost_per_click,name',
      ids: FB_AD_ACCOUNT_ID,
      isAdAccountId: 'true',
      pageSize: 100
    });

    const response = await fetch(`${HYROS_BASE_URL}/attribution?${params}`, {
      headers: {
        'API-Key': HYROS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('HYROS response:', JSON.stringify(data).substring(0, 200));
    
    res.json(data);
  } catch (error) {
    console.error('Attribution report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy endpoints (for backwards compatibility)
app.get('/api/leads', async (req, res) => {
  try {
    const pageSize = req.query.pageSize || 50;
    const response = await fetch(`${HYROS_BASE_URL}/leads?pageSize=${pageSize}`, {
      headers: {
        'API-Key': HYROS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/calls', async (req, res) => {
  try {
    const pageSize = req.query.pageSize || 50;
    const response = await fetch(`${HYROS_BASE_URL}/calls?pageSize=${pageSize}`, {
      headers: {
        'API-Key': HYROS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index-v2.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 HYROS Dashboard v2 running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🎯 Attribution: Scientific model, Ad Set breakdown`);
});
