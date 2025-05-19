const multer = require('multer');
const path = require('path');

// Konfigurasi tempat penyimpanan file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); // Pastikan folder ini ada
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Filter jenis file (opsional tapi disarankan)
const fileFilter = function (req, file, cb) {
    // Hanya izinkan gambar
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Hanya file gambar yang diizinkan!'));
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

module.exports = upload;
