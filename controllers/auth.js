const Alumni = require('../models/alumni'); // Pastikan path model Alumni benar
const Admin = require('../models/admin');   // Pastikan path model Admin benar
const bcrypt = require('bcrypt');
const request = require('request');
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

module.exports = {
    login: async (req, res) => {
        const { nisn, 'g-recaptcha-response': recaptchaResponse } = req.body;

        // Verifikasi reCAPTCHA
        if (!recaptchaResponse) {
            return res.render('pages/login', { error: 'Mohon verifikasi bahwa Anda bukan robot.' });
        }

        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}&remoteip=${req.ip}`;

        request(verificationUrl, async (error, response, body) => {
            if (error) {
                console.error('reCAPTCHA verification error:', error);
                return res.render('pages/login', { error: 'Terjadi kesalahan saat memverifikasi reCAPTCHA.' });
            }

            const verificationData = JSON.parse(body);

            if (verificationData.success) {
                // CAPTCHA valid, lanjutkan dengan logika login alumni
                const alumni = await Alumni.findOne({ nisn: nisn.trim() });

                if (alumni) {
                    req.session.user = { ...alumni.toObject(), role: 'alumni' };
                    req.session.save();
                    return res.redirect('/alumni');
                } else {
                    return res.render('pages/login', { error: 'Alumni dengan NISN tersebut tidak ditemukan.' });
                }
            } else {
                // CAPTCHA tidak valid
                return res.render('pages/login', { error: 'Verifikasi reCAPTCHA gagal. Mohon coba lagi.' });
            }
        });
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
        res.render('pages/login'); // Asumsi Anda memiliki file login.ejs untuk alumni
    },
    showAdminLoginPage: (req, res) => {
        res.render('pages/login_admin'); // Merender file login-admin.ejs untuk admin
    }
};