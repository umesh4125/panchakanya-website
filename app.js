const API = '';
let state = {
  rates: {},
  products: [],
  dashboard: {},
  fuelProduct: 'Petrol',
  importFuelProduct: 'Petrol',
  importType: 'fuel',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ` ${type}` : '');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || 'Request failed');
  return data;
}

function fmt(n) {
  if (n == null || isNaN(n)) return '0.00';
  return Number(n).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function showPage(id) {
  $$('.page').forEach((p) => p.classList.remove('active'));
  $(`#page-${id}`).classList.add('active');
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.page === id));
}

async function checkHealth() {
  try {
    const h = await api('/api/health');
    $('#status-text').textContent = h.excel_linked ? 'Excel Connected' : 'Excel Files Missing';
    $('.status-dot').classList.toggle('offline', !h.excel_linked);
    if (h.mobile_url) $('#mobile-url').textContent = h.mobile_url;
    return true;
  } catch {
    $('#status-text').textContent = 'Server Offline';
    $('.status-dot').classList.add('offline');
    return false;
  }
}

async function loadRates() {
  state.rates = await api('/api/rates');
  $('#rate-petrol').textContent = fmt(state.rates.pump_petrol) + ' NRs';
  $('#rate-diesel').textContent = fmt(state.rates.pump_diesel) + ' NRs';
  $('#rate-noc-petrol').textContent = 'NOC: ' + fmt(state.rates.noc_petrol);
  $('#rate-noc-diesel').textContent = 'NOC: ' + fmt(state.rates.noc_diesel);
  $('#rate-date').textContent = state.rates.effective_date_bs || '';
  updateFuelPreview();
}

async function loadDashboard() {
  const fd = $('#filter-from').value || today();
  const td = $('#filter-to').value || today();
  state.dashboard = await api(`/api/dashboard?from_date=${fd}&to_date=${td}`);
  const d = state.dashboard;
  $('#kpi-fuel-rev').textContent = fmt(d.fuel_revenue);
  $('#kpi-lub-rev').textContent = fmt(d.lubricant_revenue);
  $('#kpi-total').textContent = fmt(d.total_revenue);
  $('#kpi-petrol').textContent = fmt(d.petrol_liters) + ' L';
  $('#kpi-diesel').textContent = fmt(d.diesel_liters) + ' L';
  $('#kpi-trans').textContent = d.fuel_transactions + d.lubricant_transactions;
  renderRecentSales('recent-fuel', d.recent_fuel, 'fuel');
  renderRecentSales('recent-lub', d.recent_lubricant, 'lub');
}

function renderRecentSales(id, sales, type) {
  const el = document.getElementById(id);
  if (!sales || !sales.length) {
    el.innerHTML = '<div class="empty">No sales in this period</div>';
    return;
  }
  el.innerHTML = sales.map((s) => {
    const title = type === 'fuel' ? `${s.product} — ${fmt(s.quantity)} L` : `${s.item_code} × ${s.quantity}`;
    const meta = `${s.date || ''} · ${s.payment || 'Cash'}`;
    const amt = s.amount ? fmt(s.amount) : '—';
    return `<div class="sale-item"><div class="info"><div class="title">${title}</div><div class="meta">${meta}</div></div><div class="amt">${amt}</div></div>`;
  }).join('');
}

async function loadProducts() {
  state.products = await api('/api/products');
  const sel = $('#lub-item');
  sel.innerHTML = '<option value="">Select item...</option>' +
    state.products.map((p) =>
      `<option value="${p.code}" data-price="${p.selling_price}">${p.code} — ${p.name} (${fmt(p.selling_price)} NRs)</option>`
    ).join('');
  const importSel = $('#import-lub-item');
  if (importSel) {
    importSel.innerHTML = '<option value="">Select item...</option>' +
      state.products.map((p) =>
        `<option value="${p.code}" data-purchase="${p.purchase_price}" data-unit="${p.unit}">${p.code} — ${p.name}</option>`
      ).join('');
  }
  updateLubPreview();
}

