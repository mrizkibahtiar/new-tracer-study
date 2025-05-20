const mongoose = require('mongoose');

// Skema untuk Saran
const SaranSchema = new mongoose.Schema({
    nama: {
        type: String,
        required: true,
        trim: true // Menghapus spasi di awal dan akhir
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true // Menyimpan email dalam huruf kecil
    },
    saran: {
        type: String,
        required: true,
        trim: true
    },
}, { timestamps: true });

// Membuat model dari skema
const Saran = mongoose.model('Saran', SaranSchema);

module.exports = Saran;
