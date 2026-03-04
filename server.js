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
    end: endDate.toISOString().split('T')[0] + 'T23:59:59',
    startMs: startDate.getTime(),
    endMs: endDate.getTime()
  };
}

// NEW: Enhanced attribution report with lead emails
app.get('/api/attribution-report', async (req, res) => {
  try {
    const range = req.query.range || 'last7days';
    const dates = getDateRange(range);
    
    console.log(`[${new Date().toISOString()}] Fetching attribution + leads for ${range}`);
    
    // Fetch attribution data
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
    
    // Fetch leads for the same period to get emails and ad set names
    const leadsResponse = await fetch(`${HYROS_BASE_URL}/leads?pageSize=250`, {
      headers: {
        'API-Key': HYROS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const leadsData = await leadsResponse.json();
    console.log(`[DEBUG] leadsData type:`, typeof leadsData, 'isArray:', Array.isArray(leadsData));
    console.log(`[DEBUG] leadsData keys:`, Object.keys(leadsData).join(', '));
    if (leadsData.message) {
      console.log(`[DEBUG] leadsData message:`, leadsData.message);
    }
    
    const leads = leadsData.result || leadsData; // Handle both wrapped and unwrapped responses
    
    console.log(`[DEBUG] Fetched ${Array.isArray(leads) ? leads.length : 0} leads`);
    console.log(`[DEBUG] Date range: ${dates.startMs} to ${dates.endMs}`);
    
    // Build ad set mapping: id -> { name, calls: [emails], sales: [emails] }
    const adsetMap = {};
    
    if (Array.isArray(leads)) {
      let processedCount = 0;
      let skippedDateCount = 0;
      let skippedNoDataCount = 0;
      
      leads.forEach(lead => {
        const createdAt = new Date(lead.creationDate).getTime();
        
        // Only include leads from the selected date range
        if (createdAt < dates.startMs || createdAt > dates.endMs) {
          skippedDateCount++;
          return;
        }
        
        // Get ad set info from first touch (original source)
        const firstSource = lead.firstSource || {};
        const adsetId = firstSource.adSource?.adSourceId;
        // Use the campaign/ad set name from the source link
        const adsetName = firstSource.name || adsetId;
        const email = lead.email;
        
        if (!adsetId || !email) {
          skippedNoDataCount++;
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
        
        // Check tags in both lead and originLead
        const allTags = [
          ...(lead.tags || []),
          ...(lead.originLead?.tags || [])
        ];
        
        // Check if lead has booked a call
        const hasCall = allTags.some(tag => tag.includes('$booked-call'));
        
        if (hasCall) {
          adsetMap[adsetId].calls.push(email);
        }
        
        // Check for sales (adjust logic based on your sales indicators)
        const hasSale = allTags.some(tag => 
          tag.includes('$sale') || tag.includes('$purchase') || tag.includes('$customer')
        );
        
        if (hasSale) {
          adsetMap[adsetId].sales.push(email);
        }
      });
      
      console.log(`[DEBUG] Processed ${processedCount} leads, skipped ${skippedDateCount} (date range), ${skippedNoDataCount} (no data)`);
      console.log(`[DEBUG] Ad set map has ${Object.keys(adsetMap).length} entries`);
    }
    
    // Enhance attribution data with names and emails
    if (attrData.result) {
      attrData.result = attrData.result.map(adset => {
        const mapped = adsetMap[adset.id] || {};
        return {
          ...adset,
          name: mapped.name || adset.id,
          callEmails: mapped.calls || [],
          saleEmails: mapped.sales || []
        };
      });
    }
    
    console.log(`[${new Date().toISOString()}] Processed ${attrData.result?.length || 0} ad sets with email data`);
    
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
