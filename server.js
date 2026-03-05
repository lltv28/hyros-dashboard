const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const HYROS_API_KEY = process.env.HYROS_API_KEY || 'API_ae63d682ad9f45a900ae0af73d1e35053e5391d069893af28405324163f532ed';
const HYROS_BASE_URL = 'https://api.hyros.com/v1/api/v1.0';
const FB_AD_ACCOUNT_ID = '936566124905640';

app.use(express.static('public'));

// Helper: Get date range in PST
function getDateRange(range) {
  // PST is UTC-8 hours
  const PST_OFFSET_HOURS = -8;
  
  // Get current UTC time
  const nowUTC = new Date();
  
  // Calculate what date it is in PST
  const nowPSTTime = new Date(nowUTC.getTime() + PST_OFFSET_HOURS * 60 * 60 * 1000);
  const pstYear = nowPSTTime.getUTCFullYear();
  const pstMonth = nowPSTTime.getUTCMonth();
  const pstDate = nowPSTTime.getUTCDate();
  
  // Create start and end dates in PST
  let startYear = pstYear;
  let startMonth = pstMonth;
  let startDay = pstDate;
  let endYear = pstYear;
  let endMonth = pstMonth;
  let endDay = pstDate;
  
  switch(range) {
    case 'today':
      break;
    case 'yesterday':
      const yesterday = new Date(pstYear, pstMonth, pstDate - 1);
      startYear = yesterday.getFullYear();
      startMonth = yesterday.getMonth();
      startDay = yesterday.getDate();
      endYear = startYear;
      endMonth = startMonth;
      endDay = startDay;
      break;
    case 'last7days':
      const week = new Date(pstYear, pstMonth, pstDate - 6);
      startYear = week.getFullYear();
      startMonth = week.getMonth();
      startDay = week.getDate();
      break;
    case 'last14days':
      const twoWeeks = new Date(pstYear, pstMonth, pstDate - 13);
      startYear = twoWeeks.getFullYear();
      startMonth = twoWeeks.getMonth();
      startDay = twoWeeks.getDate();
      break;
    case 'mtd':
      startDay = 1;
      break;
    case 'lastmonth':
      const lastMonthStart = new Date(pstYear, pstMonth - 1, 1);
      const lastMonthEnd = new Date(pstYear, pstMonth, 0);
      startYear = lastMonthStart.getFullYear();
      startMonth = lastMonthStart.getMonth();
      startDay = lastMonthStart.getDate();
      endYear = lastMonthEnd.getFullYear();
      endMonth = lastMonthEnd.getMonth();
      endDay = lastMonthEnd.getDate();
      break;
  }
  
  // Create UTC timestamps for start of day PST and end of day PST
  const startPST = Date.UTC(startYear, startMonth, startDay, 0, 0, 0);
  const endPST = Date.UTC(endYear, endMonth, endDay, 23, 59, 59, 999);
  
  // Convert PST times to UTC times
  const startUTCms = startPST - (PST_OFFSET_HOURS * 60 * 60 * 1000);
  const endUTCms = endPST - (PST_OFFSET_HOURS * 60 * 60 * 1000);
  
  const startUTC = new Date(startUTCms);
  const endUTC = new Date(endUTCms);
  
  return {
    start: startUTC.toISOString().split('.')[0],
    end: endUTC.toISOString().split('.')[0],
    startMs: startUTCms,
    endMs: endUTCms
  };
}