async function loadInventory() {
  const inv = await api('/api/inventory');
  const lubEl = $('#inv-lubricants');
  if (!inv.lubricants.length) {
    lubEl.innerHTML = '<div class="empty">No inventory data</div>';
  } else {
    lubEl.innerHTML = inv.lubricants.map((i) =>
      `<div class="inv-item"><div><strong>${i.name}</strong><br><span style="font-size:.72rem;color:#757575">${i.category}${i.purchased > 0 ? ' · +' + fmt(i.purchased) + ' imported' : ''}</span></div><div><span class="stock">${fmt(i.closing)} ${i.unit}</span><br><span class="badge ${i.status === 'LOW STOCK' ? 'low' : 'ok'}">${i.status}</span></div></div>`
    ).join('');
  }
  const fuelEl = $('#inv-fuel');
  if (!inv.fuel.length) {
    fuelEl.innerHTML = '<div class="empty">No fuel inventory entries yet</div>';
  } else {
    fuelEl.innerHTML = inv.fuel.slice(-5).reverse().map((i) =>
      `<div class="inv-item"><div><strong>${i.product}</strong><br><span style="font-size:.72rem;color:#757575">${i.date || ''}${i.received > 0 ? ' · +' + fmt(i.received) + ' L imported' : ''}</span></div><div class="stock">${fmt(i.closing)} L</div></div>`
    ).join('');
  }
}

