const Alumni = require('../models/alumni'); // Pastikan path model Alumni benar
const Admin = require('../models/admin');   // Pastikan path model Admin benar
const bcrypt = require('bcrypt');

module.exports = {
    login: async (req, res) => {
        const { nisn } = req.body; // Hanya ambil NISN dari body

        // Cari alumni berdasarkan NISN
        const alumni = await Alumni.findOne({ nisn: nisn.trim() });

        // Jika alumni ditemukan, set session dan redirect
        if (alumni) {
            req.session.user = { ...alumni.toObject(), role: 'alumni' };
            req.session.save();
            return res.redirect('/alumni');
        } else {
            return res.render('login', { error: 'Alumni dengan NISN tersebut tidak ditemukan' }); // Pastikan render ke view yang benar
        }
    },
    AdminLogin: async (req, res) => {
        const { email, password } = req.body;
        // Cari admin berdasarkan email
        const admin = await Admin.findOne({ email: email.trim() });

        // Jika user tidak ditemukan
        if (!admin) {
            return res.render('pages/login_admin', { error: 'admin tidak ditemukan' });
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
        res.render('pages/login'); // Asumsi Anda memiliki file login.ejs untuk alumni
    },
    showAdminLoginPage: (req, res) => {
        res.render('pages/login_admin'); // Merender file login-admin.ejs untuk admin
    }
};