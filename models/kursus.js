const mongoose = require('mongoose');

const kursusSchema = new mongoose.Schema({
    alumniId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Alumni'
    },
    namaKursus: {
        type: String,
        required: true
    },
    alamatKursus: {
        type: String,
        required: true
    },
    bidangKursus: {
        type: String,
        required: true
    },
    tanggalMulai: {
        type: Date,
        required: true
    },
    tanggalSelesai: {
        type: Date,
        required: true
    },
});

const Kursus = mongoose.model('Kursus', kursusSchema);
module.exports = Kursus;