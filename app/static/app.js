let chart;

function fmtCurrency(v){
  return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(v||0)
}

function qs(id){return document.getElementById(id)}

async function run(){
  const start = qs('f-start').value
  const end = qs('f-end').value
  const platform = qs('f-platform').value
  const campaign = qs('f-campaign').value
  const qualified = qs('f-qualified').value
  const booked = qs('f-booked').value

  const params = new URLSearchParams({start,end})
  if(platform) params.set('platform', platform)
  if(campaign) params.set('campaign', campaign)
  if(qualified) params.set('qualified', qualified)
  if(booked) params.set('booked_call', booked)

  const res = await fetch(`/api/dashboard?${params.toString()}`)
  const data = await res.json()

  const warn = qs('warning')
  warn.style.display = data.warning ? 'block':'none'
  warn.textContent = data.warning || ''

  // KPIs
  qs('kpi-sales').textContent = data.kpis?.total_sales ?? 0
  qs('kpi-rev').textContent = fmtCurrency(data.kpis?.total_revenue ?? 0)
  qs('kpi-qual').textContent = data.kpis?.qualified_count ?? 0
  qs('kpi-call').textContent = data.kpis?.booked_call_count ?? 0

  // Filters (platform/campaign options)
  const pSel = qs('f-platform');
  const cSel = qs('f-campaign');
  const keep = (el) => el.value === ''
  pSel.querySelectorAll('option').forEach(o=>{ if(!keep(o)) o.remove() })
  cSel.querySelectorAll('option').forEach(o=>{ if(!keep(o)) o.remove() })
  ;(data.platforms||[]).forEach(p=>{
    const o=document.createElement('option'); o.value=o.textContent=p; pSel.appendChild(o)
  })
  ;(data.campaigns||[]).forEach(c=>{
    const o=document.createElement('option'); o.value=o.textContent=c; cSel.appendChild(o)
  })

  // Trend chart
  const ctx = qs('trend').getContext('2d')
  const labels = (data.trend||[]).map(d=>d.date)
  const sales = (data.trend||[]).map(d=>d.sales)
  const revenue = (data.trend||[]).map(d=>d.revenue)
  if(chart) chart.destroy()
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {label:'Sales', data:sales, borderColor:'#38bdf8', backgroundColor:'rgba(56,189,248,0.15)'},
        {label:'Revenue', data:revenue, borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,0.15)', yAxisID:'y1'}
      ]
    },
    options:{
      responsive:true,
      scales:{ y:{ beginAtZero:true }, y1:{ beginAtZero:true, position:'right' } },
      plugins:{ legend:{labels:{color:'#e2e8f0'}}, tooltip:{} }
    }
  })

  // Table
  const tbody = document.querySelector('#results tbody')
  tbody.innerHTML = ''
  const appendCell = (tr, value) => {
    const td = document.createElement('td')
    td.textContent = value
    tr.appendChild(td)
  }
  (data.table||[]).forEach(row=>{
    const tr = document.createElement('tr')
    appendCell(tr, (row.created_at||'').replace('T',' ').slice(0,16))
    appendCell(tr, row.platform||'')
    appendCell(tr, row.campaign||'')
    appendCell(tr, row.customer||'')
    appendCell(tr, row.qualified ? 'Yes' : 'No')
    appendCell(tr, row.booked_call ? 'Yes' : 'No')
    appendCell(tr, fmtCurrency(row.amount||0))
    tbody.appendChild(tr)
  })
}

function defaultDates(){
  const end = new Date()
  const start = new Date(end.getTime() - 6*24*3600*1000)
  const fmt = d => d.toISOString().slice(0,10)
  qs('f-start').value = fmt(start)
  qs('f-end').value = fmt(end)
}

window.addEventListener('DOMContentLoaded', ()=>{
  defaultDates()
  qs('btn-run').addEventListener('click', run)
  run()
})
