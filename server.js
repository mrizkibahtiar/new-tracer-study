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
const { checkLogin } = require('./middleware/auth');
const { flashMessage } = require('./middleware/flash');
const TracerStudy = require('./models/tracerStudy');

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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(flash());
app.use(flashMessage);

// Konfigurasi view engine dan static file
app.set('view engine', 'ejs');
app.use('/assets', express.static('public'));

// Route utama
app.get('/', async (req, res) => {
    const tracerStudy = await TracerStudy.find({})
        .populate('feedback')
        .populate('alumniId')
        .populate('kegiatanDetail');
    let feedback = [];
    for (let i = 0; i < tracerStudy.length; i++) {
        if (['Bekerja', 'Melanjutkan Studi', 'Berwirausaha'].includes(tracerStudy[i].kegiatan)) {
            feedback.push(tracerStudy[i]);
        }
    }
    res.render('pages/index', { feedback: feedback });
});

// Halaman login
app.get('/loginPage', checkLogin, (req, res) => {
    res.render('pages/login');
});

// Tambahkan router
app.use(authRouter);
app.use(alumniRouter);
app.use(adminRouter);

// Jalankan server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
