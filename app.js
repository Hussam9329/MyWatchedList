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
   ===== الأفلام (مع Pagination) =====
   =========================== */

var movieForm = document.getElementById('movie-form');
var moviesList = document.getElementById('movies-list');
var moviesCount = document.getElementById('movies-count');

var currentMoviePage = 0;
var moviePageSize = 50;
var isLoadingMoreMovies = false;
var hasMoreMovies = true;


async function loadMovies(isLoadMore = false) {
    if (isLoadingMoreMovies) return;
    if (!isLoadMore) {
        moviesList.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin fa-3x"></i><p>جاري التحميل...</p></div>';
        currentMoviePage = 0;
        hasMoreMovies = true;
    }

    isLoadingMoreMovies = true;
    
    var from = currentMoviePage * moviePageSize;
    var to = from + moviePageSize - 1;

    var result = await db
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to); // <-- هنا سر الحل: جلب 50 فيلم فقط في كل مرة

    if (result.error) {
        console.error('خطأ في تحميل الأفلام:', result.error);
        showToast('حدث خطأ أثناء التحميل', 'error');
        isLoadingMoreMovies = false;
        return;
    }

    var movies = result.data;
    
    // تحديث العدد الكلي (يمكنك استبداله بعدد ثابت من قاعدة البيانات إذا أردت)
    moviesCount.textContent = (isLoadMore ? moviesList.querySelectorAll('.item-card').length : 0) + movies.length;

    if (movies.length < moviePageSize) {
        hasMoreMovies = false; // لم يعد هناك المزيد من الأفلام
    }

    if (!isLoadMore && movies.length === 0) {
        moviesList.innerHTML = '<div class="empty-state">' +
            '<i class="fas fa-film fa-3x"></i>' +
            '<p>لم تضف أي أفلام بعد</p>' +
            '</div>';
        isLoadingMoreMovies = false;
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

    if (isLoadMore) {
        // إزالة زر "تحميل المزيد" القديم إذا وُجد
        var oldBtn = document.getElementById('load-more-movies-btn');
        if(oldBtn) oldBtn.remove();
        
        moviesList.insertAdjacentHTML('beforeend', html);
    } else {
        moviesList.innerHTML = html;
    }

    // إضافة زر "تحميل المزيد" إذا كانت هناك أفلام أخرى
    if (hasMoreMovies) {
        moviesList.insertAdjacentHTML('beforeend', 
            '<button id="load-more-movies-btn" class="load-more-btn" onclick="loadMoreMovies()">تحميل المزيد...</button>'
        );
    }

    isLoadingMoreMovies = false;
}

function loadMoreMovies() {
    currentMoviePage++;
    loadMovies(true);
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
   ===== المسلسلات (مع Pagination) =====
   =========================== */

var seriesForm = document.getElementById('series-form');
var seriesList = document.getElementById('series-list');
var seriesCount = document.getElementById('series-count');

var currentSeriesPage = 0;
var seriesPageSize = 50;
var isLoadingMoreSeries = false;
var hasMoreSeries = true;


async function loadSeries(isLoadMore = false) {
    if (isLoadingMoreSeries) return;
    if (!isLoadMore) {
        seriesList.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin fa-3x"></i><p>جاري التحميل...</p></div>';
        currentSeriesPage = 0;
        hasMoreSeries = true;
    }

    isLoadingMoreSeries = true;

    var from = currentSeriesPage * seriesPageSize;
    var to = from + seriesPageSize - 1;

    var result = await db
        .from('series')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to); // <-- نفس الحل للمسلسلات

    if (result.error) {
        console.error('خطأ في تحميل المسلسلات:', result.error);
        showToast('حدث خطأ أثناء التحميل', 'error');
        isLoadingMoreSeries = false;
        return;
    }

    var allSeries = result.data;
    seriesCount.textContent = (isLoadMore ? seriesList.querySelectorAll('.item-card').length : 0) + allSeries.length;

    if (allSeries.length < seriesPageSize) {
        hasMoreSeries = false;
    }

    if (!isLoadMore && allSeries.length === 0) {
        seriesList.innerHTML = '<div class="empty-state">' +
            '<i class="fas fa-tv fa-3x"></i>' +
            '<p>لم تضف أي مسلسلات بعد</p>' +
            '</div>';
        isLoadingMoreSeries = false;
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

    if (isLoadMore) {
        var oldBtn = document.getElementById('load-more-series-btn');
        if(oldBtn) oldBtn.remove();
        
        seriesList.insertAdjacentHTML('beforeend', html);
    } else {
        seriesList.innerHTML = html;
    }

    if (hasMoreSeries) {
        seriesList.insertAdjacentHTML('beforeend', 
            '<button id="load-more-series-btn" class="load-more-btn" onclick="loadMoreSeries()">تحميل المزيد...</button>'
        );
    }

    isLoadingMoreSeries = false;
}

function loadMoreSeries() {
    currentSeriesPage++;
    loadSeries(true);
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
