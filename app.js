/* ===========================
   إعداد اتصال Supabase
   =========================== */

const SUPABASE_URL = 'https://lbwjdleewjtlqhnjwzsn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxid2pkbGVld2p0bHFobmp3enNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODEyNzAsImV4cCI6MjA5MjE1NzI3MH0.U8D4EMaPwKNnDchYpUyHd1SoAVqhl4jmNmI53MIHWNY';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


/* ===========================
   التبويبات
   =========================== */

const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        tabContents.forEach(function(c) { c.classList.remove('active'); });

        tab.classList.add('active');
        var tabName = tab.getAttribute('data-tab');
        document.getElementById(tabName + '-section').classList.add('active');
    });
});


/* ===========================
   رسائل التنبيه (Toast)
   =========================== */

function showToast(message, type) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast toast-' + type + ' show';

    setTimeout(function() {
        toast.classList.remove('show');
    }, 2000);
}


/* ===========================
   دوال مساعدة
   =========================== */

function getRatingClass(rating) {
    if (rating >= 70) return 'rating-high';
    if (rating >= 40) return 'rating-mid';
    return 'rating-low';
}

function formatRating(num) {
    var n = Math.round(num * 100) / 100;
    if (n % 1 === 0) {
        return n.toString();
    }
    return n.toFixed(2);
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


/* ===========================
   ===== الأفلام (العدد الكلي + آخر 5 فقط) =====
   =========================== */

var movieForm = document.getElementById('movie-form');
var moviesList = document.getElementById('movies-list');
var moviesCount = document.getElementById('movies-count');

async function loadMovies() {
    moviesList.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin fa-3x"></i><p>جاري التحميل...</p></div>';

    // 1. جلب العدد الكلي
    var countResult = await db
        .from('movies')
        .select('*', { count: 'exact', head: true }); // head: true يجلب العدد فقط بدون البيانات

    var totalCount = 0;
    if (!countResult.error) {
        totalCount = countResult.count;
    }
    
    // عرض العدد الكلي
    moviesCount.textContent = totalCount;

    // 2. جلب آخر 5 أفلام فقط
    var result = await db
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5); // <-- هنا السر: جلب 5 أفلام فقط

    if (result.error) {
        console.error('خطأ في تحميل الأفلام:', result.error);
        moviesList.innerHTML = '';
        return;
    }

    var movies = result.data;

    if (movies.length === 0) {
        moviesList.innerHTML = '<div class="empty-state">' +
            '<i class="fas fa-film fa-3x"></i>' +
            '<p>لم تضف أي أفلام بعد</p>' +
            '</div>';
        return;
    }

    var html = '';
    movies.forEach(function(movie) {
        html += '<div class="item-card">' +
            '<div class="item-rating ' + getRatingClass(movie.rating) + '">' +
                formatRating(movie.rating) +
            '</div>' +
            '<div class="item-info">' +
                '<div class="item-title">' + escapeHtml(movie.title) + '</div>' +
                '<div class="item-meta">' +
                    '<span><i class="fas fa-calendar"></i> ' + movie.year + '</span>' +
                    '<span class="genre-badge">' + escapeHtml(movie.genre) + '</span>' +
                '</div>' +
            '</div>' +
            '<button class="btn-delete" onclick="deleteMovie(' + movie.id + ')" title="حذف">' +
                '<i class="fas fa-trash-alt"></i>' +
            '</button>' +
        '</div>';
    });

    moviesList.innerHTML = html;
}

movieForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    var title = document.getElementById('movie-title').value.trim();
    var year = parseInt(document.getElementById('movie-year').value);
    var genre = document.getElementById('movie-genre').value;
    var rating = parseFloat(document.getElementById('movie-rating').value);

    if (rating < 0 || rating > 100) {
        showToast('التقييم يجب أن يكون بين 0 و 100', 'error');
        return;
    }

    var result = await db
        .from('movies')
        .insert([{ title: title, year: year, genre: genre, rating: rating }]);

    if (result.error) {
        console.error('خطأ في الإضافة:', result.error);
        showToast('حدث خطأ أثناء الإضافة', 'error');
        return;
    }

    showToast('تمت إضافة الفيلم بنجاح', 'success');
    movieForm.reset();
    loadMovies();
});

