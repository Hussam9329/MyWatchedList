/* ===========================
   Supabase
   =========================== */
const SUPABASE_URL = 'https://lbwjdleewjtlqhnjwzsn.supabase.co';
const SUPABASE_ANON_KEY = 'ضع_المفتاح_العام_هنا_او_اتركه_كما_هو';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ===========================
   Globals
   =========================== */
let allMovies = [];
let allSeries = [];
let movieSearchTimer = null;

/* ===========================
   DOM
   =========================== */
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

const movieForm = document.getElementById('movie-form');
const moviesList = document.getElementById('movies-list');
const moviesCount = document.getElementById('movies-count');

const seriesForm = document.getElementById('series-form');
const seriesList = document.getElementById('series-list');
const seriesCount = document.getElementById('series-count');

const movieIdInput = document.getElementById('movie-id');
const movieFormTitle = document.getElementById('movie-form-title');
const movieSubmitBtn = document.getElementById('movie-submit-btn');
const movieCancelEdit = document.getElementById('movie-cancel-edit');

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
   UI helpers
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
  const isLight = document.body.classList.contains('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
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
   Validation
   =========================== */
function validYear(y) {
  const current = new Date().getFullYear() + 5;
  return Number.isInteger(y) && y >= 1900 && y <= current;
}
function validRating(r) {
  return Number.isFinite(r) && r >= 0 && r <= 100;
}

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
async function loadMovies() {
  moviesList.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin fa-3x"></i><p>جاري تحميل الأفلام...</p></div>';

  const { data, error } = await db.from('movies').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    showToast('خطأ في تحميل الأفلام', 'error');
    moviesList.innerHTML = '';
    return;
  }
  allMovies = data || [];
  renderMovies();
  updateDashboard();
}

