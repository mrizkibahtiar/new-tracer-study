const Alumni = require('../models/alumni');
const Admin = require('../models/admin');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

module.exports = {


    login: async (req, res) => {
        const { nisn, password } = req.body;
        // Cari alumni berdasarkan NISN atau email
        const alumni = await Alumni.findOne({
            nisn: nisn.trim()
        });
        // Cari admin berdasarkan email
        const admin = await Admin.findOne({ email: nisn.trim() });
        const user = alumni || admin;

        // Jika user tidak ditemukan
        if (!user) {
            return res.render('pages/login', { error: 'User not found' });
        }

        // Bandingkan password yang dimasukkan dengan password yang di-hash di database
        const isPasswordValid = await bcrypt.compare(password.trim(), user.password);
        if (!isPasswordValid) {
            return res.render('pages/login', { error: 'Password incorrect' });
        }

        // Jika user adalah alumni
        if (alumni) {
            req.session.user = { ...alumni.toObject(), role: 'alumni' };
            req.session.save();
            return res.redirect('/alumni');
        } else {  // Jika user adalah admin
            req.session.user = { ...admin.toObject(), role: 'admin', adminId: admin._id };
            req.session.save();
            return res.redirect('/admin');
        }
    },
    logout: async (req, res) => {
        req.session.destroy();
        res.redirect('/');
    }
}