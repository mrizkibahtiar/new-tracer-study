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
        const { nama, nisn, jenisKelamin } = req.body;
        console.log(req.body);
        try {
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

            // Membuat objek untuk alumni
            const alumniData = {
                nisn: nisn.trim(),
                nama: nama.trim(),
                jenisKelamin: jenisKelamin.trim(),
            };

            // Mengecek apakah NISN sudah terdaftar
            const existingAlumni = await Alumni.findOne({ nisn: alumniData.nisn });
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
                tracerStudy: dataTracerStudy,
                error: 'Terjadi kesalahan. Mohon coba lagi.',
                nama,
                nisn
            });
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
        const { editNisn, nama, jenisKelamin, nisn: nisnBaru } = req.body; // Data dari form, termasuk editNisn sebagai NISN lama dan nisn sebagai NISN baru

        try {
            // Validasi panjang NISN baru
            if (nisnBaru.length < 10) {
                req.flash('error_msg', 'NISN harus terdiri dari minimal 10 angka.');
                return res.redirect('/admin/alumni-list'); // Redirect ke daftar alumni
            }

            // Validasi apakah NISN baru sudah ada di database (jika diubah)
            if (nisnBaru !== editNisn) {
                const existingAlumni = await Alumni.findOne({ nisn: nisnBaru });
                if (existingAlumni) {
                    req.flash('error_msg', 'NISN baru sudah digunakan.');
                    return res.redirect('/admin/alumni-list'); // Redirect ke daftar alumni
                }
            }

            // Data yang akan diperbarui
            const updateData = {
                nisn: nisnBaru,
                nama: nama,
                jenisKelamin: jenisKelamin
            };

            // Update data alumni berdasarkan NISN lama (editNisn)
            const alumni = await Alumni.findOneAndUpdate(
                { nisn: editNisn }, // Kondisi pencarian menggunakan NISN lama dari input hidden
                updateData, // Data yang diperbarui
                { new: true, runValidators: true } // Mengembalikan data terbaru setelah update dan menjalankan validasi skema
            );

            if (!alumni) {
                req.flash('error_msg', 'Alumni dengan NISN tersebut tidak ditemukan.');
                return res.redirect('/admin/alumni-list');
            }

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
    }
}