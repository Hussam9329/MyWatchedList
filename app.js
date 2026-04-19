

/* ===========================
   إعداد اتصال Supabase
   =========================== */

// ← استبدل هاتين القيمتين بمفاتيحك من Supabase
const SUPABASE_URL = 'https://lbwjdleewjtlqhnjwzsn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxid2pkbGVld2p0bHFobmp3enNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODEyNzAsImV4cCI6MjA5MjE1NzI3MH0.U8D4EMaPwKNnDchYpUyHd1SoAVqhl4jmNmI53MIHWNY';

// إنشاء عميل Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


/* ===========================
   التبويبات
   =========================== */

const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// عند الضغط على أي تبويب
tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
        // إزالة الحالة النشطة من كل التبويبات
        tabs.forEach(function(t) { t.classList.remove('active'); });
        tabContents.forEach(function(c) { c.classList.remove('active'); });

        // تفعيل التبويب المضغوط
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

    // إخفاء الرسالة بعد ثانيتين
    setTimeout(function() {
        toast.classList.remove('show');
    }, 2000);
}


/* ===========================
   دوال مساعدة
   =========================== */

// تحديد لون التقييم حسب القيمة
function getRatingClass(rating) {
    if (rating >= 70) return 'rating-high';
    if (rating >= 40) return 'rating-mid';
    return 'rating-low';
}


/* ===========================
   ===== الأفلام =====
   =========================== */

var movieForm = document.getElementById('movie-form');
var moviesList = document.getElementById('movies-list');
var moviesCount = document.getElementById('movies-count');

// عرض كل الأفلام من قاعدة البيانات
async function loadMovies() {
    var result = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });

    if (result.error) {
        console.error('خطأ في تحميل الأفلام:', result.error);
        return;
    }

    var movies = result.data;
    moviesCount.textContent = movies.length;

    // إذا لم تكن هناك أفلام
    if (movies.length === 0) {
        moviesList.innerHTML = '<div class="empty-state">' +
            '<i class="fas fa-film fa-3x"></i>' +
            '<p>لم تضف أي أفلام بعد</p>' +
            '</div>';
        return;
    }

    // بناء قائمة الأفلام
    var html = '';
    movies.forEach(function(movie) {
        html += '<div class="item-card">' +
            '<div class="item-rating ' + getRatingClass(movie.rating) + '">' +
                movie.rating +
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

// إضافة فيلم جديد
movieForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    var title = document.getElementById('movie-title').value.trim();
    var year = parseInt(document.getElementById('movie-year').value);
    var genre = document.getElementById('movie-genre').value;
    var rating = parseFloat(document.getElementById('movie-rating').value);

    // التحقق من صحة التقييم
    if (rating < 0 || rating > 100) {
        showToast('التقييم يجب أن يكون بين 0 و 100', 'error');
        return;
    }

    // إرسال البيانات إلى Supabase
    var result = await supabase
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

// حذف فيلم
async function deleteMovie(id) {
    var result = await supabase
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
   ===== المسلسلات =====
   =========================== */

var seriesForm = document.getElementById('series-form');
var seriesList = document.getElementById('series-list');
var seriesCount = document.getElementById('series-count');

// عرض كل المسلسلات من قاعدة البيانات
async function loadSeries() {
    var result = await supabase
        .from('series')
        .select('*')
        .order('created_at', { ascending: false });

    if (result.error) {
        console.error('خطأ في تحميل المسلسلات:', result.error);
        return;
    }

    var allSeries = result.data;
    seriesCount.textContent = allSeries.length;

    // إذا لم تكن هناك مسلسلات
    if (allSeries.length === 0) {
        seriesList.innerHTML = '<div class="empty-state">' +
            '<i class="fas fa-tv fa-3x"></i>' +
            '<p>لم تضف أي مسلسلات بعد</p>' +
            '</div>';
        return;
    }

    // بناء قائمة المسلسلات
    var html = '';
    allSeries.forEach(function(s) {
        var seasonWord = s.seasons === 1 ? 'موسم' : 'مواسم';
        html += '<div class="item-card">' +
            '<div class="item-rating ' + getRatingClass(s.rating) + '">' +
                s.rating +
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

// إضافة مسلسل جديد
seriesForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    var title = document.getElementById('series-title').value.trim();
    var year = parseInt(document.getElementById('series-year').value);
    var seasons = parseInt(document.getElementById('series-seasons').value);
    var rating = parseFloat(document.getElementById('series-rating').value);

    // التحقق من صحة التقييم
    if (rating < 0 || rating > 100) {
        showToast('التقييم يجب أن يكون بين 0 و 100', 'error');
        return;
    }

    // إرسال البيانات إلى Supabase
    var result = await supabase
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

// حذف مسلسل
async function deleteSeries(id) {
    var result = await supabase
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
   حماية من XSS (حقن الأكواد)
   =========================== */

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


/* ===========================
   تحميل البيانات عند فتح الصفحة
   =========================== */

loadMovies();
loadSeries();
