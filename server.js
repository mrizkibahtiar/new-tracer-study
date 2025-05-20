const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const flash = require('connect-flash');
require('dotenv').config();

const app = express();

// Import router dan middleware
const alumniRouter = require('./router/alumni');
const authRouter = require('./router/auth');
const adminRouter = require('./router/admin');
const { flashMessage } = require('./middleware/flash');
const { validationResult } = require('express-validator');
const Berita = require('./models/berita');
const Lowongan = require('./models/lowongan');

// Konfigurasi variabel lingkungan
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_SESSION_SECRET = process.env.DB_SESSION_SECRET;
const ATLAS_URL = `mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@cluster0.pkv9h.mongodb.net/${DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

// Fungsi koneksi ke MongoDB
async function connectDb(URL) {
    try {
        await mongoose.connect(URL);
        console.log('Connected to MongoDB Atlas');
    } catch (error) {
        console.error('Failed to connect to MongoDB Atlas:', error);
    }
}
connectDb(ATLAS_URL);

// Konfigurasi MongoDB Session Store
const store = new MongoDBStore({
    uri: ATLAS_URL,
    collection: 'sessions', // Nama koleksi untuk menyimpan sesi
});

// Tangani error di MongoDBStore
store.on('error', (error) => {
    console.error('Session store error:', error);
});

// Middleware session
app.use(session({
    secret: DB_SESSION_SECRET, // Kunci rahasia untuk sesi
    resave: false,             // Jangan menyimpan ulang sesi jika tidak ada perubahan
    saveUninitialized: false,  // Jangan buat sesi kosong
    store: store,              // Gunakan MongoDB sebagai penyimpanan sesi
    cookie: {
        maxAge: 60 * 60 * 1000, // Cookie berlaku selama 1 jam
        secure: process.env.NODE_ENV === 'production', // Aktifkan secure saat di produksi
        httpOnly: true,        // Cegah akses cookie oleh JavaScript
        sameSite: 'Strict',    // Atur kebijakan same-site sesuai kebutuhan
    },
}));

// Middleware tambahan
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(flash());
app.use(flashMessage);

// Konfigurasi view engine dan static file
app.set('view engine', 'ejs');
app.use('/assets', express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// Route utama
app.get('/', async (req, res) => {
    res.render('pages/index');
});

app.get('/berita', async (req, res) => {
    try {
        const semuaBerita = await Berita.find().sort({ createdAt: -1 }); // Berita terbaru dulu
        res.render('pages/berita', {
            beritaList: semuaBerita
        });
    } catch (error) {
        req.flash('error_msh', 'Gagal mengambil berita');
        return res.redirect('/berita');
    }
})

app.get('/berita/:beritaId', async function (req, res) {
    try {
        const { beritaId } = req.params;

        // Ambil berita berdasarkan ID
        const berita = await Berita.findById(beritaId);

        // Jika tidak ditemukan
        if (!berita) {
            req.flash('error_msg', 'Berita tidak ditemukan');
            return res.redirect('/berita'); // arahkan kembali ke daftar berita
        }

        // Kirim data ke view
        res.render('pages/berita_detail', {
            berita,
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Terjadi kesalahan saat memuat detail berita');
        return res.redirect('/berita');
    }
});

app.get('/lowongan', async (req, res) => {
    try {
        const semuaLowongan = await Lowongan.find().sort({ createdAt: -1 }); // Berita terbaru dulu
        res.render('pages/lowongan', {
            lowonganList: semuaLowongan
        });
    } catch (error) {
        req.flash('error_msh', 'Gagal mengambil Lowongan');
        return res.redirect('/lowongan');
    }
});

app.get('/lowongan/:lowonganId', async function (req, res) {
    try {
        const { lowonganId } = req.params;

        // Ambil berita berdasarkan ID
        const lowongan = await Lowongan.findById(lowonganId);

        // Jika tidak ditemukan
        if (!lowongan) {
            req.flash('error_msg', 'lowongan tidak ditemukan');
            return res.redirect('/lowongan'); // arahkan kembali ke daftar berita
        }

        // Kirim data ke view
        res.render('pages/lowongan_detail', {
            lowongan,
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Terjadi kesalahan saat memuat detail lowongan');
        return res.redirect('/lowongan');
    }
});

app.get('/saran', async function (req, res) {
    res.render('pages/saran');
})

app.post('/saran', async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Jika ada error validasi, kirimkan kembali ke form dengan pesan error
        req.flash('error_msg', 'Terdapat kesalahan dalam pengisian form.'); // Gunakan flash message
        return res.redirect('/saran'); // Redirect ke halaman form saran
    }

    try {
        // Buat objek Saran baru
        const saranBaru = new Saran({
            nama: req.body.nama,
            email: req.body.email,
            saran: req.body.saran,
        });

        // Simpan saran ke database
        await saranBaru.save();

        // Jika berhasil disimpan, kirimkan flash message sukses dan redirect
        req.flash('success_msg', 'Terima kasih! Saran Anda telah kami terima.');
        res.redirect('/saran');

    } catch (error) {
        console.error("Error saving saran:", error);
        req.flash('error_msg', 'Maaf, terjadi kesalahan. Saran Anda gagal dikirim.');
        res.redirect('/saran'); // Redirect ke halaman form saran
    }
})


// Tambahkan router
app.use(authRouter);
app.use(alumniRouter);
app.use(adminRouter);

// Jalankan server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
