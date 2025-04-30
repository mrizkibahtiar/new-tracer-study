const mongoose = require('mongoose');

const pekerjaanSchema = new mongoose.Schema({
    alumniId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true, ref: 'Alumni'
    },
    namaPerusahaan: {
        type: String,
        required: true
    },
    alamatPerusahaan: {
        type: String,
        required: true
    },
    teleponPerusahaan: {
        type: String,
        required: true
    },
    sektorPerusahaan: {
        type: String,
        required: true
    },
    posisi: {
        type: String,
        required: true
    },
    tanggalMasuk: {
        type: Date,
        required: true
    }, // Dalam bulan
});

const Pekerjaan = mongoose.model('Pekerjaan', pekerjaanSchema);
module.exports = Pekerjaan;