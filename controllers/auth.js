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
        try {
            const admin = await Admin.findOne({ email: email.trim() });

            if (!admin) {
                console.log("7. Error: Email tidak terdaftar.");
                req.flash('error_msg', 'Email atau password salah!');
                return res.redirect('/loginAdmin');
            }

            const isPasswordValid = await bcrypt.compare(password.trim(), admin.password);
            console.log("12. Hasil bcrypt.compare (isPasswordValid):", isPasswordValid);

            if (isPasswordValid) {
                req.session.user = {
                    id: admin._id,
                    email: admin.email,
                    nama: admin.nama,
                    role: 'admin'
                };
                req.flash('success_msg', 'Login berhasil!');
                return res.redirect('/admin');
            } else {
                req.flash('error_msg', 'Email atau password salah!');
                return res.redirect('/loginAdmin');
            }

        } catch (error) {
            console.error('Login Error:', error);
            req.flash('error_msg', 'Terjadi kesalahan saat login. Silakan coba lagi.');
            return res.redirect('/loginAdmin');
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
                return res.redirect('/admin'); // Sesuaikan dengan route dashboard admin Anda
            }
        }
        res.render('pages/login'); // Asumsi Anda memiliki file login.ejs untuk alumni
    }, showAdminLoginPage: (req, res) => {
        // Cek apakah ada sesi pengguna yang aktif
        if (req.session.user) {
            // Jika ada sesi, periksa peran pengguna
            if (req.session.user.role === 'admin') {
                // Jika pengguna adalah admin, redirect ke dashboard admin
                return res.redirect('/admin'); // Sesuaikan dengan route dashboard admin Anda
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