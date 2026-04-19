/* ===========================
   Supabase
   =========================== */
const SUPABASE_URL = 'https://lbwjdleewjtlqhnjwzsn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxid2pkbGVld2p0bHFobmp3enNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODEyNzAsImV4cCI6MjA5MjE1NzI3MH0.U8D4EMaPwKNnDchYpUyHd1SoAVqhl4jmNmI53MIHWNY';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ===========================
   State
   =========================== */
let recentMovies = []; // آخر 5 فقط للعرض
let recentSeries = []; // آخر 5 فقط للعرض
let allMoviesForStats = []; // كل الأفلام للإحصائيات + picker + print
let allSeriesForStats = []; // كل المسلسلات

let movieSearchTimer = null;
let seriesSearchTimer = null;

/* ===========================
   DOM
   =========================== */
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

const moviesList = document.getElementById('movies-list');
const moviesCount = document.getElementById('movies-count');
const movieForm = document.getElementById('movie-form');
const movieIdInput = document.getElementById('movie-id');
const movieFormTitle = document.getElementById('movie-form-title');
const movieSubmitBtn = document.getElementById('movie-submit-btn');
const movieCancelEdit = document.getElementById('movie-cancel-edit');

const seriesList = document.getElementById('series-list');
const seriesCount = document.getElementById('series-count');
const seriesForm = document.getElementById('series-form');
const seriesIdInput = document.getElementById('series-id');
const seriesFormTitle = document.getElementById('series-form-title');
const seriesSubmitBtn = document.getElementById('series-submit-btn');
const seriesCancelEdit = document.getElementById('series-cancel-edit');

const movieSearch = document.getElementById('movie-search');
const filterGenre = document.getElementById('filter-genre');
const filterYear = document.getElementById('filter-year');
const filterMinRating = document.getElementById('filter-min-rating');
const filterStatus = document.getElementById('filter-status');
const sortMovies = document.getElementById('sort-movies');
const clearMovieFiltersBtn = document.getElementById('clear-movie-filters');
const printMovieFiltersBtn = document.getElementById('print-movie-filters');
const printLimitSelect = document.getElementById('print-limit');

const seriesSearch = document.getElementById('series-search');
const filterSeriesYear = document.getElementById('filter-series-year');
const filterSeriesMinRating = document.getElementById('filter-series-min-rating');
const filterSeriesRewatch = document.getElementById('filter-series-rewatch');
const sortSeries = document.getElementById('sort-series');
const clearSeriesFiltersBtn = document.getElementById('clear-series-filters');

const movieNightBtn = document.getElementById('movie-night-btn');
const movieNightResult = document.getElementById('movie-night-result');

const statTotal = document.getElementById('stat-total');
const statTopGenre = document.getElementById('stat-top-genre');
const statAvgRating = document.getElementById('stat-avg-rating');
const statTopYear = document.getElementById('stat-top-year');
const statThisMonth = document.getElementById('stat-this-month');

const themeToggle = document.getElementById('theme-toggle');
const accentPicker = document.getElementById('accent-picker');

/* ===========================
   Helpers
   =========================== */
function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove('show'), 2200);
}
function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
function formatRating(num) {
  const n = Math.round(Number(num) * 100) / 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
function getRatingClass(rating) {
  if (rating >= 70) return 'rating-high';
  if (rating >= 40) return 'rating-mid';
  return 'rating-low';
}
function validYear(y) {
  const maxY = new Date().getFullYear() + 5;
  return Number.isInteger(y) && y >= 1900 && y <= maxY;
}
function validRating(r) {
  return Number.isFinite(r) && r >= 0 && r <= 100;
}
function statusLabel(status) {
  if (status === 'watched') return 'Watched';
  if (status === 'watching') return 'Watching';
  return 'Plan';
}
function statusClass(status) {
  if (status === 'watched') return 'status-watched';
  if (status === 'watching') return 'status-watching';
  return 'status-plan';
}

/* ===========================
   Theme
   =========================== */
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  const savedAccent = localStorage.getItem('accent') || '#d4a843';

  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.body.classList.remove('light-theme');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }

  document.documentElement.style.setProperty('--accent', savedAccent);
  accentPicker.value = savedAccent;
}
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light-theme');
  const light = document.body.classList.contains('light-theme');
  localStorage.setItem('theme', light ? 'light' : 'dark');
  themeToggle.innerHTML = light ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});
