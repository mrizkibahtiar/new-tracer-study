const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

const excelStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'temp_uploads/'; // Folder sementara untuk file Excel
        // Memastikan folder ini ada. Jika tidak, buat.
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Nama file unik untuk Excel
        cb(null, 'excel-' + Date.now() + path.extname(file.originalname));
    }
});

const excelFileFilter = function (req, file, cb) {
    const allowedTypes = /xlsx|xls/; // Hanya izinkan ekstensi Excel
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
        file.mimetype === 'application/vnd.ms-excel'; // .xls

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Hanya file Excel (.xlsx, .xls) yang diizinkan!'), false);
    }
};

const uploadExcel = multer({ storage: excelStorage, fileFilter: excelFileFilter }); // Instance multer untuk Excel


module.exports = upload;
module.exports = uploadExcel;

