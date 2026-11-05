const PAGE_SIZE = 6;
const state = { listings: [], filtered: [], page: 1, search: '', domain: 'all', level: 'all', workMode: 'all', sort: 'newest', timer: null };
const el = id => document.getElementById(id);
const grid = el('listingGrid');

async function loadListings() {
  showState('loading');
  try {
    const response = await fetch('data/listings.json');
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length < 12) throw new Error('Listing data is incomplete');
    state.listings = data;
    applyFilters();
  } catch (error) {
    console.error('Unable to load listings:', error);
    showState('error');
    el('resultCount').textContent = 'Listings unavailable';
  }
}
function showState(which) {
  ['loading','empty','error'].forEach(name => el(`${name}State`).hidden = name !== which);
  grid.hidden = which !== 'results';
  el('pageInfo').parentElement.hidden = which !== 'results';
}
function applyFilters() {
  const term = state.search.trim().toLowerCase();
  let results = state.listings.filter(item => {
    const searchable = [item.title,item.company,item.domain,item.level,item.workMode,item.location,item.description,...item.skills,...item.keywords].join(' ').toLowerCase();
    const matchesSearch = !term || searchable.includes(term);
    const matchesDomain = state.domain === 'all' || item.domain === state.domain;
    const matchesLevel = state.level === 'all' || item.level === state.level;
    const matchesMode = state.workMode === 'all' || item.workMode === state.workMode;
    return matchesSearch && matchesDomain && matchesLevel && matchesMode;
  });
  results.sort((a,b) => state.sort === 'az' ? a.title.localeCompare(b.title) : new Date(b.posted) - new Date(a.posted));
  state.filtered = results;
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  el('resultCount').textContent = `${results.length} ${results.length === 1 ? 'opportunity' : 'opportunities'} found`;
  if (!results.length) { showState('empty'); return; }
  showState('results');
  renderPage();
}
function renderPage() {
  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = state.filtered.slice(start, start + PAGE_SIZE);
  grid.innerHTML = pageItems.map(item => `
    <article class="listing-card">
      <div class="card-top"><span class="company-mark" aria-hidden="true">${escapeHTML(item.company.charAt(0))}</span><span class="tag">${escapeHTML(item.domain)}</span></div>
      <h3>${escapeHTML(item.title)}</h3><p class="company">${escapeHTML(item.company)}</p>
      <div class="card-bottom"><div class="card-details"><span>${escapeHTML(item.level)}</span><span>· ${escapeHTML(item.workMode)}</span><span>· ${escapeHTML(item.location)}</span></div><span class="card-arrow" aria-hidden="true">↗</span></div>
    </article>`).join('');
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
  el('pageInfo').textContent = `Page ${state.page} of ${totalPages}`;
  el('prevPage').disabled = state.page === 1;
  el('nextPage').disabled = state.page === totalPages;
}
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function debounceSearch(value) {
  clearTimeout(state.timer);
  state.timer = setTimeout(() => { state.search = value; state.page = 1; applyFilters(); }, 250);
}
function resetFilters() {
  state.search = ''; state.domain = 'all'; state.level = 'all'; state.workMode = 'all'; state.sort = 'newest'; state.page = 1;
  el('searchInput').value = ''; el('domainFilter').value = 'all'; el('levelFilter').value = 'all'; el('remoteFilter').value = 'all'; el('sortSelect').value = 'newest';
  applyFilters();
}
el('searchInput').addEventListener('input', event => debounceSearch(event.target.value));
el('domainFilter').addEventListener('change', event => { state.domain = event.target.value; state.page = 1; applyFilters(); });
el('levelFilter').addEventListener('change', event => { state.level = event.target.value; state.page = 1; applyFilters(); });
el('remoteFilter').addEventListener('change', event => { state.workMode = event.target.value; state.page = 1; applyFilters(); });
el('sortSelect').addEventListener('change', event => { state.sort = event.target.value; state.page = 1; applyFilters(); });
el('clearFilters').addEventListener('click', resetFilters);
el('resetEmpty').addEventListener('click', resetFilters);
el('retryButton').addEventListener('click', loadListings);
el('prevPage').addEventListener('click', () => { if (state.page > 1) { state.page--; renderPage(); } });
el('nextPage').addEventListener('click', () => { const pages = Math.ceil(state.filtered.length / PAGE_SIZE); if (state.page < pages) { state.page++; renderPage(); } });
document.addEventListener('keydown', event => { if (event.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); el('searchInput').focus(); } });
loadListings();