accentPicker.addEventListener('input', (e) => {
  document.documentElement.style.setProperty('--accent', e.target.value);
  localStorage.setItem('accent', e.target.value);
});

/* ===========================
   Tabs
   =========================== */
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tabContents.forEach((c) => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-section`).classList.add('active');
  });
});

/* ===========================
   Fetch all with pagination
   =========================== */
async function fetchAllRows(tableName, orderColumn = 'created_at') {
  const pageSize = 1000;
  let from = 0;
  let to = pageSize - 1;
  let done = false;
  let rows = [];

  while (!done) {
    const { data, error } = await db
      .from(tableName)
      .select('*')
      .order(orderColumn, { ascending: false })
      .range(from, to);

    if (error) throw error;

    rows = rows.concat(data || []);
    if (!data || data.length < pageSize) {
      done = true;
    } else {
      from += pageSize;
      to += pageSize;
    }
  }
  return rows;
}

/* ===========================
   Load data
   =========================== */
async function loadMoviesRecent() {
  moviesList.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin fa-3x"></i><p>جاري تحميل الأفلام...</p></div>';

  const { data, error } = await db
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error(error);
    showToast('خطأ في تحميل آخر الأفلام', 'error');
    moviesList.innerHTML = '';
    return;
  }

  recentMovies = data || [];
  renderMovies();
}

async function loadSeriesRecent() {
  seriesList.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin fa-3x"></i><p>جاري تحميل المسلسلات...</p></div>';

  const { data, error } = await db
    .from('series')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error(error);
    showToast('خطأ في تحميل آخر المسلسلات', 'error');
    seriesList.innerHTML = '';
    return;
  }

  recentSeries = data || [];
  renderSeries();
}

async function loadStatsData() {
  try {
    allMoviesForStats = await fetchAllRows('movies', 'created_at');
    allSeriesForStats = await fetchAllRows('series', 'created_at');
    updateDashboard();
  } catch (error) {
    console.error(error);
    showToast('تعذر تحميل إحصائيات كاملة', 'error');
  }
}

/* ===========================
   Filters movies
   =========================== */
function applyMovieFilters(arr) {
  let result = [...arr];

  const q = movieSearch.value.trim().toLowerCase();
  const g = filterGenre.value;
  const y = Number(filterYear.value);
  const minR = Number(filterMinRating.value);
  const st = filterStatus.value;
  const sort = sortMovies.value;

  if (q) result = result.filter((m) => (m.title || '').toLowerCase().includes(q));
  if (g) result = result.filter((m) => m.genre === g);
  if (filterYear.value) result = result.filter((m) => Number(m.year) === y);
  if (filterMinRating.value) result = result.filter((m) => Number(m.rating) >= minR);
  if (st) result = result.filter((m) => (m.status || 'watched') === st);

  switch (sort) {
    case 'rating_desc': result.sort((a, b) => Number(b.rating) - Number(a.rating)); break;
    case 'year_desc': result.sort((a, b) => Number(b.year) - Number(a.year)); break;
    case 'year_asc': result.sort((a, b) => Number(a.year) - Number(b.year)); break;
    case 'title_asc': result.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
    default: result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return result;
}

/* نفس فلترة الأفلام لكن على كل البيانات (للطباعة) */
function applyMovieFiltersOnAll(arr) {
  let result = [...arr];

  const q = movieSearch.value.trim().toLowerCase();
  const g = filterGenre.value;
  const y = Number(filterYear.value);
  const minR = Number(filterMinRating.value);
  const st = filterStatus.value;

  if (q) result = result.filter((m) => (m.title || '').toLowerCase().includes(q));
  if (g) result = result.filter((m) => m.genre === g);
  if (filterYear.value) result = result.filter((m) => Number(m.year) === y);
  if (filterMinRating.value) result = result.filter((m) => Number(m.rating) >= minR);
  if (st) result = result.filter((m) => (m.status || 'watched') === st);

  return result;
}

function renderMovies() {
  const filtered = applyMovieFilters(recentMovies);
  moviesCount.textContent = filtered.length;

  if (!filtered.length) {
    moviesList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-film fa-3x"></i>
        <p>لا يوجد نتائج ضمن آخر 5 أفلام</p>
      </div>
    `;
    return;
  }

  moviesList.innerHTML = filtered.map((m) => {
    const rewatch = m.rewatch === true || m.rewatch === 'true';
    return `
      <div class="item-card">
        <div class="item-rating ${getRatingClass(m.rating)}">${formatRating(m.rating)}</div>
        <div class="item-info">
          <div class="item-title">${escapeHtml(m.title)}</div>
          <div class="item-meta">
            <span><i class="fas fa-calendar"></i> ${m.year}</span>
            <span class="genre-badge">${escapeHtml(m.genre || 'Other')}</span>
            <span class="status-pill ${statusClass(m.status || 'watched')}">${statusLabel(m.status || 'watched')}</span>
            ${m.runtime ? `<span><i class="fas fa-clock"></i> ${m.runtime} د</span>` : ''}
            <span class="${rewatch ? 'rewatch-yes' : 'rewatch-no'}">${rewatch ? '✅ إعادة مشاهدة' : '❌ لا يُعاد'}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn-icon" onclick="editMovie(${m.id})" title="تعديل"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" onclick="deleteMovie(${m.id})" title="حذف"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

/* ===========================
   Print filtered movies
   =========================== */
function printFilteredMovies() {
  let filtered = applyMovieFiltersOnAll(allMoviesForStats || []);

  if (!filtered.length) {
    showToast('لا توجد نتائج للطباعة حسب الفلاتر الحالية', 'error');
    return;
  }

  const limitValue = printLimitSelect ? printLimitSelect.value : 'all';
  const isTopMode = limitValue !== 'all';
  const limit = isTopMode ? Number(limitValue) : null;

  if (isTopMode) {
    // أفضل أفلام حسب التقييم ثم الاسم
    filtered = filtered
      .sort((a, b) => {
        const r = Number(b.rating) - Number(a.rating);
        if (r !== 0) return r;
        return (a.title || '').localeCompare((b.title || ''), 'en', { sensitivity: 'base' });
      })
      .slice(0, limit);
  } else {
    // طباعة الكل أبجديًا
    filtered = filtered.sort((a, b) =>
      (a.title || '').localeCompare((b.title || ''), 'en', { sensitivity: 'base' })
    );
  }

  const modeLabel = isTopMode ? `أفضل ${limit} حسب التقييم` : 'طباعة الكل (أبجدي)';
  const filtersSummary = `
    النمط: ${escapeHtml(modeLabel)} |
    السنة: ${escapeHtml(filterYear.value || 'الكل')} |
    النوع: ${escapeHtml(filterGenre.value || 'الكل')} |
    الحالة: ${escapeHtml(filterStatus.value || 'الكل')} |
    أعلى من تقييم: ${escapeHtml(filterMinRating.value || 'بدون')} |
    بحث: ${escapeHtml(movieSearch.value || 'بدون')}
  `;

  const rows = filtered.map((m, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(m.title || '')}</td>
      <td>${m.year ?? '-'}</td>
      <td>${escapeHtml(m.genre || '-')}</td>
      <td>${statusLabel(m.status || 'watched')}</td>
      <td>${formatRating(m.rating)}</td>
      <td>${(m.rewatch === true || m.rewatch === 'true') ? '✅ نعم' : '❌ لا'}</td>
    </tr>
  `).join('');

  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (!printWindow) {
    showToast('المتصفح منع فتح نافذة الطباعة', 'error');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>طباعة الأفلام المفلترة</title>
      <style>
        body { font-family: Tahoma, Arial, sans-serif; padding: 22px; color: #111; }
        h1 { margin: 0 0 6px; font-size: 22px; }
        .meta { color: #444; margin-bottom: 12px; font-size: 13px; line-height: 1.7; }
        .count { margin: 8px 0 12px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #888; padding: 8px; font-size: 12px; text-align: center; }
        th { background: #f1f1f1; }
      </style>
    </head>
    <body>
      <h1>قائمة الأفلام المفلترة</h1>
      <div class="meta">${filtersSummary}</div>
      <div class="count">عدد النتائج المطبوعة: ${filtered.length}</div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>اسم الفيلم</th>
            <th>السنة</th>
            <th>النوع</th>
            <th>الحالة</th>
            <th>تقييمي</th>
            <th>إعادة مشاهدة</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/* ===========================
   Filters series
   =========================== */
function applySeriesFilters(arr) {
  let result = [...arr];

  const q = seriesSearch.value.trim().toLowerCase();
  const y = Number(filterSeriesYear.value);
  const minR = Number(filterSeriesMinRating.value);
  const rw = filterSeriesRewatch.value;
  const sort = sortSeries.value;

  if (q) result = result.filter((s) => (s.title || '').toLowerCase().includes(q));
  if (filterSeriesYear.value) result = result.filter((s) => Number(s.year) === y);
  if (filterSeriesMinRating.value) result = result.filter((s) => Number(s.rating) >= minR);
  if (rw) result = result.filter((s) => String(s.rewatch === true || s.rewatch === 'true') === rw);

  switch (sort) {
    case 'rating_desc': result.sort((a, b) => Number(b.rating) - Number(a.rating)); break;
    case 'year_desc': result.sort((a, b) => Number(b.year) - Number(a.year)); break;
    case 'year_asc': result.sort((a, b) => Number(a.year) - Number(b.year)); break;
    case 'title_asc': result.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
    default: result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return result;
}

function renderSeries() {
  const filtered = applySeriesFilters(recentSeries);
  seriesCount.textContent = filtered.length;

  if (!filtered.length) {
    seriesList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-tv fa-3x"></i>
        <p>لا يوجد نتائج ضمن آخر 5 مسلسلات</p>
      </div>
    `;
    return;
  }

  seriesList.innerHTML = filtered.map((s) => {
    const rewatch = s.rewatch === true || s.rewatch === 'true';
    const seasonWord = Number(s.seasons) === 1 ? 'موسم' : 'مواسم';
    return `
      <div class="item-card">
        <div class="item-rating ${getRatingClass(s.rating)}">${formatRating(s.rating)}</div>
        <div class="item-info">
          <div class="item-title">${escapeHtml(s.title)}</div>
          <div class="item-meta">
            <span><i class="fas fa-calendar"></i> ${s.year}</span>
            <span><i class="fas fa-layer-group"></i> ${s.seasons} ${seasonWord}</span>
            <span class="${rewatch ? 'rewatch-yes' : 'rewatch-no'}">${rewatch ? '✅ إعادة مشاهدة' : '❌ لا يُعاد'}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn-icon" onclick="editSeries(${s.id})" title="تعديل"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" onclick="deleteSeries(${s.id})" title="حذف"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

/* ===========================
   Dashboard
   =========================== */
function updateDashboard() {
  const movies = allMoviesForStats || [];
  const series = allSeriesForStats || [];

  statTotal.textContent = movies.length + series.length;

  const genreMap = {};
  movies.forEach((m) => {
    const g = m.genre || 'Other';
    genreMap[g] = (genreMap[g] || 0) + 1;
  });
  statTopGenre.textContent = Object.keys(genreMap).sort((a, b) => genreMap[b] - genreMap[a])[0] || '-';

  const ratings = [...movies, ...series]
    .map((x) => Number(x.rating))
    .filter((x) => Number.isFinite(x));
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  statAvgRating.textContent = formatRating(avg);

  const yearMap = {};
  movies.forEach((m) => {
    const y = Number(m.year);
    if (Number.isInteger(y)) yearMap[y] = (yearMap[y] || 0) + 1;
  });
  statTopYear.textContent = Object.keys(yearMap).sort((a, b) => yearMap[b] - yearMap[a])[0] || '-';

  const now = new Date();
  const all = [...movies, ...series];
  const monthly = all.filter((x) => {
    if (!x.created_at) return false;
    const d = new Date(x.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  statThisMonth.textContent = monthly;
}

/* ===========================
   Duplicate checks
   =========================== */
async function isDuplicateMovie(title, year, excludeId = null) {
  let q = db.from('movies').select('id').eq('title', title).eq('year', year).limit(1);
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) return false;
  return data.length > 0;
}
async function isDuplicateSeries(title, year, excludeId = null) {
  let q = db.from('series').select('id').eq('title', title).eq('year', year).limit(1);
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) return false;
  return data.length > 0;
}

/* ===========================
   Movies CRUD
   =========================== */
movieForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = movieIdInput.value ? Number(movieIdInput.value) : null;
  const title = document.getElementById('movie-title').value.trim();
  const year = parseInt(document.getElementById('movie-year').value, 10);
  const genre = document.getElementById('movie-genre').value;
  const rating = parseFloat(document.getElementById('movie-rating').value);
  const status = document.getElementById('movie-status').value;
  const rewatch = document.getElementById('movie-rewatch').value === 'true';
  const runtimeRaw = document.getElementById('movie-runtime').value.trim();
  const runtime = runtimeRaw ? parseInt(runtimeRaw, 10) : null;

  if (!title) return showToast('اسم الفيلم مطلوب', 'error');
  if (!validYear(year)) return showToast('سنة غير صالحة', 'error');
  if (!genre) return showToast('اختر النوع', 'error');
  if (!validRating(rating)) return showToast('التقييم يجب يكون بين 0 و 100', 'error');
  if (runtime !== null && (!Number.isInteger(runtime) || runtime < 1 || runtime > 400)) {
    return showToast('مدة الفيلم غير صحيحة', 'error');
  }

  const duplicate = await isDuplicateMovie(title, year, id);
  if (duplicate) return showToast('الفيلم موجود مسبقًا بنفس الاسم والسنة', 'error');

  if (id) {
    const { error } = await db.from('movies').update({ title, year, genre, rating, status, rewatch, runtime }).eq('id', id);
    if (error) return showToast('فشل التحديث', 'error');
    showToast('تم تحديث الفيلم', 'success');
  } else {
    const { error } = await db.from('movies').insert([{ title, year, genre, rating, status, rewatch, runtime }]);
    if (error) return showToast('فشل الإضافة', 'error');
    showToast('تمت إضافة الفيلم', 'success');
  }

  resetMovieForm();
  await Promise.all([loadMoviesRecent(), loadStatsData()]);
});

async function editMovie(id) {
  const { data, error } = await db.from('movies').select('*').eq('id', id).single();
  if (error || !data) return showToast('تعذر تحميل بيانات الفيلم للتعديل', 'error');

  movieIdInput.value = data.id;
  document.getElementById('movie-title').value = data.title || '';
  document.getElementById('movie-year').value = data.year || '';
  document.getElementById('movie-genre').value = data.genre || '';
  document.getElementById('movie-rating').value = data.rating ?? '';
  document.getElementById('movie-status').value = data.status || 'watched';
  document.getElementById('movie-rewatch').value = String(data.rewatch === true || data.rewatch === 'true');
  document.getElementById('movie-runtime').value = data.runtime || '';

  movieFormTitle.textContent = 'تعديل فيلم';
  movieSubmitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديل';
  movieCancelEdit.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.editMovie = editMovie;

movieCancelEdit.addEventListener('click', resetMovieForm);
function resetMovieForm() {
  movieForm.reset();
  movieIdInput.value = '';
  movieFormTitle.textContent = 'إضافة فيلم جديد';
  movieSubmitBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة الفيلم';
  movieCancelEdit.hidden = true;
  document.getElementById('movie-status').value = 'watched';
  document.getElementById('movie-rewatch').value = 'true';
}

async function deleteMovie(id) {
  const { error } = await db.from('movies').delete().eq('id', id);
  if (error) return showToast('فشل حذف الفيلم', 'error');
  showToast('تم حذف الفيلم', 'success');
  await Promise.all([loadMoviesRecent(), loadStatsData()]);
}
window.deleteMovie = deleteMovie;

/* ===========================
   Series CRUD
   =========================== */
seriesForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = seriesIdInput.value ? Number(seriesIdInput.value) : null;
  const title = document.getElementById('series-title').value.trim();
  const year = parseInt(document.getElementById('series-year').value, 10);
  const seasons = parseInt(document.getElementById('series-seasons').value, 10);
  const rating = parseFloat(document.getElementById('series-rating').value);
  const rewatch = document.getElementById('series-rewatch').value === 'true';

  if (!title) return showToast('اسم المسلسل مطلوب', 'error');
  if (!validYear(year)) return showToast('سنة غير صالحة', 'error');
  if (!Number.isInteger(seasons) || seasons < 1 || seasons > 100) return showToast('عدد المواسم غير صحيح', 'error');
  if (!validRating(rating)) return showToast('التقييم يجب يكون بين 0 و 100', 'error');

  const duplicate = await isDuplicateSeries(title, year, id);
  if (duplicate) return showToast('المسلسل موجود مسبقًا بنفس الاسم والسنة', 'error');

  if (id) {
    const { error } = await db.from('series').update({ title, year, seasons, rating, rewatch }).eq('id', id);
    if (error) return showToast('فشل التحديث', 'error');
    showToast('تم تحديث المسلسل', 'success');
  } else {
    const { error } = await db.from('series').insert([{ title, year, seasons, rating, rewatch }]);
    if (error) return showToast('فشل الإضافة', 'error');
    showToast('تمت إضافة المسلسل', 'success');
  }

  resetSeriesForm();
  await Promise.all([loadSeriesRecent(), loadStatsData()]);
});

async function editSeries(id) {
  const { data, error } = await db.from('series').select('*').eq('id', id).single();
  if (error || !data) return showToast('تعذر تحميل بيانات المسلسل للتعديل', 'error');

  seriesIdInput.value = data.id;
  document.getElementById('series-title').value = data.title || '';
  document.getElementById('series-year').value = data.year || '';
  document.getElementById('series-seasons').value = data.seasons || '';
  document.getElementById('series-rating').value = data.rating ?? '';
  document.getElementById('series-rewatch').value = String(data.rewatch === true || data.rewatch === 'true');

  seriesFormTitle.textContent = 'تعديل مسلسل';
  seriesSubmitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديل';
  seriesCancelEdit.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.editSeries = editSeries;

seriesCancelEdit.addEventListener('click', resetSeriesForm);
function resetSeriesForm() {
  seriesForm.reset();
  seriesIdInput.value = '';
  seriesFormTitle.textContent = 'إضافة مسلسل جديد';
  seriesSubmitBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة المسلسل';
  seriesCancelEdit.hidden = true;
  document.getElementById('series-rewatch').value = 'true';
}

async function deleteSeries(id) {
  const { error } = await db.from('series').delete().eq('id', id);
  if (error) return showToast('فشل حذف المسلسل', 'error');
  showToast('تم حذف المسلسل', 'success');
  await Promise.all([loadSeriesRecent(), loadStatsData()]);
}
window.deleteSeries = deleteSeries;

/* ===========================
   Bind filters
   =========================== */
function bindFilters() {
  movieSearch.addEventListener('input', () => {
    clearTimeout(movieSearchTimer);
    movieSearchTimer = setTimeout(renderMovies, 250);
  });

  [filterGenre, filterYear, filterMinRating, filterStatus, sortMovies].forEach((el) => {
    el.addEventListener('change', renderMovies);
    el.addEventListener('input', renderMovies);
  });

  clearMovieFiltersBtn.addEventListener('click', () => {
    movieSearch.value = '';
    filterGenre.value = '';
    filterYear.value = '';
    filterMinRating.value = '';
    filterStatus.value = '';
    sortMovies.value = 'latest_added';
    if (printLimitSelect) printLimitSelect.value = 'all';
    renderMovies();
  });

  if (printMovieFiltersBtn) {
    printMovieFiltersBtn.addEventListener('click', printFilteredMovies);
  }

  seriesSearch.addEventListener('input', () => {
    clearTimeout(seriesSearchTimer);
    seriesSearchTimer = setTimeout(renderSeries, 250);
  });

  [filterSeriesYear, filterSeriesMinRating, filterSeriesRewatch, sortSeries].forEach((el) => {
    el.addEventListener('change', renderSeries);
    el.addEventListener('input', renderSeries);
  });

  clearSeriesFiltersBtn.addEventListener('click', () => {
    seriesSearch.value = '';
    filterSeriesYear.value = '';
    filterSeriesMinRating.value = '';
    filterSeriesRewatch.value = '';
    sortSeries.value = 'latest_added';
    renderSeries();
  });
}

/* ===========================
   Movie Night Picker
   =========================== */
movieNightBtn.addEventListener('click', () => {
  const plan = allMoviesForStats.filter((m) => (m.status || 'watched') === 'plan');

  if (!plan.length) {
    movieNightResult.hidden = false;
    movieNightResult.innerHTML = 'ماكو أفلام داخل <b>Plan to Watch</b> حاليًا 😅';
    return;
  }

  const under150 = plan.filter((m) => !m.runtime || Number(m.runtime) <= 150);
  const source = under150.length ? under150 : plan;
  const picked = source[Math.floor(Math.random() * source.length)];

  movieNightResult.hidden = false;
  movieNightResult.innerHTML = `
    <b>🎬 اختيار الليلة:</b> ${escapeHtml(picked.title)}<br>
    <small>${picked.year} • ${escapeHtml(picked.genre || 'Other')} • تقييمك: ${formatRating(picked.rating)}${picked.runtime ? ` • ${picked.runtime} د` : ''}</small>
  `;
});

/* ===========================
   Init
   =========================== */
async function init() {
  initTheme();
  bindFilters();

  await Promise.all([
    loadMoviesRecent(),
    loadSeriesRecent(),
    loadStatsData()
  ]);
}
init();
