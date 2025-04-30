const mongoose = require('mongoose');

const berwirausahaSchema = new mongoose.Schema({
    alumniId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Alumni'

    },
    namaUsaha: {
        type: String,
        required: true

    },
    alamatUsaha: {
        type: String,
        required: true

    },
    teleponUsaha: {
        type: Number,
        required: true

    },
    bidangUsaha: {
        type: String,
        required: true
    },
    jumlahKaryawan: {
        type: Number,
        required: true
    },
    tanggalMulai: {
        type: Date,
        required: true
    },
});

const Berwirausaha = mongoose.model('Berwirausaha', berwirausahaSchema);
module.exports = Berwirausaha;