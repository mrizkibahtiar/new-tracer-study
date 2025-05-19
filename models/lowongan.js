const mongoose = require('mongoose');

const lowonganSchema = new mongoose.Schema({
    // Judul lowongan, wajib diisi, dan unik
    title: {
        type: String,
        required: true,
        trim: true, // Menghapus spasi di awal dan akhir judul
    },
    // Isi lowongan, wajib diisi
    content: {
        type: String,
        required: true,
    },
    // Gambar utama lowongan
    featuredImage: {
        type: String,
    },
}, { timestamps: true }); // Menambahkan createdAt dan updatedAt

// Membuat model dari skema
const Lowongan = mongoose.model('Lowongan', lowonganSchema);

module.exports = Lowongan;
