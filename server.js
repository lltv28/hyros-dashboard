const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const HYROS_API_KEY = process.env.HYROS_API_KEY || 'API_ae63d682ad9f45a900ae0af73d1e35053e5391d069893af28405324163f532ed';
const HYROS_BASE_URL = 'https://api.hyros.com/v1/api/v1.0';

// Serve static files
app.use(express.static('public'));

// API endpoint to get leads
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

// API endpoint to get calls
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

// API endpoint to get attribution data
app.get('/api/attribution', async (req, res) => {
  try {
    // Get today's date range
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);
    
    const params = new URLSearchParams({
      attributionModel: 'last_click',
      startDate: startDate.toISOString().split('T')[0] + 'T00:00:00',
      endDate: today.toISOString().split('T')[0] + 'T23:59:59',
      level: 'facebook_adset',
      fields: 'sales,revenue,calls,leads,cost,roi,roas',
      ids: '936566124905640',
      isAdAccountId: 'true',
      pageSize: 50
    });

    const response = await fetch(`${HYROS_BASE_URL}/attribution?${params}`, {
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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 HYROS Dashboard running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});
