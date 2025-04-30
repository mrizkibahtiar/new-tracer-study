const Admin = require('../models/admin');
const Alumni = require('../models/alumni');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const TracerStudy = require('../models/tracerStudy');
const Kursus = require('../models/kursus');
const Pekerjaan = require('../models/pekerjaan');
const StudiLanjutan = require('../models/studiLanjutan');
const Berwirausaha = require('../models/berwirausaha');
const Feedback = require('../models/feedback');


module.exports = {
    index: async function (req, res) {
        if (!req.session.user) {
            return res.redirect('/loginPage'); // Redirect ke halaman login jika user belum login
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
            const percentage =
                alumni.length > 0 ? Math.round((tracerStudy.length / alumni.length) * 100) : 0;

            return res.render('pages/admin/dashboard', {
                admin,
                percentage,
                berkegiatan,
                belumAdaKegiatan,
                bekerja,
                berwirausaha,
                studiLanjutan,
                kursus,
                jumlahAdmin,
                jumlahAlumni: alumni.length,
                jumlahTracer: tracerStudy.length
            });
        } catch (err) {
            console.error(err);
            return res.status(500).send('Terjadi kesalahan pada server.');
        }
    },

    alumniForm: function (req, res) {
        res.render('pages/admin/alumni_form');
    },

    store: async function (req, res) {
        const { nama, nisn, jenisKelamin, password } = req.body;
        try {
            // Hash password dengan bcrypt sebelum menyimpan
            const hashedPassword = await bcrypt.hash(password.trim(), 10);
            // Membuat objek untuk alumni
            const alumniData = {
                nisn: nisn.trim(),
                nama: nama.trim(),
                jenisKelamin: jenisKelamin.trim(),
                password: hashedPassword,
            };

            // Mengecek apakah NISN sudah terdaftar
            const existingAlumni = await Alumni.findOne({ nisn: alumniData.nisn });
            if (existingAlumni) {
                return res.render('pages/admin/alumni_form', { error: 'NISN sudah terdaftar. Mohon gunakan NISN lain.', nama, nisn });
            }

            // Membuat alumni
            const alumni = await Alumni.create(alumniData);

            // Mengirim success message jika berhasil
            res.render('pages/admin/alumni_form', { success: 'Alumni berhasil ditambahkan!', alumni: alumni });
        } catch (err) {
            if (err.code === 11000 && err.keyPattern.nisn) {
                return res.render('pages/admin/alumni_form', { error: 'NISN sudah terdaftar. Mohon gunakan NISN lain.', nama, nisn });
            }
            // Error lainnya
            return res.render('pages/admin/alumni_form', { error: 'Terjadi kesalahan. Mohon coba lagi.', nama, nisn });
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
        const { nisn } = req.params;
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
    }
    ,

    alumniUpdate: async function (req, res) {
        const { nisn } = req.params; // NISN dari URL
        const { nisnBaru, nama, jenisKelamin } = req.body; // Data dari form

        try {
            // Validasi apakah NISN baru sudah ada di database
            if (nisnBaru !== nisn) {
                const existingAlumni = await Alumni.findOne({ nisn: nisnBaru });
                if (existingAlumni) {
                    req.flash('error_msg', 'NISN baru sudah digunakan.');
                    return res.redirect('/admin/alumni-list/' + nisn);
                }
            }

            // Data yang akan diperbarui
            const updateData = {
                nisn: nisnBaru,
                nama: nama,
                jenisKelamin: jenisKelamin
            };

            // Update data alumni berdasarkan NISN lama
            const alumni = await Alumni.findOneAndUpdate(
                { nisn: nisn }, // Kondisi pencarian
                updateData, // Data yang diperbarui
                { new: true } // Mengembalikan data terbaru setelah update
            );

            // Flash pesan sukses
            req.flash('success_msg', 'Alumni berhasil diperbarui!');
            return res.redirect('/admin/alumni-list/' + nisnBaru);
        } catch (err) {
            console.error('Error saat update alumni:', err.message, err.stack);

            // Flash pesan error dan redirect kembali
            req.flash('error_msg', 'Terjadi kesalahan. Mohon coba lagi.');
            return res.redirect('/admin/alumni-list/' + nisn);
        }
    },

    alumniUpdatePassword: async function (req, res) {
        const { nisn } = req.params;
        const { password, confirmPassword } = req.body;

        if (!password || !confirmPassword) {
            req.flash('error_msg', 'Semua field wajib diisi.');
            return res.redirect('/admin/alumni-list/' + nisn);
        }

        if (password !== confirmPassword) {
            req.flash('error_msg', 'Password dan konfirmasi password tidak cocok.');
            return res.redirect('/admin/alumni-list/' + nisn);
        }

        try {
            // Hash password sebelum menyimpannya
            const hashedPassword = await bcrypt.hash(password.trim(), 10);

            const alumni = await Alumni.findOneAndUpdate(
                { nisn: nisn },
                { password: hashedPassword },
                { new: true }
            );

            if (!alumni) {
                req.flash('error_msg', 'Alumni tidak ditemukan.');
                return res.redirect('/admin/alumni-list');
            }

            req.flash('success_msg', 'Password berhasil diperbarui!');
            return res.redirect('/admin/alumni-list/' + nisn);
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Terjadi kesalahan. Mohon coba lagi.');
            return res.redirect('/admin/alumni-list/' + nisn);
        }
    },

    profile: async function (req, res) {
        const { adminId } = req.session.user;
        const admin = await Admin.findOne({ _id: adminId });
        return res.render('pages/admin/profile', { admin: admin });
    },
    profileUpdate: async function (req, res) {
        const { adminId } = req.params;
        const { nama, email } = req.body;
        const semuaAdmin = await Admin.find({});
        // cek jika ada email yang sama maka tampilkan error, tapi jika email sama dengan email sebelumnya maka tidak tampilkan error
        for (let i = 0; i < semuaAdmin.length; i++) {
            if (semuaAdmin[i].email === email && semuaAdmin[i]._id != adminId) {
                req.flash('error_msg', 'Email sudah digunakan oleh admin lain.');
                return res.redirect('/admin/profile');
            }
        }
        const admin = await Admin.findOneAndUpdate({ _id: adminId }, { nama: nama, email: email }, { new: true });
        req.flash('success_msg', 'Profil berhasil diperbarui!');

        return res.redirect('/admin/profile');
    },
    profileUpdatePassword: async function (req, res) {
        const { email } = req.session.user;
        const { passwordLama, passwordBaru, confirmPassword } = req.body;
        const admin = await Admin.findOne({ email: email });
        const isPasswordValid = await bcrypt.compare(passwordLama.trim(), admin.password);
        if (!isPasswordValid) {
            req.flash('error_msg', 'Password lama salah.');
            return res.redirect('/admin/profile');
        }
        if (passwordBaru !== confirmPassword) {
            req.flash('error_msg', 'Password dan konfirmasi password tidak cocok.');
            return res.redirect('/admin/profile');
        }
        const hashedPassword = await bcrypt.hash(passwordBaru.trim(), 10);
        await Admin.findOneAndUpdate({ email: email }, { password: hashedPassword }, { new: true });
        req.flash('success_msg', 'Password berhasil diperbarui!');
        return res.redirect('/admin/profile');
    }
}