const Admin = require('../models/admin');
const Alumni = require('../models/alumni');
const Berita = require('../models/berita');
const Lowongan = require('../models/lowongan');
const Saran = require('../models/saran');
const bcrypt = require('bcrypt');
const TracerStudy = require('../models/tracerStudy');
const Kursus = require('../models/kursus');
const Pekerjaan = require('../models/pekerjaan');
const StudiLanjutan = require('../models/studiLanjutan');
const Berwirausaha = require('../models/berwirausaha');
const Feedback = require('../models/feedback');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const multer = require('multer')
const crypto = require('crypto');
const XLSX = require('xlsx');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


module.exports = {
    index: async function (req, res) {
        if (!req.session.user) {
            return res.redirect('/loginAdmin'); // Redirect ke halaman login jika user belum login
        }

        try {
            const { email } = req.session.user;
            const admin = await Admin.findOne({ email: email });
            const tracerStudy = await TracerStudy.find({});
            const alumni = await Alumni.find({});
            const jumlahAdmin = (await Admin.find({})).length;

            // Inisialisasi variabel statistik
            let berkegiatan = 0;
            let belumAdaKegiatan = 0;
            let bekerja = 0, berwirausaha = 0, studiLanjutan = 0, kursus = 0;

            // Iterasi data tracer study
            tracerStudy.forEach((item) => {
                switch (item.kegiatan) {
                    case "Bekerja":
                        berkegiatan++;
                        bekerja++;
                        break;
                    case "Melanjutkan Studi":
                        berkegiatan++;
                        studiLanjutan++;
                        break;
                    case "Berwirausaha":
                        berkegiatan++;
                        berwirausaha++;
                        break;
                    case "Kursus":
                        berkegiatan++;
                        kursus++;
                        break;
                    case "Belum Ada Kegiatan":
                        belumAdaKegiatan++;
                        break;
                }
            });

            // Hitung persentase
            const alumniPersen = alumni.length > 0 ? Math.round((tracerStudy.length / alumni.length) * 100) : 0;

            const bekerjaPersen = alumni.length > 0 ? Math.round((bekerja / alumni.length) * 100) : 0;
            const studiPersen = alumni.length > 0 ? Math.round((studiLanjutan / alumni.length) * 100) : 0;
            const kursusPersen = alumni.length > 0 ? Math.round((kursus / alumni.length) * 100) : 0;
            const usahaPersen = alumni.length > 0 ? Math.round((berwirausaha / alumni.length) * 100) : 0;
            const bakPersen = alumni.length > 0 ? Math.round((belumAdaKegiatan / alumni.length) * 100) : 0;


            return res.render('pages/admin/dashboard', {
                admin,
                alumniPersen,
                berkegiatan,
                belumAdaKegiatan,
                bekerja,
                berwirausaha,
                studiLanjutan,
                kursus,
                bekerjaPersen,
                studiPersen,
                kursusPersen,
                usahaPersen,
                bakPersen,
                jumlahAdmin,
                jumlahAlumni: alumni.length,
                jumlahTracer: tracerStudy.length
            });
        } catch (err) {
            console.error(err);
            return res.status(500).send('Terjadi kesalahan pada server.');
        }
    },
    storeAlumni: async function (req, res) {
        const { nama, nisn, jenisKelamin, password } = req.body; // Ambil password dari req.body
        console.log(req.body);

        try {
            // Validasi input dasar
            if (!nama || !nisn || !jenisKelamin || !password) {
                const allAlumni = await Alumni.find({});
                const allTracerStudy = await TracerStudy.find({});
                return res.render('pages/admin/alumni_list', {
                    error: 'Semua field (Nama, NISN, Jenis Kelamin, Password) harus diisi.',
                    nama,
                    nisn,
                    alumni: allAlumni,
                    tracerStudy: allTracerStudy
                });
            }

            // Validasi panjang NISN
            if (nisn.length < 10) {
                const allAlumni = await Alumni.find({});
                const allTracerStudy = await TracerStudy.find({});
                return res.render('pages/admin/alumni_list', {
                    error: 'NISN harus terdiri dari minimal 10 angka.',
                    nama,
                    nisn,
                    alumni: allAlumni,
                    tracerStudy: allTracerStudy
                });
            }

            // Validasi panjang Password (contoh minimal 6 karakter)
            if (password.length < 6) {
                const allAlumni = await Alumni.find({});
                const allTracerStudy = await TracerStudy.find({});
                return res.render('pages/admin/alumni_list', {
                    error: 'Password harus terdiri dari minimal 6 karakter.',
                    nama,
                    nisn,
                    alumni: allAlumni,
                    tracerStudy: allTracerStudy
                });
            }

            // Mengecek apakah NISN sudah terdaftar
            const existingAlumni = await Alumni.findOne({ nisn: nisn.trim() });
            if (existingAlumni) {
                const allAlumni = await Alumni.find({});
                const allTracerStudy = await TracerStudy.find({});
                return res.render('pages/admin/alumni_list', {
                    error: 'NISN sudah terdaftar. Mohon gunakan NISN lain.',
                    nama,
                    nisn,
                    alumni: allAlumni,
                    tracerStudy: allTracerStudy
                });
            }

            // Enkripsi password sebelum menyimpan
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Membuat objek untuk alumni
            const alumniData = {
                nisn: nisn.trim(),
                nama: nama.trim(),
                jenisKelamin: jenisKelamin.trim(),
                password: hashedPassword, // Tambahkan password yang sudah dienkripsi
            };

            // Membuat alumni
            const newAlumni = await Alumni.create(alumniData);

            // Mengambil semua data alumni dan tracer study setelah penambahan
            const allAlumni = await Alumni.find({});
            const alumniIds = allAlumni.map(alumni => alumni._id);
            const allTracerStudy = await TracerStudy.find({ alumniId: { $in: alumniIds } });

            // Memetakan tracer study ke alumni
            const tracerStudyMap = new Map();
            allTracerStudy.forEach(tracer => {
                tracerStudyMap.set(tracer.alumniId.toString(), tracer);
            });
            const dataTracerStudy = allAlumni.map(alumniItem => {
                return tracerStudyMap.get(alumniItem._id.toString()) || null;
            });

            // Mengirim success message jika berhasil
            res.render('pages/admin/alumni_list', { success: 'Alumni berhasil ditambahkan!', alumni: allAlumni, tracerStudy: dataTracerStudy });
        } catch (err) {
            const allAlumni = await Alumni.find({});
            const allTracerStudy = await TracerStudy.find({});
            if (err.code === 11000 && err.keyPattern.nisn) {
                return res.render('pages/admin/alumni_list', {
                    alumni: allAlumni,
                    tracerStudy: allTracerStudy,
                    error: 'NISN sudah terdaftar. Mohon gunakan NISN lain.',
                    nama,
                    nisn,
                });
            }
            // Error lainnya
            console.error("Error creating alumni:", err); // Tambahkan logging error
            return res.render('pages/admin/alumni_list', {
                alumni: allAlumni,
                tracerStudy: allTracerStudy, // Menggunakan allTracerStudy di sini
                error: 'Terjadi kesalahan. Mohon coba lagi.',
                nama,
                nisn
            });
        }
    },
    storeAlumniExcel: async function (req, res) {

        // Pastikan file diunggah

        if (!req.file) {

            req.flash('error_msg', 'Tidak ada file Excel yang diunggah.');

            return res.redirect('/admin/alumni-list');

        }



        const filePath = req.file.path; // Path file sementara yang diunggah oleh Multer

        let successCount = 0;

        let errorCount = 0;

        const errorDetails = [];



        try {

            // Membaca file Excel

            const workbook = XLSX.readFile(filePath);

            const sheetName = workbook.SheetNames[0]; // Ambil sheet pertama

            const sheet = workbook.Sheets[sheetName];



            // --- PERBAIKAN: Normalisasi nama kolom (header) agar case-insensitive ---

            const rawData = XLSX.utils.sheet_to_json(sheet);

            const data = rawData.map(row => {

                const normalizedRow = {};

                for (const key in row) {

                    if (Object.prototype.hasOwnProperty.call(row, key)) {

                        const lowerCaseKey = key.toLowerCase();

                        if (lowerCaseKey === 'no') normalizedRow.No = row[key]; // Jika Anda ingin mempertahankan kolom 'No'

                        else if (lowerCaseKey === 'nisn') normalizedRow.NISN = row[key];

                        else if (lowerCaseKey === 'nama') normalizedRow.Nama = row[key];

                        else if (lowerCaseKey === 'jenis kelamin') normalizedRow['Jenis Kelamin'] = row[key]; // Gunakan nama yang konsisten

                        else if (lowerCaseKey === 'password') normalizedRow.Password = row[key];

                        // Tambahkan kolom lain jika ada dan Anda ingin menormalisasinya

                        else normalizedRow[key] = row[key]; // Pertahankan kolom lain jika tidak dikenal

                    }

                }

                return normalizedRow;

            });

            // --- AKHIR PERBAIKAN ---



            // Proses setiap baris data dari Excel

            for (const row of data) {

                // Akses properti dengan nama yang sudah dinormalisasi

                const nisn = row.NISN ? String(row.NISN).trim() : '';

                const nama = row.Nama ? String(row.Nama).trim() : '';

                let jenisKelamin = row['Jenis Kelamin'] ? String(row['Jenis Kelamin']).trim() : ''; // Menggunakan 'let' karena nilainya akan diubah

                const password = row.Password ? String(row.Password).trim() : '';



                // --- Normalisasi Jenis Kelamin (tetap dipertahankan) ---

                const lowerCaseJenisKelamin = jenisKelamin.toLowerCase();

                if (lowerCaseJenisKelamin.includes('laki')) {

                    jenisKelamin = 'Laki-laki';

                } else if (lowerCaseJenisKelamin.includes('perempuan')) {

                    jenisKelamin = 'Perempuan';

                }

                // --- AKHIR Normalisasi Jenis Kelamin ---



                // Validasi dasar data per baris

                if (!nisn || !nama || !jenisKelamin || !password) {

                    errorCount++;

                    errorDetails.push(`Baris NISN '${nisn || 'Kosong'}': Data tidak lengkap (NISN, Nama, Jenis Kelamin, atau Password kosong).`);

                    continue; // Lanjut ke baris berikutnya

                }



                // Validasi panjang NISN (minimal 10 angka)

                if (nisn.length < 10) {

                    errorCount++;

                    errorDetails.push(`Baris NISN '${nisn}': NISN harus terdiri dari minimal 10 angka.`);

                    continue;

                }



                // Validasi panjang Password (minimal 6 karakter)

                if (password.length < 6) {

                    errorCount++;

                    errorDetails.push(`Baris NISN '${nisn}': Password harus terdiri dari minimal 6 karakter.`);

                    continue;

                }



                // Validasi Jenis Kelamin (harus "Laki-laki" atau "Perempuan" setelah normalisasi)

                if (!['Laki-laki', 'Perempuan'].includes(jenisKelamin)) {

                    errorCount++;

                    errorDetails.push(`Baris NISN '${nisn}': Jenis Kelamin tidak valid setelah normalisasi. Harus 'Laki-laki' atau 'Perempuan'.`);

                    continue;

                }



                try {

                    // Cek apakah NISN sudah terdaftar di database

                    const existingAlumni = await Alumni.findOne({ nisn: nisn });

                    if (existingAlumni) {

                        errorCount++;

                        errorDetails.push(`Baris NISN '${nisn}': NISN sudah terdaftar.`);

                        continue;

                    }



                    // Enkripsi password

                    const hashedPassword = await bcrypt.hash(password, 10);



                    // Buat objek alumni baru

                    const newAlumni = new Alumni({

                        nisn: nisn,

                        nama: nama,

                        jenisKelamin: jenisKelamin,

                        password: hashedPassword,

                    });



                    await newAlumni.save(); // Simpan alumni

                    successCount++;



                } catch (dbError) {

                    errorCount++;

                    if (dbError.code === 11000 && dbError.keyPattern && dbError.keyPattern.nisn) {

                        errorDetails.push(`Baris NISN '${nisn}': NISN duplikat (sudah ada di database).`);

                    } else {

                        errorDetails.push(`Baris NISN '${nisn}': Gagal menyimpan ke database - ${dbError.message}`);

                    }

                }

            }



            // Hapus file sementara setelah diproses

            fs.unlink(filePath, (err) => {

                if (err) console.error("Error menghapus file sementara:", err);

            });



            // Kirim flash message hasil impor

            let message = `Impor selesai: ${successCount} alumni berhasil ditambahkan.`;

            if (errorCount > 0) {

                message += `<br> ${errorCount} alumni gagal diimpor. Detail:<br>- ` + errorDetails.join('<br>- ');

                req.flash('error_msg', message);

            } else {

                req.flash('success_msg', message);

            }



            return res.redirect('/admin/alumni-list');



        } catch (error) {

            console.error("Error processing Excel file:", error);

            // Hapus file sementara jika terjadi error saat pemrosesan

            fs.unlink(filePath, (err) => {

                if (err) console.error("Error menghapus file sementara setelah crash:", err);

            });

            req.flash('error_msg', 'Terjadi kesalahan saat memproses file Excel.');

            return res.redirect('/admin/alumni-list');

        }

    },
    viewAlumniList: async function (req, res) {
        const alumni = await Alumni.find({});
        let dataTracerStudy = [];
        for (var i = 0; i < alumni.length; i++) {
            const tracerStudy = await TracerStudy.find({ alumniId: alumni[i]._id });
            dataTracerStudy.push(tracerStudy[0]);
        }
        return res.render('pages/admin/alumni_list', { alumni: alumni, tracerStudy: dataTracerStudy });
    },

    viewAlumniDetail: async function (req, res) {
        const { nisn } = req.params;
        const alumni = await Alumni.findOne({ nisn: nisn });
        const tracerStudy = await TracerStudy.find({ alumniId: alumni._id }).populate('kegiatanDetail').populate('feedback')
        return res.render('pages/admin/alumni_detail', { alumni: alumni, tracerStudy: tracerStudy });
    },

    deleteAlumni: async function (req, res) {
        const { nisn } = req.body;
        try {
            // Hapus data alumni berdasarkan NISN
            const alumni = await Alumni.findOneAndDelete({ nisn: nisn });

            // Jika alumni tidak ditemukan
            if (!alumni) {
                req.flash('error_msg', 'Data alumni tidak ditemukan.');
                return res.redirect('/admin/alumni-list');
            }

            // Hapus tracer study yang terkait
            const tracerStudy = await TracerStudy.findOne({ alumniId: alumni._id });

            // Jika tracer study ditemukan, hapus data terkait berdasarkan kegiatan
            if (tracerStudy) {
                const deletions = [];

                if (tracerStudy.kegiatan === "Bekerja") {
                    deletions.push(Pekerjaan.findOneAndDelete({ alumniId: alumni._id }));
                } else if (tracerStudy.kegiatan === "Melanjutkan Studi") {
                    deletions.push(StudiLanjutan.findOneAndDelete({ alumniId: alumni._id }));
                } else if (tracerStudy.kegiatan === "Berwirausaha") {
                    deletions.push(Berwirausaha.findOneAndDelete({ alumniId: alumni._id }));
                } else if (tracerStudy.kegiatan === "Kursus") {
                    deletions.push(Kursus.findOneAndDelete({ alumniId: alumni._id }));
                }
                if (tracerStudy.kegiatan === "Feedback") {
                    deletions.push(Feedback.findOneAndDelete({ alumniId: alumni._id }));
                }

                // Jalankan semua operasi penghapusan terkait secara paralel
                await Promise.all(deletions);
            }

            tracerStudy && await TracerStudy.findOneAndDelete({ alumniId: alumni._id });

            // Jika berhasil, kirim pesan sukses
            req.flash('success_msg', `Data alumni dengan NISN ${nisn} berhasil dihapus.`);
            return res.redirect('/admin/alumni-list');
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Terjadi kesalahan saat menghapus data.');
            return res.redirect('/admin/alumni-list');
        }
    },
    alumniUpdate: async function (req, res) {
        const { nisnLama } = req.params; // Ambil NISN lama dari parameter URL
        const { nama, jenisKelamin, nisn: nisnBaru, password } = req.body; // Ambil data lain dari req.body

        try {
            // Trim spasi pada NISN baru untuk konsistensi
            const trimmedNisnBaru = nisnBaru.trim();

            // Validasi panjang NISN baru
            if (trimmedNisnBaru.length < 10) {
                req.flash('error_msg', 'NISN harus terdiri dari minimal 10 angka.');
                return res.redirect('/admin/alumni-list');
            }

            // Cari alumni yang sedang diupdate berdasarkan NISN lama (nisnLama)
            const currentAlumniDoc = await Alumni.findOne({ nisn: nisnLama });

            if (!currentAlumniDoc) {
                req.flash('error_msg', 'Alumni yang akan diperbarui tidak ditemukan.');
                return res.redirect('/admin/alumni-list');
            }

            // Validasi apakah NISN baru sudah ada di database (jika diubah dan bukan NISN alumni saat ini)
            if (trimmedNisnBaru !== nisnLama) { // Hanya cek jika NISN memang diubah
                const conflictingAlumni = await Alumni.findOne({
                    nisn: trimmedNisnBaru,
                    _id: { $ne: currentAlumniDoc._id } // Pastikan bukan dokumen yang sedang diupdate
                });
                if (conflictingAlumni) {
                    req.flash('error_msg', 'NISN baru sudah digunakan oleh alumni lain.');
                    return res.redirect('/admin/alumni-list');
                }
            }

            // Data yang akan diperbarui (default tanpa password)
            const updateData = {
                nisn: trimmedNisnBaru, // Gunakan NISN yang sudah di-trim
                nama: nama.trim(), // Trim nama juga
                jenisKelamin: jenisKelamin.trim() // Trim jenis kelamin juga
            };

            // Jika password baru diisi, enkripsi dan tambahkan ke updateData
            if (password && password.trim() !== '') {
                // Opsional: Validasi panjang password baru jika diisi
                if (password.length < 6) { // Contoh: minimal 6 karakter
                    req.flash('error_msg', 'Password baru harus terdiri dari minimal 6 karakter.');
                    return res.redirect('/admin/alumni-list');
                }
                const salt = await bcrypt.genSalt(10);
                updateData.password = await bcrypt.hash(password, salt);
            }

            // Update data alumni berdasarkan _id dokumen yang ditemukan
            const alumni = await Alumni.findByIdAndUpdate(
                currentAlumniDoc._id, // Gunakan _id untuk update yang lebih akurat
                updateData, // Data yang diperbarui
                { new: true, runValidators: true } // Mengembalikan data terbaru setelah update dan menjalankan validasi skema
            );

            // Flash pesan sukses
            req.flash('success_msg', 'Alumni berhasil diperbarui!');
            return res.redirect('/admin/alumni-list'); // Redirect kembali ke daftar alumni
        } catch (err) {
            console.error('Error saat update alumni:', err.message, err.stack);

            // Flash pesan error dan redirect kembali
            req.flash('error_msg', 'Terjadi kesalahan. Mohon coba lagi.');
            return res.redirect('/admin/alumni-list');
        }
    },
    profile: async function (req, res) {
        const { id } = req.session.user;
        const admin = await Admin.findOne({ _id: id });
        return res.render('pages/admin/profile', { admin: admin });
    },
    // Asumsikan Admin model sudah di-require
    // const Admin = require('../models/Admin');

    profileUpdate: async function (req, res) {
        // Ambil ID dari hidden input form, bukan dari params
        const { id, nama, email } = req.body;

        try {
            // 1. Cari admin yang sedang diupdate untuk mendapatkan email lamanya
            const currentAdmin = await Admin.findById(id);

            if (!currentAdmin) {
                req.flash('error_msg', 'Admin tidak ditemukan.');
                return res.redirect('/admin/profile');
            }

            // 2. Cek apakah email baru sudah digunakan oleh admin lain (selain admin yang sedang diupdate)
            // Hanya lakukan pengecekan jika email yang diinput berbeda dari email saat ini
            if (email !== currentAdmin.email) {
                const existingAdminWithNewEmail = await Admin.findOne({ email: email, _id: { $ne: id } });
                if (existingAdminWithNewEmail) {
                    req.flash('error_msg', 'Email sudah digunakan oleh admin lain.');
                    return res.redirect('/admin/profile');
                }
            }

            // 3. Lakukan update profil
            const updatedAdmin = await Admin.findOneAndUpdate(
                { _id: id }, // Kriteria pencarian
                { nama: nama, email: email }, // Data yang akan diupdate
                { new: true, runValidators: true } // Opsi: kembalikan dokumen yang sudah diupdate, jalankan validator skema
            );

            if (!updatedAdmin) {
                // Ini seharusnya tidak terjadi jika currentAdmin ditemukan, tapi sebagai fallback
                req.flash('error_msg', 'Gagal memperbarui profil.');
                return res.redirect('/admin/profile');
            }

            req.flash('success_msg', 'Profil berhasil diperbarui!');
            return res.redirect('/admin/profile');

        } catch (error) {
            console.error("Error updating profile:", error);
            req.flash('error_msg', 'Terjadi kesalahan saat memperbarui profil.');
            return res.redirect('/admin/profile');
        }
    },
    profileUpdatePassword: async function (req, res) {
        const adminId = req.session.user._id;

        // Ambil data dari body request (dari form ganti password)
        const { passwordLama, passwordBaru, confirmPassword } = req.body;

        try {
            // 2. Cari admin berdasarkan ID yang didapat dari sesi
            const admin = await Admin.findById(adminId);

            if (!admin) {
                req.flash('error_msg', 'Admin tidak ditemukan atau sesi tidak valid.');
                return res.redirect('/admin/profile'); // Redirect ke halaman profil atau login
            }

            // 3. Verifikasi password lama
            // Gunakan bcrypt.compare() untuk membandingkan password lama yang diinput
            // dengan password ter-hash yang tersimpan di database
            const isPasswordValid = await bcrypt.compare(passwordLama.trim(), admin.password);
            if (!isPasswordValid) {
                req.flash('error_msg', 'Password lama salah.');
                return res.redirect('/admin/profile');
            }

            // 4. Verifikasi password baru dan konfirmasi password baru
            if (passwordBaru !== confirmPassword) {
                req.flash('error_msg', 'Password baru dan konfirmasi password tidak cocok.');
                return res.redirect('/admin/profile');
            }

            // minimal panjang karakter
            if (passwordBaru.trim().length < 6) { // Contoh validasi minimal 6 karakter
                req.flash('error_msg', 'Password baru minimal 6 karakter.');
                return res.redirect('/admin/profile');
            }

            // 5. Hash password baru dan simpan ke database
            const hashedPassword = await bcrypt.hash(passwordBaru.trim(), 10); // Trim password baru sebelum hash

            const updatedAdmin = await Admin.findOneAndUpdate(
                { _id: adminId }, // Kriteria pencarian berdasarkan ID dari sesi
                { password: hashedPassword }, // Data yang akan diupdate
                { new: true, runValidators: true } // Opsi: kembalikan dokumen yang sudah diupdate, jalankan validator skema
            );

            if (!updatedAdmin) {
                req.flash('error_msg', 'Gagal memperbarui password.');
                return res.redirect('/admin/profile');
            }

            req.flash('success_msg', 'Password berhasil diperbarui!');
            // Setelah ganti password, Anda mungkin ingin mengarahkan ulang ke halaman profil
            // atau bahkan meminta admin untuk login ulang demi keamanan
            return res.redirect('/admin/profile');

        } catch (error) {
            console.error("Error changing password:", error);
            req.flash('error_msg', 'Terjadi kesalahan saat mengganti password.');
            return res.redirect('/admin/profile');
        }
    },
    viewBerita: async function (req, res) {
        try {
            const allBerita = await Berita.find().sort({ createdAt: -1 });
            return res.render('pages/admin/berita', { berita: allBerita });
        } catch (error) {
            console.error(error);
            req.flash('error_msg', 'Terjadi kesalahan saat mengambil daftar berita.');
            res.redirect('/admin/berita'); // Ganti dengan route halaman error
        }
    }, storeBerita: async function (req, res) {
        try {
            const { judulBerita, isiBerita } = req.body;
            const featuredImage = req.file ? req.file.filename : '';

            const newBerita = new Berita({
                title: judulBerita,
                content: isiBerita,
                featuredImage,
            });

            await newBerita.save();

            req.flash('success_msg', 'Berita berhasil ditambahkan!');
            res.redirect('/admin/berita');
        } catch (error) {
            console.error(error);
            req.flash('error_msg', 'Terjadi kesalahan saat menambahkan berita.');
            res.redirect('/admin/berita');
        }
    },
    viewBeritaDetail: async function (req, res) {
        try {
            const { beritaId } = req.params;

            // Ambil berita berdasarkan ID
            const berita = await Berita.findById(beritaId);

            // Jika tidak ditemukan
            if (!berita) {
                req.flash('error_msg', 'Berita tidak ditemukan');
                return res.redirect('/admin/berita'); // arahkan kembali ke daftar berita
            }

            // Kirim data ke view
            res.render('pages/admin/berita_detail', {
                berita,
            });
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Terjadi kesalahan saat memuat detail berita');
            return res.redirect('/admin/berita');
        }
    }, deleteBerita: async function (req, res) {
        const { beritaId } = req.params;

        try {
            // Cari data berita berdasarkan ID
            const berita = await Berita.findById(beritaId);

            if (!berita) {
                req.flash('error_msg', 'Berita tidak ditemukan');
                return res.redirect('/admin/berita');
            }

            // Hapus file gambar jika ada
            const imagePath = path.join(__dirname, '../../public/uploads/', berita.featuredImage);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }

            // Hapus data dari database
            await Berita.findByIdAndDelete(beritaId);

            req.flash('success_msg', 'Berita berhasil dihapus');
            res.redirect('/admin/berita');
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Gagal menghapus berita');
            res.redirect('/admin/berita');
        }
    }, beritaUpdate: async function (req, res) {
        try {
            const { idBerita, judulBerita, isiBerita } = req.body;

            const file = req.file;

            const berita = await Berita.findById(idBerita);
            if (!berita) {
                req.flash('error_msg', 'Berita tidak ditemukan.');
                return res.redirect('/admin/berita');
            }

            let newImageFilename = berita.featuredImage; // default: tidak ganti gambar

            if (file) {
                // Hapus gambar lama
                const oldImagePath = path.join(__dirname, '../../public/uploads/', berita.featuredImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }

                // Simpan nama file baru
                newImageFilename = file.filename;
            }

            // Update berita
            berita.title = judulBerita;
            berita.content = isiBerita;
            berita.featuredImage = newImageFilename;

            await berita.save();

            req.flash('success_msg', 'Berita berhasil diperbarui!');
            res.redirect('/admin/berita');
        } catch (error) {
            console.error(error);
            req.flash('error_msg', 'Terjadi kesalahan saat memperbarui berita.');
            res.redirect('/admin/berita');
        }
    },
    viewLowongan: async function (req, res) {
        try {
            const allLowongan = await Lowongan.find().sort({ createdAt: -1 });
            return res.render('pages/admin/lowongan', { lowongan: allLowongan });
        } catch (error) {
            console.error(error);
            req.flash('error_msg', 'Terjadi kesalahan saat mengambil daftar lowongan.');
            res.redirect('/admin/lowongan'); // Ganti dengan route halaman error
        }
    }, storeLowongan: async function (req, res) {
        try {
            const { judulLowongan, isiLowongan } = req.body;
            const featuredImage = req.file ? req.file.filename : '';

            const newLowongan = new Lowongan({
                title: judulLowongan,
                content: isiLowongan,
                featuredImage,
            });

            await newLowongan.save();

            req.flash('success_msg', 'lowongan berhasil ditambahkan!');
            res.redirect('/admin/lowongan');
        } catch (error) {
            console.error(error);
            req.flash('error_msg', 'Terjadi kesalahan saat menambahkan lowongan.');
            res.redirect('/admin/lowongan');
        }
    },
    viewLowonganDetail: async function (req, res) {
        try {
            const { lowonganId } = req.params;

            // Ambil Lowongan berdasarkan ID
            const lowongan = await Lowongan.findById(lowonganId);

            // Jika tidak ditemukan
            if (!lowongan) {
                req.flash('error_msg', 'lowongan tidak ditemukan');
                return res.redirect('/admin/lowongan'); // arahkan kembali ke daftar Lowongan
            }

            // Kirim data ke view
            res.render('pages/admin/lowongan_detail', {
                lowongan,
            });
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Terjadi kesalahan saat memuat detail lowongan');
            return res.redirect('/admin/lowongan');
        }
    }, deleteLowongan: async function (req, res) {
        const { lowonganId } = req.params;

        try {
            // Cari data Lowongan berdasarkan ID
            const lowongan = await Lowongan.findById(lowonganId);

            if (!lowongan) {
                req.flash('error_msg', 'Lowongan tidak ditemukan');
                return res.redirect('/admin/lowongan');
            }

            // Hapus file gambar jika ada
            const imagePath = path.join(__dirname, '../../public/uploads/', lowongan.featuredImage);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }

            // Hapus data dari database
            await Lowongan.findByIdAndDelete(lowonganId);

            req.flash('success_msg', 'Lowongan berhasil dihapus');
            res.redirect('/admin/lowongan');
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Gagal menghapus lowongan');
            res.redirect('/admin/lowongan');
        }
    }, lowonganUpdate: async function (req, res) {
        try {
            const { idLowongan, judulLowongan, isiLowongan } = req.body;

            const file = req.file;

            const lowongan = await Lowongan.findById(idLowongan);
            if (!lowongan) {
                req.flash('error_msg', 'Lowongan tidak ditemukan.');
                return res.redirect('/admin/lowongan');
            }

            let newImageFilename = lowongan.featuredImage; // default: tidak ganti gambar

            if (file) {
                // Hapus gambar lama
                const oldImagePath = path.join(__dirname, '../../public/uploads/', lowongan.featuredImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }

                // Simpan nama file baru
                newImageFilename = file.filename;
            }

            // Update Lowongan
            lowongan.title = judulLowongan;
            lowongan.content = isiLowongan;
            lowongan.featuredImage = newImageFilename;

            await lowongan.save();

            req.flash('success_msg', 'Lowongan berhasil diperbarui!');
            res.redirect('/admin/lowongan');
        } catch (error) {
            console.error(error);
            req.flash('error_msg', 'Terjadi kesalahan saat memperbarui lowongan.');
            res.redirect('/admin/lowongan');
        }
    },
    viewSaran: async function (req, res) {
        try {
            const allSaran = await Saran.find().sort({ createdAt: -1 });
            return res.render('pages/admin/saran', { saran: allSaran });
        } catch (error) {
            console.error(error);
            req.flash('error_msg', 'Terjadi kesalahan saat mengambil daftar Saran.');
            res.redirect('/admin/saran'); // Ganti dengan route halaman error
        }
    }, deleteSaran: async function (req, res) {
        const { saranId } = req.params;

        try {
            // Cari data berita berdasarkan ID
            const saran = await Saran.findById(saranId);

            if (!saran) {
                req.flash('error_msg', 'Saran tidak ditemukan');
                return res.redirect('/admin/saran');
            }

            // Hapus data dari database
            await Saran.findByIdAndDelete(saranId);

            req.flash('success_msg', 'Saran berhasil dihapus');
            res.redirect('/admin/saran');
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Gagal menghapus saran');
            res.redirect('/admin/saran');
        }
    }, showForgotPasswordForm: async function (req, res) {
        res.render('pages/forgot_password');
    }, sendResetPasswordLink: async function (req, res) {
        try {
            const { email } = req.body;
            const admin = await Admin.findOne({ email: email });

            if (!admin) {
                req.flash('error_msg', 'Email tidak terdaftar.');
                return res.redirect('/forgot-password'); // PATH INI TETAP SESUAI PERMINTAAN ANDA
            }

            // 1. Buat token reset password
            const resetToken = crypto.randomBytes(20).toString('hex');
            // 2. Simpan token dan waktu kedaluwarsa di database (misal: 1 jam dari sekarang)
            admin.resetPasswordToken = resetToken;
            admin.resetPasswordExpires = Date.now() + 3600000; // 1 jam
            await admin.save();

            // 3. Buat URL reset password
            // Penting: Pastikan req.headers.host menghasilkan domain yang benar
            // Misalnya: 'localhost:3000' atau 'yourdomain.com'
            const resetUrl = `http://${req.headers.host}/reset-password/${resetToken}`;

            // 4. Kirim email
            const mailOptions = {
                to: admin.email,
                from: process.env.EMAIL_USER, // Harus sama dengan user di transporter.auth
                subject: 'Reset Password Akun Admin Anda',
                html: `Anda menerima email ini karena (Anda atau orang lain) telah meminta reset password untuk akun Anda.<br>
                   Silakan klik tautan berikut, atau salin dan tempel di browser Anda untuk menyelesaikan proses:<br><br>
                   <a href="${resetUrl}">${resetUrl}</a><br><br>
                   Tautan ini akan kedaluwarsa dalam satu jam.<br>
                   Jika Anda tidak meminta ini, abaikan email ini dan password Anda akan tetap tidak berubah.`
            };

            await transporter.sendMail(mailOptions);

            req.flash('success_msg', 'Tautan reset password telah dikirim ke email Anda. Silakan cek kotak masuk Anda.');
            res.redirect('/forgot-password'); // PATH INI TETAP SESUAI PERMINTAAN ANDA

        } catch (error) {
            console.error("Error sending reset password link:", error);
            req.flash('error_msg', 'Terjadi kesalahan saat mengirim tautan reset password. Mohon coba lagi nanti.');
            res.redirect('/forgot-password'); // PATH INI TETAP SESUAI PERMINTAAN ANDA
        }
    }, showResetPasswordForm: async function (req, res) {
        try {
            const admin = await Admin.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: Date.now() } // $gt: greater than (lebih dari)
            });

            if (!admin) {
                req.flash('error_msg', 'Tautan reset password tidak valid atau telah kedaluwarsa.');
                return res.redirect('/forgot-password');
            }

            res.render('pages/reset_password', { token: req.params.token }); // Sesuaikan dengan path file EJS/HTML Anda
        } catch (error) {
            console.error("Error showing reset password form:", error);
            req.flash('error_msg', 'Terjadi kesalahan.');
            res.redirect('/forgot-password');
        }
    }, resetPassword: async function (req, res) {
        try {
            const { newPassword, confirmNewPassword } = req.body;

            if (newPassword !== confirmNewPassword) {
                req.flash('error_msg', 'Password baru dan konfirmasi password tidak cocok.');
                return res.redirect(`/reset-password/${req.params.token}`);
            }

            const admin = await Admin.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: Date.now() }
            });

            if (!admin) {
                req.flash('error_msg', 'Tautan reset password tidak valid atau telah kedaluwarsa.');
                return res.redirect('/forgot-password');
            }

            // --- Perubahan PENTING di SINI ---
            // HASH PASSWORD SECARA MANUAL SEBELUM MENYIMPANYA
            const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
            admin.password = hashedPassword; // Set password yang sudah di-hash
            // --- Akhir Perubahan PENTING ---

            admin.resetPasswordToken = undefined; // Hapus token
            admin.resetPasswordExpires = undefined; // Hapus waktu kedaluwarsa
            await admin.save(); // Sekarang ini hanya akan menyimpan, tidak akan re-hash lagi karena sudah di-hash manual

            // Tambahkan log untuk melihat password yang baru di-hash dan disimpan
            console.log("Password baru setelah di-hash dan disimpan:", hashedPassword);

            req.flash('success_msg', 'Password Anda berhasil direset. Silakan login dengan password baru.');
            res.redirect('/loginAdmin');

        } catch (error) {
            console.error("Error resetting password:", error);
            req.flash('error_msg', 'Terjadi kesalahan saat mereset password.');
            res.redirect(`/reset-password/${req.params.token}`);
        }
    }, resetPassword: async function (req, res) {
        try {
            const { newPassword, confirmNewPassword } = req.body;

            // Validasi password baru (harus sama)
            if (newPassword !== confirmNewPassword) {
                req.flash('error_msg', 'Password baru dan konfirmasi password tidak cocok.');
                return res.redirect(`/reset-password/${req.params.token}`);
            }

            const admin = await Admin.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: Date.now() }
            });

            if (!admin) {
                req.flash('error_msg', 'Tautan reset password tidak valid atau telah kedaluwarsa.');
                return res.redirect('/forgot-password');
            }

            // Hash password baru dan update
            admin.password = await bcrypt.hash(newPassword.trim(), 10);
            admin.resetPasswordToken = undefined; // Hapus token
            admin.resetPasswordExpires = undefined; // Hapus waktu kedaluwarsa
            await admin.save();

            req.flash('success_msg', 'Password Anda berhasil direset. Silakan login dengan password baru.');
            res.redirect('/loginAdmin'); // Atau halaman login admin Anda

        } catch (error) {
            console.error("Error resetting password:", error);
            req.flash('error_msg', 'Terjadi kesalahan saat mereset password.');
            res.redirect(`/reset-password/${req.params.token}`); // Redirect kembali ke form reset dengan token yang sama
        }
    },
}