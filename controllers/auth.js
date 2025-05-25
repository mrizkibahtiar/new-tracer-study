const Alumni = require('../models/alumni'); // Pastikan path model Alumni benar
const Admin = require('../models/admin');   // Pastikan path model Admin benar
const bcrypt = require('bcrypt');

module.exports = {
    login: async (req, res) => {
        const { nisn, password } = req.body;

        // Pastikan NISN dan Password tidak kosong
        if (!nisn || !password) {
            return res.render('pages/login', { error: 'NISN dan Password harus diisi.' });
        }

        try {
            // Cari alumni berdasarkan NISN
            const alumni = await Alumni.findOne({ nisn: nisn.trim() });

            // Jika alumni tidak ditemukan
            if (!alumni) {
                return res.render('pages/login', { error: 'NISN atau password salah.' });
            }

            // Jika alumni ditemukan, bandingkan password yang diinput dengan password terenkripsi di database
            // Asumsi di model Alumni, field password adalah 'password' dan sudah terenkripsi
            const isMatch = await bcrypt.compare(password, alumni.password);

            if (isMatch) {
                // Password cocok, login berhasil
                req.session.user = { ...alumni.toObject(), role: 'alumni' };
                req.session.save(); // Pastikan session disimpan
                return res.redirect('/alumni');
            } else {
                // Password tidak cocok
                return res.render('pages/login', { error: 'NISN atau password salah.' });
            }
        } catch (error) {
            console.error('Login error:', error);
            return res.render('pages/login', { error: 'Terjadi kesalahan pada server saat mencoba login.' });
        }
    },
    AdminLogin: async (req, res) => {
        const { email, password } = req.body;
        // Cari admin berdasarkan email
        const admin = await Admin.findOne({ email: email.trim() });

        // Jika user tidak ditemukan
        if (!admin) {
            return res.render('pages/login_admin', { error: 'Email atau Password salah!' });
        }


        if (admin) {
            const isPasswordValid = await bcrypt.compare(password.trim(), admin.password);
            if (isPasswordValid) {
                req.session.user = { ...admin.toObject(), role: 'admin', adminId: admin._id };
                req.session.save();
                return res.redirect('/admin');
            } else {
                return res.render('pages/login_admin', { error: 'Password Salah!' });
            }
        } else {
            return res.render('pages/login_admin', { error: 'Admin tidak ditemukan' });
        }
    },
    logout: async (req, res) => {
        req.session.destroy();
        res.redirect('/');
    },
    showLoginPage: (req, res) => {
        // Cek apakah ada sesi pengguna yang aktif
        if (req.session.user) {
            // Jika ada sesi, periksa peran pengguna
            if (req.session.user.role === 'alumni') {
                // Jika pengguna adalah alumni, redirect ke dashboard alumni
                return res.redirect('/alumni');
            } else if (req.session.user.role === 'admin') {
                // Jika pengguna adalah admin (dan mencoba mengakses halaman login alumni),
                // redirect ke dashboard admin
                return res.redirect('/admin/dashboard'); // Sesuaikan dengan route dashboard admin Anda
            }
        }
        res.render('pages/login'); // Asumsi Anda memiliki file login.ejs untuk alumni
    }, showAdminLoginPage: (req, res) => {
        // Cek apakah ada sesi pengguna yang aktif
        if (req.session.user) {
            // Jika ada sesi, periksa peran pengguna
            if (req.session.user.role === 'admin') {
                // Jika pengguna adalah admin, redirect ke dashboard admin
                return res.redirect('/admin/dashboard'); // Sesuaikan dengan route dashboard admin Anda
            } else if (req.session.user.role === 'alumni') {
                // Jika pengguna adalah alumni (dan mencoba mengakses halaman login admin),
                // redirect ke dashboard alumni
                return res.redirect('/alumni');
            }
            // Tambahan: Sama seperti di atas, penanganan role tidak dikenal.
        }
        res.render('pages/login_admin'); // Merender file login_admin.ejs untuk admin
    }
};