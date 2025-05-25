
const Alumni = require('../models/alumni');
const TracerStudy = require('../models/tracerStudy');
const Feedback = require('../models/feedback');
const Pekerjaan = require('../models/pekerjaan');
const StudiLanjutan = require('../models/studiLanjutan');
const Berwirausaha = require('../models/berwirausaha');
const Kursus = require('../models/kursus');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

module.exports = {
    index: async function (req, res) {
        if (!req.session.user) {
            return res.redirect('/loginPage');
        } else {
            const { nisn } = req.session.user;
            const alumni = await Alumni.findOne({ nisn: nisn });
            // --- Baris ini yang perlu sedikit penyesuaian ---
            const tracerStudy = await TracerStudy.find({ alumniId: alumni._id }).populate('kegiatanDetail').populate('feedback');
            return res.render('pages/alumni/dashboard', { alumni: alumni, tracerStudy: tracerStudy });
        }
    },
    profile: async function (req, res) {
        if (!req.session.user) {
            return res.redirect('/loginPage')
        } else {
            const { nisn } = req.session.user;
            const alumni = await Alumni.findOne({ nisn: nisn });
            return res.render('pages/alumni/profile', { alumni: alumni })
        }
    },
    profileUpdate: async function (req, res) {
        const { nisn } = req.params;
        const { nama, jenisKelamin } = req.body;
        const alumni = await Alumni.findOneAndUpdate({ nisn: nisn }, { nama: nama, jenisKelamin: jenisKelamin }, { new: true });
        req.flash('success_msg', 'Profil berhasil diperbarui!');
        return res.redirect('/alumni/profile');
    },
    profileUpdatePassword: async function (req, res) {
        const { nisn } = req.params;
        const { passwordLama, passwordBaru, confirmPassword } = req.body;
        const alumni = await Alumni.findOne({ nisn: nisn });
        const isPasswordValid = await bcrypt.compare(passwordLama.trim(), alumni.password);
        if (!isPasswordValid) {
            req.flash('error_msg', 'Password lama salah.');
            return res.redirect('/alumni/profile');
        }
        if (passwordBaru !== confirmPassword) {
            req.flash('error_msg', 'Password dan konfirmasi password tidak cocok.');
            return res.redirect('/alumni/profile');
        }
        const hashedPassword = await bcrypt.hash(passwordBaru.trim(), 10);
        await Alumni.findOneAndUpdate({ nisn: nisn }, { password: hashedPassword }, { new: true });
        req.flash('success_msg', 'Password berhasil diperbarui!');
        return res.redirect('/alumni/profile');
    },
    saveForm: async function (req, res) {
        try {
            const validRefs = {
                "Bekerja": "Pekerjaan", // Pastikan nama model sesuai (huruf besar/kecil)
                "Melanjutkan Studi": "StudiLanjutan",
                "Berwirausaha": "Berwirausaha",
                "Kursus": "Kursus"
            };

            // Pastikan req.session.user ada dan memiliki nisn (validasi login)
            if (!req.session.user || !req.session.user.nisn) {
                req.flash('error_msg', 'Anda harus login untuk mengisi form.');
                return res.redirect('/login'); // Atau halaman login Anda
            }

            const { nisn } = req.session.user;
            const { email, tahunLulus, kegiatan, feedbackDetail } = req.body;

            // Cari data alumni berdasarkan NISN
            const alumni = await Alumni.findOne({ nisn: nisn });

            if (!alumni) {
                req.flash('error_msg', 'Data alumni tidak ditemukan.');
                return res.redirect('/alumni'); // Atau halaman error/beranda alumni
            }

            let kegiatanRef = null;
            let kegiatanDetailId = null;
            let feedbackId = null;
            let belumAdaKegiatanText = null;

            // Proses penyimpanan berdasarkan jenis kegiatan
            if (kegiatan in validRefs) {
                kegiatanRef = validRefs[kegiatan];
                const KegiatanModel = mongoose.model(kegiatanRef);
                let kegiatanData;

                if (kegiatan === "Bekerja") {
                    const { namaPerusahaan, alamatPerusahaan, teleponPerusahaan, sektorPerusahaan, posisi, tanggalMasukBekerja } = req.body;
                    kegiatanData = new KegiatanModel({
                        alumniId: alumni._id,
                        namaPerusahaan: namaPerusahaan,
                        alamatPerusahaan: alamatPerusahaan,
                        teleponPerusahaan: teleponPerusahaan,
                        sektorPerusahaan: sektorPerusahaan,
                        posisi: posisi,
                        tanggalMasuk: tanggalMasukBekerja
                    });
                } else if (kegiatan === "Melanjutkan Studi") {
                    const { namaUniversitas, alamatUniversitas, fakultas, programStudi, tanggalMasukUniversitas } = req.body;
                    kegiatanData = new KegiatanModel({
                        alumniId: alumni._id,
                        namaUniversitas: namaUniversitas,
                        alamatUniversitas: alamatUniversitas,
                        fakultas: fakultas,
                        programStudi: programStudi,
                        tanggalMasuk: tanggalMasukUniversitas
                    });
                } else if (kegiatan === "Berwirausaha") {
                    const { namaUsaha, alamatUsaha, teleponUsaha, bidangUsaha, jumlahKaryawan, tanggalMulaiUsaha } = req.body;
                    kegiatanData = new KegiatanModel({
                        alumniId: alumni._id,
                        namaUsaha: namaUsaha,
                        alamatUsaha: alamatUsaha,
                        teleponUsaha: teleponUsaha,
                        bidangUsaha: bidangUsaha,
                        jumlahKaryawan: jumlahKaryawan,
                        tanggalMulai: tanggalMulaiUsaha
                    });
                } else if (kegiatan === "Kursus") {
                    const { namaKursus, alamatKursus, bidangKursus, tanggalMulaiKursus, tanggalSelesaiKursus } = req.body;
                    kegiatanData = new KegiatanModel({
                        alumniId: alumni._id,
                        namaKursus: namaKursus,
                        alamatKursus: alamatKursus,
                        bidangKursus: bidangKursus,
                        tanggalMulai: tanggalMulaiKursus,
                        tanggalSelesai: tanggalSelesaiKursus
                    });
                }

                const savedKegiatan = await kegiatanData.save();
                kegiatanDetailId = savedKegiatan._id;
            } else if (kegiatan === "Belum Ada Kegiatan") {
                kegiatanDetailId = null;
                belumAdaKegiatanText = req.body.kegiatanDetail;
            }

            const feedbackData = new Feedback({
                alumniId: alumni._id,
                pesan: feedbackDetail
            });

            const savedFeedback = await feedbackData.save();
            feedbackId = savedFeedback._id;

            const tracerStudyData = new TracerStudy({
                alumniId: alumni._id,
                email: email.trim(),
                tahunLulus: tahunLulus.trim(),
                kegiatan: kegiatan.trim(),
                kegiatanRef: kegiatanRef,
                kegiatanDetail: kegiatanDetailId,
                belumAdaKegiatanDetail: belumAdaKegiatanText,
                feedback: feedbackId
            });

            const savedTracerStudy = await tracerStudyData.save();

            // --- BAGIAN PERUBAHAN UTAMA DI SINI ---
            // Setelah sukses menyimpan, kita ingin me-render ulang halaman '/alumni'
            // namun dengan data tracer study yang sudah di-populate.
            const populatedTracerStudy = await TracerStudy.findById(savedTracerStudy._id)
                .populate('alumniId') // Opsional, jika Anda butuh data alumni di ringkasan
                .populate({
                    path: 'kegiatanDetail',
                    // Mongoose akan otomatis menggunakan 'kegiatanRef' dari dokumen tracerStudy
                    // sebagai nama model karena Anda sudah menggunakan refPath di skema.
                })
                .populate('feedback');

            req.flash('success_msg', 'Form Tracer Study Anda telah berhasil dikirim!');

            // Render halaman alumni utama Anda, dan kirimkan data tracer study
            return res.render('pages/alumni/dashboard', { // Ganti 'pages/alumni/dashboard' dengan path template utama alumni Anda
                tracerStudy: populatedTracerStudy,
                alumni: alumni, // Kirim juga data alumni jika diperlukan di template
                messages: req.flash() // Pastikan Anda meneruskan flash messages ke template
            });

        } catch (error) {
            console.error("Error saving tracer study form:", error);
            req.flash('error_msg', 'Gagal menyimpan data. Silakan coba lagi.');
            // Jika gagal, coba render ulang halaman alumni tanpa data tracer study yang baru,
            // sehingga form tetap muncul atau bisa diisi ulang.
            // Anda juga bisa mencoba mengambil data tracer study yang mungkin sudah ada sebelumnya.
            const { nisn } = req.session.user; // Ambil lagi NISN
            const alumni = await Alumni.findOne({ nisn: nisn });
            let existingTracerStudy = null;
            if (alumni) {
                existingTracerStudy = await TracerStudy.findOne({ alumniId: alumni._id })
                    .populate({ path: 'kegiatanDetail' })
                    .populate('feedback');
            }

            return res.render('pages/alumni/dashboard', {
                tracerStudy: existingTracerStudy, // Mungkin ada data lama jika error bukan karena penyimpanan pertama
                alumni: alumni,
                messages: req.flash()
            });
        }
    },
    editForm: async function (req, res) {
        const { alumniId } = req.params;
        const alumni = await Alumni.findOne({ nisn: req.session.user.nisn });
        const tracerStudy = await TracerStudy.findOne({ alumniId: alumniId }).populate('kegiatanDetail').populate('feedback');
        return res.render('pages/alumni/alumni-edit', { tracerStudy: tracerStudy, alumni: alumni });
    }, updateForm: async function (req, res) {
        try {
            const validRefs = {
                "Bekerja": "Pekerjaan",
                "Melanjutkan Studi": "StudiLanjutan",
                "Berwirausaha": "Berwirausaha",
                "Kursus": "Kursus"
            };

            const { nisn } = req.session.user;
            const { email, tahunLulus, kegiatan, feedbackDetail } = req.body;

            // Cari data tracer study berdasarkan NISN
            const tracerStudy = await TracerStudy.findOne({ alumniId: (await Alumni.findOne({ nisn }))._id });

            if (!tracerStudy) {
                return res.status(404).send("Data tracer study tidak ditemukan.");
            }

            let kegiatanRef = validRefs[kegiatan] || null;
            let kegiatanDetailId = tracerStudy.kegiatanDetail;
            let feedbackId = tracerStudy.feedback;

            // Jika kegiatan berubah, hapus dokumen lama dan buat dokumen baru
            if (tracerStudy.kegiatan !== kegiatan) {
                if (tracerStudy.kegiatanRef) {
                    const PreviousModel = mongoose.model(tracerStudy.kegiatanRef);
                    await PreviousModel.findByIdAndDelete(tracerStudy.kegiatanDetail);
                    kegiatanDetailId = null; // Set kegiatanDetailId ke null
                }

                if (kegiatan in validRefs) {
                    const KegiatanModel = mongoose.model(kegiatanRef);
                    let kegiatanData;

                    if (kegiatan === "Bekerja") {
                        const { namaPerusahaan, alamatPerusahaan, teleponPerusahaan, sektorPerusahaan, posisi, tanggalMasukBekerja } = req.body;
                        kegiatanData = new KegiatanModel({
                            alumniId: tracerStudy.alumniId,
                            namaPerusahaan,
                            alamatPerusahaan,
                            teleponPerusahaan,
                            sektorPerusahaan,
                            posisi,
                            tanggalMasuk: tanggalMasukBekerja
                        });
                    } else if (kegiatan === "Melanjutkan Studi") {
                        const { namaUniversitas, alamatUniversitas, fakultas, programStudi, tanggalMasukUniversitas } = req.body;
                        kegiatanData = new KegiatanModel({
                            alumniId: tracerStudy.alumniId,
                            namaUniversitas,
                            alamatUniversitas,
                            fakultas,
                            programStudi,
                            tanggalMasuk: tanggalMasukUniversitas
                        });
                    } else if (kegiatan === "Berwirausaha") {
                        const { namaUsaha, alamatUsaha, teleponUsaha, bidangUsaha, jumlahKaryawan, tanggalMulaiUsaha } = req.body;
                        kegiatanData = new KegiatanModel({
                            alumniId: tracerStudy.alumniId,
                            namaUsaha,
                            alamatUsaha,
                            teleponUsaha,
                            bidangUsaha,
                            jumlahKaryawan,
                            tanggalMulai: tanggalMulaiUsaha
                        });
                    } else if (kegiatan === "Kursus") {
                        const { namaKursus, alamatKursus, bidangKursus, tanggalMulaiKursus, tanggalSelesaiKursus } = req.body;
                        kegiatanData = new KegiatanModel({
                            alumniId: tracerStudy.alumniId,
                            namaKursus,
                            alamatKursus,
                            bidangKursus,
                            tanggalMulai: tanggalMulaiKursus,
                            tanggalSelesai: tanggalSelesaiKursus
                        });
                    }

                    const savedKegiatan = await kegiatanData.save();
                    kegiatanDetailId = savedKegiatan._id;
                } else if (kegiatan === "Belum Ada Kegiatan") {
                    kegiatanDetailId = null;
                }
            } else if (kegiatan in validRefs) {
                // Jika kegiatan sama, update dokumen kegiatan
                const KegiatanModel = mongoose.model(kegiatanRef);
                const existingKegiatan = await KegiatanModel.findById(kegiatanDetailId);

                if (existingKegiatan) {
                    if (kegiatan === "Bekerja") {
                        const { namaPerusahaan, alamatPerusahaan, teleponPerusahaan, sektorPerusahaan, posisi, tanggalMasukBekerja } = req.body;
                        Object.assign(existingKegiatan, {
                            namaPerusahaan,
                            alamatPerusahaan,
                            teleponPerusahaan,
                            sektorPerusahaan,
                            posisi,
                            tanggalMasuk: tanggalMasukBekerja
                        });
                    } else if (kegiatan === "Melanjutkan Studi") {
                        const { namaUniversitas, alamatUniversitas, fakultas, programStudi, tanggalMasukUniversitas } = req.body;
                        Object.assign(existingKegiatan, {
                            namaUniversitas,
                            alamatUniversitas,
                            fakultas,
                            programStudi,
                            tanggalMasuk: tanggalMasukUniversitas
                        });
                    } else if (kegiatan === "Berwirausaha") {
                        const { namaUsaha, alamatUsaha, teleponUsaha, bidangUsaha, jumlahKaryawan, tanggalMulaiUsaha } = req.body;
                        Object.assign(existingKegiatan, {
                            namaUsaha,
                            alamatUsaha,
                            teleponUsaha,
                            bidangUsaha,
                            jumlahKaryawan,
                            tanggalMulai: tanggalMulaiUsaha
                        });
                    } else if (kegiatan === "Kursus") {
                        const { namaKursus, alamatKursus, bidangKursus, tanggalMulaiKursus, tanggalSelesaiKursus } = req.body;
                        Object.assign(existingKegiatan, {
                            namaKursus,
                            alamatKursus,
                            bidangKursus,
                            tanggalMulai: tanggalMulaiKursus,
                            tanggalSelesai: tanggalSelesaiKursus
                        });
                    }

                    await existingKegiatan.save();
                }
            }

            // Update data feedback
            const feedback = await Feedback.findById(feedbackId);
            if (feedback) {
                feedback.pesan = feedbackDetail;
                await feedback.save();
            } else {
                const newFeedback = new Feedback({
                    alumniId: tracerStudy.alumniId,
                    pesan: feedbackDetail
                });
                const savedFeedback = await newFeedback.save();
                feedbackId = savedFeedback._id;
            }

            // Update data tracer study
            tracerStudy.email = email.trim();
            tracerStudy.tahunLulus = tahunLulus.trim();
            tracerStudy.kegiatan = kegiatan.trim();
            tracerStudy.kegiatanRef = kegiatanRef;
            tracerStudy.kegiatanDetail = kegiatanDetailId;
            tracerStudy.belumAdaKegiatanDetail = kegiatan === "Belum Ada Kegiatan" ? req.body.kegiatanDetail : null;
            tracerStudy.feedback = feedbackId;

            await tracerStudy.save();

            req.flash('success_msg', 'Data berhasil diubah.');

            // Redirect setelah berhasil menyimpan
            return res.redirect('/alumni');
        } catch (error) {
            req.flash('error_msg', 'Gagal mengubah data. Silakan coba lagi.');
            return res.status(500).send("Terjadi kesalahan saat mengedit data.");
        }
    }

}