async function deleteMovie(id) {
    var result = await db
        .from('movies')
        .delete()
        .eq('id', id);

    if (result.error) {
        console.error('خطأ في الحذف:', result.error);
        showToast('حدث خطأ أثناء الحذف', 'error');
        return;
    }

    showToast('تم حذف الفيلم', 'success');
    loadMovies();
}


/* ===========================
   ===== المسلسلات (العدد الكلي + آخر 5 فقط) =====
   =========================== */

var seriesForm = document.getElementById('series-form');
var seriesList = document.getElementById('series-list');
var seriesCount = document.getElementById('series-count');

async function loadSeries() {
    seriesList.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin fa-3x"></i><p>جاري التحميل...</p></div>';

    // 1. جلب العدد الكلي
    var countResult = await db
        .from('series')
        .select('*', { count: 'exact', head: true });

    var totalCount = 0;
    if (!countResult.error) {
        totalCount = countResult.count;
    }
    
    // عرض العدد الكلي
    seriesCount.textContent = totalCount;

    // 2. جلب آخر 5 مسلسلات فقط
    var result = await db
        .from('series')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5); // <-- جلب 5 مسلسلات فقط

    if (result.error) {
        console.error('خطأ في تحميل المسلسلات:', result.error);
        seriesList.innerHTML = '';
        return;
    }

    var allSeries = result.data;

    if (allSeries.length === 0) {
        seriesList.innerHTML = '<div class="empty-state">' +
            '<i class="fas fa-tv fa-3x"></i>' +
            '<p>لم تضف أي مسلسلات بعد</p>' +
            '</div>';
        return;
    }

    var html = '';
    allSeries.forEach(function(s) {
        var seasonWord = s.seasons === 1 ? 'موسم' : 'مواسم';
        html += '<div class="item-card">' +
            '<div class="item-rating ' + getRatingClass(s.rating) + '">' +
                formatRating(s.rating) +
            '</div>' +
            '<div class="item-info">' +
                '<div class="item-title">' + escapeHtml(s.title) + '</div>' +
                '<div class="item-meta">' +
                    '<span><i class="fas fa-calendar"></i> ' + s.year + '</span>' +
                    '<span><i class="fas fa-layer-group"></i> ' + s.seasons + ' ' + seasonWord + '</span>' +
                '</div>' +
            '</div>' +
            '<button class="btn-delete" onclick="deleteSeries(' + s.id + ')" title="حذف">' +
                '<i class="fas fa-trash-alt"></i>' +
            '</button>' +
        '</div>';
    });

    seriesList.innerHTML = html;
}

seriesForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    var title = document.getElementById('series-title').value.trim();
    var year = parseInt(document.getElementById('series-year').value);
    var seasons = parseInt(document.getElementById('series-seasons').value);
    var rating = parseFloat(document.getElementById('series-rating').value);

    if (rating < 0 || rating > 100) {
        showToast('التقييم يجب أن يكون بين 0 و 100', 'error');
        return;
    }

    var result = await db
        .from('series')
        .insert([{ title: title, year: year, seasons: seasons, rating: rating }]);

    if (result.error) {
        console.error('خطأ في الإضافة:', result.error);
        showToast('حدث خطأ أثناء الإضافة', 'error');
        return;
    }

    showToast('تمت إضافة المسلسل بنجاح', 'success');
    seriesForm.reset();
    loadSeries();
});

async function deleteSeries(id) {
    var result = await db
        .from('series')
        .delete()
        .eq('id', id);

    if (result.error) {
        console.error('خطأ في الحذف:', result.error);
        showToast('حدث خطأ أثناء الحذف', 'error');
        return;
    }

    showToast('تم حذف المسلسل', 'success');
    loadSeries();
}


/* ===========================
   تحميل البيانات عند فتح الصفحة
   =========================== */

loadMovies();
loadSeries();