async function loadImports() {
  const data = await api('/api/imports?limit=10');
  const el = $('#recent-imports');
  const all = [
    ...data.fuel.map((i) => ({ ...i, sort: i.date + 'f' })),
    ...data.lubricants.map((i) => ({ ...i, sort: i.date + 'l' })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10);

  if (!all.length) {
    el.innerHTML = '<div class="empty">No imports recorded yet</div>';
    return;
  }
  el.innerHTML = all.map((i) => {
    if (i.type === 'fuel') {
      return `<div class="sale-item"><div class="info"><div class="title">⛽ ${i.product} +${fmt(i.quantity)} L</div><div class="meta">${i.date} · ${i.supplier || 'NOC'}</div></div><div class="amt">${i.invoice_no || '—'}</div></div>`;
    }
    return `<div class="sale-item"><div class="info"><div class="title">🛢️ ${i.item_code} +${fmt(i.quantity)}</div><div class="meta">${i.date} · ${i.supplier || ''}</div></div><div class="amt">${i.invoice_no || '—'}</div></div>`;
  }).join('');
}

function updateFuelImportPreview() {
  const qty = parseFloat($('#fuel-import-qty').value) || 0;
  $('#fuel-import-preview').textContent = fmt(qty) + ' L';
}

function updateLubImportPreview() {
  const qty = parseFloat($('#lub-import-qty').value) || 0;
  const opt = $('#import-lub-item').selectedOptions[0];
  const unit = opt ? opt.dataset.unit || 'units' : 'units';
  $('#lub-import-preview').textContent = fmt(qty) + ' ' + unit;
}

function setImportType(type) {
  state.importType = type;
  $$('.import-type-btn').forEach((b) => b.classList.toggle('active', b.dataset.type === type));
  $('#import-fuel-panel').style.display = type === 'fuel' ? 'block' : 'none';
  $('#import-lub-panel').style.display = type === 'lubricant' ? 'block' : 'none';
}

async function submitFuelImport(e) {
  e.preventDefault();
  const btn = $('#fuel-import-submit');
  btn.disabled = true;
  try {
    const res = await api('/api/imports/fuel', {
      method: 'POST',
      body: JSON.stringify({
        product: state.importFuelProduct,
        quantity: parseFloat($('#fuel-import-qty').value),
        date: $('#fuel-import-date').value || today(),
        invoice_no: $('#fuel-import-invoice').value,
        supplier: $('#fuel-import-supplier').value || 'NOC / Depot',
        remarks: $('#fuel-import-remarks').value,
      }),
    });
    toast(res.message || 'Import saved!', 'success');
    $('#fuel-import-qty').value = '';
    $('#fuel-import-invoice').value = '';
    updateFuelImportPreview();
    await loadImports();
    await loadInventory();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function submitLubImport(e) {
  e.preventDefault();
  const btn = $('#lub-import-submit');
  btn.disabled = true;
  try {
    const cost = parseFloat($('#lub-import-cost').value);
    const res = await api('/api/imports/lubricants', {
      method: 'POST',
      body: JSON.stringify({
        item_code: $('#import-lub-item').value,
        quantity: parseFloat($('#lub-import-qty').value),
        date: $('#lub-import-date').value || today(),
        invoice_no: $('#lub-import-invoice').value,
        supplier: $('#lub-import-supplier').value,
        unit_cost: isNaN(cost) ? 0 : cost,
        remarks: $('#lub-import-remarks').value,
      }),
    });
    toast(res.message || 'Import saved!', 'success');
    $('#lub-import-qty').value = '';
    $('#lub-import-invoice').value = '';
    updateLubImportPreview();
    await loadImports();
    await loadInventory();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

function updateFuelPreview() {
  const qty = parseFloat($('#fuel-qty').value) || 0;
  const rate = state.fuelProduct === 'Petrol' ? state.rates.pump_petrol : state.rates.pump_diesel;
  $('#fuel-preview').textContent = fmt(qty * (rate || 0)) + ' NRs';
}

function updateLubPreview() {
  const sel = $('#lub-item');
  const opt = sel.selectedOptions[0];
  const price = opt ? parseFloat(opt.dataset.price) || 0 : 0;
  const qty = parseFloat($('#lub-qty').value) || 0;
  $('#lub-preview').textContent = fmt(qty * price) + ' NRs';
}

async function submitFuelSale(e) {
  e.preventDefault();
  const btn = $('#fuel-submit');
  btn.disabled = true;
  try {
    const res = await api('/api/sales/fuel', {
      method: 'POST',
      body: JSON.stringify({
        product: state.fuelProduct,
        quantity: parseFloat($('#fuel-qty').value),
        date: $('#fuel-date').value || today(),
        bill_no: $('#fuel-bill').value,
        customer: $('#fuel-customer').value,
        payment: $('#fuel-payment').value,
        shift: $('#fuel-shift').value,
        remarks: $('#fuel-remarks').value,
      }),
    });
    toast(res.message || 'Saved to Excel!', 'success');
    $('#fuel-qty').value = '';
    $('#fuel-bill').value = '';
    $('#fuel-customer').value = '';
    updateFuelPreview();
    await loadDashboard();
    await loadRates();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function submitLubSale(e) {
  e.preventDefault();
  const btn = $('#lub-submit');
  btn.disabled = true;
  try {
    const res = await api('/api/sales/lubricants', {
      method: 'POST',
      body: JSON.stringify({
        item_code: $('#lub-item').value,
        quantity: parseFloat($('#lub-qty').value),
        date: $('#lub-date').value || today(),
        bill_no: $('#lub-bill').value,
        customer: $('#lub-customer').value,
        payment: $('#lub-payment').value,
        remarks: $('#lub-remarks').value,
      }),
    });
    toast(res.message || 'Saved to Excel!', 'success');
    $('#lub-qty').value = '';
    updateLubPreview();
    await loadDashboard();
    await loadInventory();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function init() {
  $('#fuel-date').value = today();
  $('#lub-date').value = today();
  $('#fuel-import-date').value = today();
  $('#lub-import-date').value = today();
  $('#filter-from').value = today();
  $('#filter-to').value = today();

  $$('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      showPage(btn.dataset.page);
      if (btn.dataset.page === 'inventory') await loadInventory();
      if (btn.dataset.page === 'import') await loadImports();
      if (btn.dataset.page === 'more') return;
      if (btn.dataset.page === 'dashboard') await loadDashboard();
    });
  });

  $$('.import-type-btn').forEach((btn) => {
    btn.addEventListener('click', () => setImportType(btn.dataset.type));
  });

  $$('.import-fuel-prod').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.import-fuel-prod').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.importFuelProduct = btn.dataset.product;
      updateFuelImportPreview();
    });
  });

  $$('.product-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.product-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.fuelProduct = btn.dataset.product;
      updateFuelPreview();
    });
  });

  $('#fuel-form').addEventListener('submit', submitFuelSale);
  $('#lub-form').addEventListener('submit', submitLubSale);
  $('#fuel-import-form').addEventListener('submit', submitFuelImport);
  $('#lub-import-form').addEventListener('submit', submitLubImport);
  $('#fuel-qty').addEventListener('input', updateFuelPreview);
  $('#lub-qty').addEventListener('input', updateLubPreview);
  $('#lub-item').addEventListener('change', updateLubPreview);
  $('#fuel-import-qty').addEventListener('input', updateFuelImportPreview);
  $('#lub-import-qty').addEventListener('input', updateLubImportPreview);
  $('#import-lub-item').addEventListener('change', () => {
    const opt = $('#import-lub-item').selectedOptions[0];
    if (opt && opt.dataset.purchase) $('#lub-import-cost').placeholder = 'Default: ' + opt.dataset.purchase + ' NRs';
    updateLubImportPreview();
  });
  $('#filter-from').addEventListener('change', () => {
    syncResetDates($('#filter-from').value);
    loadDashboard();
  });
  $('#filter-to').addEventListener('change', loadDashboard);
  $('#refresh-btn').addEventListener('click', async () => {
    await refreshAll();
    toast('Data refreshed', 'success');
  });
  $('#reset-date').addEventListener('change', () => syncResetDates($('#reset-date').value));
  $('#reset-date-more').addEventListener('change', () => syncResetDates($('#reset-date-more').value));
  $('#reset-date-btn').addEventListener('click', () => handleResetDate('home'));
  $('#reset-date-more-btn').addEventListener('click', () => handleResetDate('more'));
  $('#reset-all-btn').addEventListener('click', handleResetAll);
  syncResetDates(today());

  const ok = await checkHealth();
  if (ok) {
    await refreshAll();
  } else {
    toast('Start the server on your PC first (START_APP.bat)', 'error');
  }
}

