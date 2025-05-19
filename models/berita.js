const mongoose = require('mongoose');

const beritaSchema = new mongoose.Schema({
    // Judul berita, wajib diisi, dan unik
    title: {
        type: String,
        required: true,
        trim: true, // Menghapus spasi di awal dan akhir judul
    },
    // Isi berita, wajib diisi
    content: {
        type: String,
        required: true,
    },
    // Gambar utama berita
    featuredImage: {
        type: String,
    },
    // Ringkasan singkat berita
    excerpt: {
        type: String,
        maxlength: 255, // Batasi panjang ringkasan
    },
}, { timestamps: true }); // Menambahkan createdAt dan updatedAt

// Membuat model dari skema
const Berita = mongoose.model('Berita', beritaSchema);

module.exports = Berita;
