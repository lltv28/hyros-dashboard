# Debug Summary - Expandable Ads Issue

**Date:** 2026-03-04 23:30 UTC  
**Commit:** 56e67cd  
**Status:** Debug instrumentation deployed, awaiting test results

## Problem
Ad rows don't appear when clicking adset names with expand arrows.

## Changes Deployed

### 1. Enhanced Debug Logging (Commit 1318926)
Added comprehensive logging to `toggleAdset()` function:
- Logs adset ID and type
- Logs the selector string being used
- Logs number of matching rows found
- If no rows found:
  - Lists all ad rows in document
  - Shows their parent-id attributes
  - Checks for exact matches manually
- Logs CSS computed display property before/after toggle
- Logs icon class changes

### 2. Console Debug Helper (Commit 3131fb8)
Added `window.debugAdRows()` function callable from browser console:
```javascript
window.debugAdRows()
```
Shows:
- Count of adset and ad rows
- Parent IDs of all ad rows
- Adset IDs with onclick handlers
- Instructions for manual testing

### 3. Isolated Test Page (Commit 56e67cd)
Created standalone test at:
**https://hyros-dashboard.onrender.com/test-toggle.html**

Minimal reproduction with same HTML structure and toggle logic.
If this works but main page doesn't, helps isolate the issue.

## Testing Instructions

### Test 1: Main Dashboard
1. Open https://hyros-dashboard.onrender.com
2. Select "Yesterday" date range
3. Open browser console (F12)
4. Run: `window.debugAdRows()`
5. Note the output (# of adset rows, # of ad rows, parent IDs)
6. Click an adset name with an arrow (▶)
7. Check console for toggle debug output
8. Report findings:
   - Did the toggle function fire?
   - Were ad rows found?
   - What was the "display" property before/after?
   - Did any ads become visible?

### Test 2: Isolated Test Page
1. Open https://hyros-dashboard.onrender.com/test-toggle.html
2. Open console
3. Click "Test Adset 1" or "Test Adset 2"
4. Check if ads expand/collapse
5. Run `window.debugAdRows()`
6. Compare results with main page

## Code Review

The logic appears correct:
```javascript
// HTML generation
<tr class="adset-row" data-adset-id="${adset.id}">
    <div class="adset-name" onclick="toggleAdset('${adset.id}')">
        <span class="expand-icon" id="icon-${adset.id}">▶</span>

<tr class="ad-row" data-parent-id="${adset.id}">

// CSS
.ad-row { display: none; }
.ad-row.visible { display: table-row; }

// JavaScript
const adRows = document.querySelectorAll(`.ad-row[data-parent-id="${adsetId}"]`);
row.classList.add('visible');
```

## Possible Issues to Check

1. **JavaScript Error**: If there's an error before `toggleAdset` runs, it might not fire
   - Check console for any errors on page load

2. **Selector Mismatch**: If parent-id doesn't match adset ID
   - Debug logging will show this

3. **CSS Specificity**: If another rule overrides `.ad-row.visible`
   - Debug logging shows computed display property

4. **API Data Issue**: If ads array is empty or structured differently
   - Debug helper shows actual row counts

5. **Browser Caching**: Old code might be cached
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

## Next Steps

Based on console output:
- If toggle doesn't fire → onclick binding issue
- If no rows found → selector/ID mismatch issue
- If rows found but display stays "none" → CSS specificity issue
- If test page works but main doesn't → data/rendering issue on main page

## Files Modified

- `public/index.html` - synced with v2
- `public/index-v2.html` - enhanced toggleAdset() + debug helper
- `public/test-toggle.html` - NEW isolated test page

## Deployment

All changes pushed to main and deployed to Render.
Test URLs are live and ready for debugging.