// NEW: Enhanced attribution report with lead emails
app.get('/api/attribution-report', async (req, res) => {
  try {
    const range = req.query.range || 'last7days';
    const dates = getDateRange(range);
    
    console.log(`[${new Date().toISOString()}] Fetching attribution + leads for ${range}`);
    
    // Fetch ad set level attribution
    const attrParams = new URLSearchParams({
      attributionModel: 'scientific',
      startDate: dates.start,
      endDate: dates.end,
      level: 'facebook_adset',
      fields: 'sales,calls,cost,clicks,cost_per_call,cost_per_sale,cost_per_click,name',
      ids: FB_AD_ACCOUNT_ID,
      isAdAccountId: 'true',
      pageSize: 100
    });

    const attrResponse = await fetch(`${HYROS_BASE_URL}/attribution?${attrParams}`, {
      headers: {
        'API-Key': HYROS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const attrData = await attrResponse.json();
    
    // Fetch leads to build ad -> ad set mapping
    const leadsResponse = await fetch(`${HYROS_BASE_URL}/leads?pageSize=250`, {
      headers: {
        'API-Key': HYROS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const leadsData = await leadsResponse.json();
    const leads = leadsData.result || leadsData;
    
    // Build map: ad ID -> ad set ID
    const adToAdsetMap = {};
    if (Array.isArray(leads)) {
      leads.forEach(lead => {
        const adId = lead.firstSource?.sourceLinkAd?.adSourceId;
        const adsetId = lead.firstSource?.adSource?.adSourceId;
        if (adId && adsetId) {
          adToAdsetMap[adId] = adsetId;
        }
      });
    }
    
    console.log(`[DEBUG] Built ad->adset map with ${Object.keys(adToAdsetMap).length} entries`);
    
    // Fetch ad level attribution (individual ads)
    const adParams = new URLSearchParams({
      attributionModel: 'scientific',
      startDate: dates.start,
      endDate: dates.end,
      level: 'facebook_ad',
      fields: 'sales,calls,cost,clicks,cost_per_call,cost_per_sale,cost_per_click,name',
      ids: FB_AD_ACCOUNT_ID,
      isAdAccountId: 'true',
      pageSize: 200
    });

    const adResponse = await fetch(`${HYROS_BASE_URL}/attribution?${adParams}`, {
      headers: {
        'API-Key': HYROS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const adData = await adResponse.json();
    
    // Fetch booked calls (already filtered by HYROS)
    const callsResponse = await fetch(`${HYROS_BASE_URL}/calls?pageSize=250`, {
      headers: {
        'API-Key': HYROS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const callsData = await callsResponse.json();
    const calls = callsData.result || callsData;
    
    console.log(`[DEBUG] Fetched ${Array.isArray(calls) ? calls.length : 0} calls`);
    console.log(`[DEBUG] Date range: ${dates.startMs} to ${dates.endMs}`);
    
    // Build ad set mapping: id -> { name, calls: [emails], sales: [emails] }
    const adsetMap = {};
    
    // Process calls
    if (Array.isArray(calls)) {
      let processedCount = 0;
      let skippedDateCount = 0;
      
      calls.forEach(call => {
        const createdAt = new Date(call.creationDate).getTime();
        
        // Only include calls from the selected date range
        if (createdAt < dates.startMs || createdAt > dates.endMs) {
          skippedDateCount++;
          return;
        }
        
        // Get ad set info from first touch (original source)
        const firstSource = call.firstSource || {};
        const adsetId = firstSource.adSource?.adSourceId;
        const adsetName = firstSource.name || adsetId;
        const email = call.lead?.email;
        
        if (!adsetId || !email) {
          return;
        }
        
        processedCount++;
        
        // Initialize ad set entry
        if (!adsetMap[adsetId]) {
          adsetMap[adsetId] = {
            name: adsetName,
            calls: [],
            sales: []
          };
        }
        
        // Update name if we have a better one
        if (adsetName && adsetName !== adsetId) {
          adsetMap[adsetId].name = adsetName;
        }
        
        // Add email to calls
        adsetMap[adsetId].calls.push(email);
      });
      
      console.log(`[DEBUG] Processed ${processedCount} calls, skipped ${skippedDateCount} (date range)`);
    }
    
    // Fetch sales (already filtered by HYROS)
    const salesResponse = await fetch(`${HYROS_BASE_URL}/sales?pageSize=250`, {
      headers: {
        'API-Key': HYROS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const salesData = await salesResponse.json();
    const sales = salesData.result || salesData;
    
    console.log(`[DEBUG] Fetched ${Array.isArray(sales) ? sales.length : 0} sales`);
    
    // Process sales
    if (Array.isArray(sales)) {
      let processedCount = 0;
      let skippedDateCount = 0;
      
      sales.forEach(sale => {
        const createdAt = new Date(sale.creationDate).getTime();
        
        // Only include sales from the selected date range
        if (createdAt < dates.startMs || createdAt > dates.endMs) {
          skippedDateCount++;
          return;
        }
        
        // Get ad set info from first touch
        const firstSource = sale.firstSource || {};
        const adsetId = firstSource.adSource?.adSourceId;
        const adsetName = firstSource.name || adsetId;
        const email = sale.lead?.email;
        
        if (!adsetId || !email) {
          return;
        }
        
        processedCount++;
        
        // Initialize ad set entry if not exists
        if (!adsetMap[adsetId]) {
          adsetMap[adsetId] = {
            name: adsetName,
            calls: [],
            sales: []
          };
        }
        
        // Update name if we have a better one
        if (adsetName && adsetName !== adsetId) {
          adsetMap[adsetId].name = adsetName;
        }
        
        // Add email to sales
        adsetMap[adsetId].sales.push(email);
      });
      
      console.log(`[DEBUG] Processed ${processedCount} sales, skipped ${skippedDateCount} (date range)`);
    }
    
    console.log(`[DEBUG] Ad set map has ${Object.keys(adsetMap).length} entries`);
    
    
    // Group ads by parent ad set using the ad->adset map
    const adsByAdset = {};
    if (adData.result && Array.isArray(adData.result)) {
      adData.result.forEach(ad => {
        const parentId = adToAdsetMap[ad.id];
        if (!parentId) {
          console.log(`[DEBUG] No parent found for ad ${ad.id}`);
          return;
        }
        
        if (!adsByAdset[parentId]) {
          adsByAdset[parentId] = [];
        }
        
        adsByAdset[parentId].push({
          id: ad.id,
          name: ad.name || ad.id,
          calls: ad.calls || 0,
          sales: ad.sales || 0,
          cost: ad.cost || 0,
          clicks: ad.clicks || 0,
          cost_per_click: ad.cost_per_click || 0,
          cost_per_call: ad.cost_per_call || 0,
          cost_per_sale: ad.cost_per_sale || 0
        });
      });
      
      console.log(`[DEBUG] Grouped ads into ${Object.keys(adsByAdset).length} ad sets`);
    }
    
    // Enhance attribution data with names, emails, and nested ads
    if (attrData.result) {
      attrData.result = attrData.result.map(adset => {
        const mapped = adsetMap[adset.id] || {};
        return {
          ...adset,
          name: mapped.name || adset.name || adset.id,
          callEmails: mapped.calls || [],
          saleEmails: mapped.sales || [],
          ads: adsByAdset[adset.id] || []
        };
      });
    }
    
    console.log(`[${new Date().toISOString()}] Processed ${attrData.result?.length || 0} ad sets with ${Object.keys(adsByAdset).length} having nested ads`);
    
    res.json(attrData);
  } catch (error) {
    console.error('Attribution report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy endpoints
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
  console.log(`🎯 Attribution: Scientific model + Lead email mapping`);
});