async function refreshAll() {
  await Promise.all([loadRates(), loadProducts(), loadDashboard()]);
}

function syncResetDates(value) {
  const d = value || today();
  $('#reset-date').value = d;
  $('#reset-date-more').value = d;
}

async function resetForDate(dateStr) {
  const res = await api('/api/reset/date', {
    method: 'POST',
    body: JSON.stringify({ date: dateStr }),
  });
  const n = res.deleted || {};
  const total = (n.fuel_sales || 0) + (n.lubricant_sales || 0)
    + (n.fuel_imports || 0) + (n.lubricant_purchases || 0);
  toast(res.message || `Cleared ${total} entries`, 'success');
  await refreshAll();
  if ($('#page-inventory').classList.contains('active')) await loadInventory();
  if ($('#page-import').classList.contains('active')) await loadImports();
}

async function handleResetDate(source) {
  const dateStr = source === 'more'
    ? ($('#reset-date-more').value || today())
    : ($('#reset-date').value || $('#filter-from').value || today());
  if (!confirm(`Delete ALL sales and imports for ${dateStr}?\n\nThis cannot be undone.`)) return;
  try {
    await resetForDate(dateStr);
    syncResetDates(dateStr);
    $('#filter-from').value = dateStr;
    $('#filter-to').value = dateStr;
    await loadDashboard();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function handleResetAll() {
  if (!confirm('Reset ALL sales, imports, and restore opening stock?\n\nThis clears every date and cannot be undone.')) return;
  if (!confirm('Are you sure? All transaction history will be deleted.')) return;
  try {
    const res = await api('/api/reset/all', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    });
    toast(res.message || 'All data reset', 'success');
    const d = res.date || today();
    syncResetDates(d);
    $('#filter-from').value = d;
    $('#filter-to').value = d;
    await refreshAll();
    await loadInventory();
  } catch (err) {
    toast(err.message, 'error');
  }
}

init();