function applyMovieFilters(arr) {
  let result = [...arr];

  const searchValue = movieSearch.value.trim().toLowerCase();
  const genreValue = filterGenre.value;
  const yearValue = Number(filterYear.value);
  const minRatingValue = Number(filterMinRating.value);
  const statusValue = filterStatus.value;
  const sortValue = sortMovies.value;

  if (searchValue) {
    result = result.filter((m) => (m.title || '').toLowerCase().includes(searchValue));
  }
  if (genreValue) {
    result = result.filter((m) => m.genre === genreValue);
  }
  if (filterYear.value) {
    result = result.filter((m) => Number(m.year) === yearValue);
  }
  if (filterMinRating.value) {
    result = result.filter((m) => Number(m.rating) >= minRatingValue);
  }
  if (statusValue) {
    result = result.filter((m) => (m.status || 'watched') === statusValue);
  }

  switch (sortValue) {
    case 'rating_desc':
      result.sort((a, b) => Number(b.rating) - Number(a.rating));
      break;
    case 'year_desc':
      result.sort((a, b) => Number(b.year) - Number(a.year));
      break;
    case 'year_asc':
      result.sort((a, b) => Number(a.year) - Number(b.year));
      break;
    case 'title_asc':
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    default:
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return result;
}

function renderMovies() {
  const filtered = applyMovieFilters(allMovies);
  moviesCount.textContent = filtered.length;

  if (filtered.length === 0) {
    moviesList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-film fa-3x"></i>
        <p>لا توجد نتائج حسب الفلاتر الحالية</p>
      </div>
    `;
    return;
  }

  moviesList.innerHTML = filtered.map((m) => {
    const rewatch = m.rewatch === true || m.rewatch === 'true';
    const runtime = m.runtime ? `<span><i class="fas fa-clock"></i> ${m.runtime} د</span>` : '';
    return `
      <div class="item-card">
        <div class="item-rating ${getRatingClass(m.rating)}">${formatRating(m.rating)}</div>

        <div class="item-info">
          <div class="item-title">${escapeHtml(m.title)}</div>
          <div class="item-meta">
            <span><i class="fas fa-calendar"></i> ${m.year}</span>
            <span class="genre-badge">${escapeHtml(m.genre || 'Other')}</span>
            <span class="status-pill ${statusClass(m.status || 'watched')}">${statusLabel(m.status || 'watched')}</span>
            ${runtime}
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

movieForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = movieIdInput.value ? Number(movieIdInput.value) : null;
  const title = document.getElementById('movie-title').value.trim();
  const year = parseInt(document.getElementById('movie-year').value, 10);
  const genre = document.getElementById('movie-genre').value;
  const rating = parseFloat(document.getElementById('movie-rating').value);
  const status = document.getElementById('movie-status').value;
  const rewatch = document.getElementById('movie-rewatch').value === 'true';
  const runtimeValue = document.getElementById('movie-runtime').value.trim();
  const runtime = runtimeValue ? parseInt(runtimeValue, 10) : null;

  if (!title) return showToast('اسم الفيلم مطلوب', 'error');
  if (!validYear(year)) return showToast('سنة الإنتاج غير صحيحة', 'error');
  if (!genre) return showToast('اختر النوع', 'error');
  if (!validRating(rating)) return showToast('التقييم يجب أن يكون بين 0 و 100', 'error');
  if (runtime !== null && (!Number.isInteger(runtime) || runtime < 1 || runtime > 400)) {
    return showToast('مدة الفيلم غير صحيحة', 'error');
  }

  const duplicate = await isDuplicateMovie(title, year, id);
  if (duplicate) return showToast('هذا الفيلم موجود مسبقًا بنفس الاسم والسنة', 'error');

  if (id) {
    const { error } = await db.from('movies').update({ title, year, genre, rating, status, rewatch, runtime }).eq('id', id);
    if (error) {
      console.error(error);
      return showToast('فشل تحديث الفيلم', 'error');
    }
    showToast('تم تحديث الفيلم بنجاح', 'success');
  } else {
    const { error } = await db.from('movies').insert([{ title, year, genre, rating, status, rewatch, runtime }]);
    if (error) {
      console.error(error);
      return showToast('فشل إضافة الفيلم', 'error');
    }
    showToast('تمت إضافة الفيلم', 'success');
  }

  resetMovieForm();
  loadMovies();
});

async function editMovie(id) {
  const movie = allMovies.find((m) => m.id === id);
  if (!movie) return;

  movieIdInput.value = movie.id;
  document.getElementById('movie-title').value = movie.title || '';
  document.getElementById('movie-year').value = movie.year || '';
  document.getElementById('movie-genre').value = movie.genre || '';
  document.getElementById('movie-rating').value = movie.rating ?? '';
  document.getElementById('movie-status').value = movie.status || 'watched';
  document.getElementById('movie-rewatch').value = String(movie.rewatch === true || movie.rewatch === 'true');
  document.getElementById('movie-runtime').value = movie.runtime || '';

  movieFormTitle.textContent = 'تعديل فيلم';
  movieSubmitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديل';
  movieCancelEdit.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
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
  if (error) {
    console.error(error);
    return showToast('فشل حذف الفيلم', 'error');
  }
  showToast('تم حذف الفيلم', 'success');
  loadMovies();
}

/* ===========================
   Series CRUD + edit + duplicate
   =========================== */
async function loadSeries() {
  seriesList.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin fa-3x"></i><p>جاري تحميل المسلسلات...</p></div>';

  const { data, error } = await db.from('series').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    showToast('خطأ في تحميل المسلسلات', 'error');
    seriesList.innerHTML = '';
    return;
  }

  allSeries = data || [];
  seriesCount.textContent = allSeries.length;

  if (!allSeries.length) {
    seriesList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-tv fa-3x"></i>
        <p>لم تضف أي مسلسلات بعد</p>
      </div>
    `;
    return;
  }

  seriesList.innerHTML = allSeries.map((s) => {
    const seasonWord = Number(s.seasons) === 1 ? 'موسم' : 'مواسم';
    const rewatch = s.rewatch === true || s.rewatch === 'true';
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

seriesForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = seriesIdInput.value ? Number(seriesIdInput.value) : null;
  const title = document.getElementById('series-title').value.trim();
  const year = parseInt(document.getElementById('series-year').value, 10);
  const seasons = parseInt(document.getElementById('series-seasons').value, 10);
  const rating = parseFloat(document.getElementById('series-rating').value);
  const rewatch = document.getElementById('series-rewatch').value === 'true';

  if (!title) return showToast('اسم المسلسل مطلوب', 'error');
  if (!validYear(year)) return showToast('سنة الإنتاج غير صحيحة', 'error');
  if (!Number.isInteger(seasons) || seasons < 1 || seasons > 100) return showToast('عدد المواسم غير صحيح', 'error');
  if (!validRating(rating)) return showToast('التقييم يجب أن يكون بين 0 و 100', 'error');

  const duplicate = await isDuplicateSeries(title, year, id);
  if (duplicate) return showToast('هذا المسلسل موجود مسبقًا بنفس الاسم والسنة', 'error');

  if (id) {
    const { error } = await db.from('series').update({ title, year, seasons, rating, rewatch }).eq('id', id);
    if (error) {
      console.error(error);
      return showToast('فشل تحديث المسلسل', 'error');
    }
    showToast('تم تحديث المسلسل', 'success');
  } else {
    const { error } = await db.from('series').insert([{ title, year, seasons, rating, rewatch }]);
    if (error) {
      console.error(error);
      return showToast('فشل إضافة المسلسل', 'error');
    }
    showToast('تمت إضافة المسلسل', 'success');
  }

  resetSeriesForm();
  loadSeries();
});

async function editSeries(id) {
  const s = allSeries.find((x) => x.id === id);
  if (!s) return;

  seriesIdInput.value = s.id;
  document.getElementById('series-title').value = s.title || '';
  document.getElementById('series-year').value = s.year || '';
  document.getElementById('series-seasons').value = s.seasons || '';
  document.getElementById('series-rating').value = s.rating ?? '';
  document.getElementById('series-rewatch').value = String(s.rewatch === true || s.rewatch === 'true');

  seriesFormTitle.textContent = 'تعديل مسلسل';
  seriesSubmitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديل';
  seriesCancelEdit.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
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
  if (error) {
    console.error(error);
    return showToast('فشل حذف المسلسل', 'error');
  }
  showToast('تم حذف المسلسل', 'success');
  loadSeries();
}

/* ===========================
   Filters / search / sort
   =========================== */
function bindMovieFilters() {
  movieSearch.addEventListener('input', () => {
    clearTimeout(movieSearchTimer);
    movieSearchTimer = setTimeout(() => renderMovies(), 250); // Debounce
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
    renderMovies();
  });
}

/* ===========================
   Dashboard stats
   =========================== */
function updateDashboard() {
  const movies = allMovies || [];
  const series = allSeries || [];
  const allWorksCount = movies.length + series.length;
  statTotal.textContent = allWorksCount;

  // top genre from movies
  const genreMap = {};
  movies.forEach((m) => {
    const g = m.genre || 'Other';
    genreMap[g] = (genreMap[g] || 0) + 1;
  });
  const topGenre = Object.keys(genreMap).sort((a, b) => genreMap[b] - genreMap[a])[0] || '-';
  statTopGenre.textContent = topGenre;

  // avg rating movies + series
  const ratings = [...movies.map((m) => Number(m.rating)), ...series.map((s) => Number(s.rating))].filter((n) => Number.isFinite(n));
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  statAvgRating.textContent = formatRating(avg);

  // top production year (movies only as requested)
  const yearMap = {};
  movies.forEach((m) => {
    const y = Number(m.year);
    if (Number.isInteger(y)) yearMap[y] = (yearMap[y] || 0) + 1;
  });
  const topYear = Object.keys(yearMap).sort((a, b) => yearMap[b] - yearMap[a])[0] || '-';
  statTopYear.textContent = topYear;

  // watched this month from both tables by created_at
  const now = new Date();
  const sameMonthCount = [...movies, ...series].filter((x) => {
    if (!x.created_at) return false;
    const d = new Date(x.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  statThisMonth.textContent = sameMonthCount;
}

/* ===========================
   Movie Night Picker
   =========================== */
movieNightBtn.addEventListener('click', () => {
  const currentFiltered = applyMovieFilters(allMovies);
  const plan = currentFiltered.filter((m) => (m.status || 'watched') === 'plan');

  if (!plan.length) {
    movieNightResult.hidden = false;
    movieNightResult.innerHTML = 'ماكو أفلام ضمن <b>Plan to Watch</b> حسب الفلاتر الحالية 😅';
    return;
  }

  const picked = plan[Math.floor(Math.random() * plan.length)];
  movieNightResult.hidden = false;
  movieNightResult.innerHTML = `
    <b>🎬 اختيار الليلة:</b> ${escapeHtml(picked.title)}
    <br>
    <small>${picked.year} • ${escapeHtml(picked.genre || 'Other')} • تقييمك: ${formatRating(picked.rating)}${picked.runtime ? ` • ${picked.runtime} د` : ''}</small>
  `;
});

/* ===========================
   Init
   =========================== */
async function init() {
  initTheme();
  bindMovieFilters();
  await Promise.all([loadMovies(), loadSeries()]);
}
init();
