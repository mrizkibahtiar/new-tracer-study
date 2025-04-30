const mongoose = require('mongoose');

const tracerStudySchema = new mongoose.Schema({
    alumniId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Alumni'
    },
    email: {
        type: String,
        required: true
    },
    tahunLulus: {
        type: Number,
        required: true
    },
    kegiatan: {
        type: String,
        required: true,
        enum: ["Bekerja", "Melanjutkan Studi", "Berwirausaha", "Belum Ada Kegiatan", "Kursus"]
    },
    kegiatanDetail: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'kegiatanRef', // Dinamis berdasarkan kegiatan
        default: null
    },
    kegiatanRef: {
        type: String,
        enum: ["Pekerjaan", "StudiLanjutan", "Berwirausaha", "Kursus", null],
        default: null
    },
    belumAdaKegiatanDetail: {
        type: String,
        required: function () { return this.kegiatan === "Belum Ada Kegiatan"; }, // Hanya wajib jika kegiatan adalah "Belum Ada Kegiatan"
        default: null
    },
    feedback: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feedback',
        required: false
    }
});



const TracerStudy = mongoose.model('TracerStudy', tracerStudySchema);
module.exports = TracerStudy;