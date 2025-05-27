
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
        try {
            const { nisn } = req.session.user;
            const { nama, jenisKelamin } = req.body;

            const alumni = await Alumni.findOneAndUpdate(
                { nisn: nisn },
                { nama: nama, jenisKelamin: jenisKelamin },
                { new: true }
            );

            if (!alumni) {
                req.flash('error_msg', 'Alumni tidak ditemukan.');
                return res.redirect('/alumni/profile');
            }

            req.flash('success_msg', 'Profil berhasil diperbarui!');
            return res.redirect('/alumni/profile');
        } catch (error) {
            console.error("Error updating profile:", error);
            req.flash('error_msg', 'Terjadi kesalahan saat memperbarui profil.');
            return res.redirect('/alumni/profile');
        }
    },
    profileUpdatePassword: async function (req, res) {
        try {
            const { nisn } = req.session.user;
            const { oldPassword, newPassword, confirmNewPassword } = req.body; // Pastikan ini sesuai dengan name di form HTML

            const alumni = await Alumni.findOne({ nisn: nisn });

            if (!alumni) {
                req.flash('error_msg', 'Alumni tidak ditemukan.');
                return res.redirect('/alumni/profile');
            }

            // Cek password lama
            const isPasswordValid = await bcrypt.compare(oldPassword.trim(), alumni.password);
            if (!isPasswordValid) {
                req.flash('error_msg', 'Password lama salah.');
                return res.redirect('/alumni/profile');
            }

            // Cek konfirmasi password baru
            if (newPassword !== confirmNewPassword) {
                req.flash('error_msg', 'Password baru dan konfirmasi password tidak cocok.');
                return res.redirect('/alumni/profile');
            }

            if (newPassword.length < 8) {
                req.flash('error_msg', 'Password baru minimal 8 karakter.');
                return res.redirect('/alumni/profile');
            }

            const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

            await Alumni.findOneAndUpdate({ nisn: nisn }, { password: hashedPassword }, { new: true });

            req.flash('success_msg', 'Password berhasil diperbarui!');
            return res.redirect('/alumni/profile');

        } catch (error) {
            console.error("Error updating password:", error);
            req.flash('error_msg', 'Terjadi kesalahan saat memperbarui password.');
            return res.redirect('/alumni/profile');
        }
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
                return res.redirect('/alumni');
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
            return res.redirect('/alumni');

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

            return res.redirect('/alumni');
        }
    }, updateForm: async function (req, res) {
        try {
            const validRefs = {
                "Bekerja": "Pekerjaan",
                "Melanjutkan Studi": "StudiLanjutan",
                "Berwirausaha": "Berwirausaha",
                "Kursus": "Kursus"
            };

            const { nisn } = req.session.user;
            const { email, tahunLulus, kegiatan, feedbackDetail, belumAdaKegiatanDetail } = req.body;

            const alumni = await Alumni.findOne({ nisn });
            if (!alumni) {
                req.flash('error_msg', 'Data alumni tidak ditemukan.');
                return res.status(404).redirect('/alumni');
            }

            let tracerStudy = await TracerStudy.findOne({ alumniId: alumni._id });

            if (!tracerStudy) {
                req.flash('error_msg', 'Data tracer study tidak ditemukan.');
                return res.status(404).redirect('/alumni');
            }

            let kegiatanRef = validRefs[kegiatan] || null;
            let kegiatanDetailId = tracerStudy.kegiatanDetail;
            let feedbackId = tracerStudy.feedback;

            // --- Logika untuk Kegiatan Detail ---
            // Jika jenis kegiatan berubah, atau jika beralih dari/ke "Belum Ada Kegiatan"
            if (tracerStudy.kegiatan !== kegiatan) {
                // Hapus dokumen kegiatan detail LAMA jika ada dan bukan "Belum Ada Kegiatan"
                if (tracerStudy.kegiatanRef && tracerStudy.kegiatanDetail && tracerStudy.kegiatan !== "Belum Ada Kegiatan") {
                    try {
                        const PreviousModel = mongoose.model(tracerStudy.kegiatanRef);
                        await PreviousModel.findByIdAndDelete(tracerStudy.kegiatanDetail);
                        console.log(`Deleted old activity detail for: ${tracerStudy.kegiatanRef}`);
                    } catch (deleteError) {
                        console.error("Error deleting old activity detail:", deleteError);
                        // Lanjutkan, tapi catat errornya. Mungkin ID-nya sudah tidak valid/terhapus sebelumnya.
                    }
                }
                kegiatanDetailId = null;
                // Buat dokumen kegiatan detail BARU jika jenis kegiatan BUKAN "Belum Ada Kegiatan"
                if (kegiatan in validRefs) {
                    const KegiatanModel = mongoose.model(kegiatanRef);
                    let kegiatanData;

                    if (kegiatan === "Bekerja") {
                        const { namaPerusahaan, alamatPerusahaan, teleponPerusahaan, sektorPerusahaan, posisi, tanggalMasukBekerja } = req.body;
                        kegiatanData = new KegiatanModel({ alumniId: alumni._id, namaPerusahaan, alamatPerusahaan, teleponPerusahaan, sektorPerusahaan, posisi, tanggalMasuk: tanggalMasukBekerja });
                    } else if (kegiatan === "Melanjutkan Studi") {
                        const { namaUniversitas, alamatUniversitas, fakultas, programStudi, tanggalMasukUniversitas } = req.body;
                        kegiatanData = new KegiatanModel({ alumniId: alumni._id, namaUniversitas, alamatUniversitas, fakultas, programStudi, tanggalMasuk: tanggalMasukUniversitas });
                    } else if (kegiatan === "Berwirausaha") {
                        const { namaUsaha, alamatUsaha, teleponUsaha, bidangUsaha, jumlahKaryawan, tanggalMulaiUsaha } = req.body;
                        kegiatanData = new KegiatanModel({ alumniId: alumni._id, namaUsaha, alamatUsaha, teleponUsaha, bidangUsaha, jumlahKaryawan, tanggalMulai: tanggalMulaiUsaha });
                    } else if (kegiatan === "Kursus") {
                        const { namaKursus, alamatKursus, bidangKursus, tanggalMulaiKursus, tanggalSelesaiKursus } = req.body;
                        kegiatanData = new KegiatanModel({ alumniId: alumni._id, namaKursus, alamatKursus, bidangKursus, tanggalMulai: tanggalMulaiKursus, tanggalSelesai: tanggalSelesaiKursus });
                    }

                    if (kegiatanData) { // Pastikan kegiatanData terdefinisi sebelum disimpan
                        const savedKegiatan = await kegiatanData.save();
                        kegiatanDetailId = savedKegiatan._id;
                    }
                }
            } else if (kegiatan in validRefs) {
                // Jika kegiatan SAMA (bukan "Belum Ada Kegiatan"), update dokumen kegiatan
                const KegiatanModel = mongoose.model(kegiatanRef);
                let existingKegiatan = await KegiatanModel.findById(kegiatanDetailId);

                if (existingKegiatan) {
                    if (kegiatan === "Bekerja") {
                        const { namaPerusahaan, alamatPerusahaan, teleponPerusahaan, sektorPerusahaan, posisi, tanggalMasukBekerja } = req.body;
                        Object.assign(existingKegiatan, { namaPerusahaan, alamatPerusahaan, teleponPerusahaan, sektorPerusahaan, posisi, tanggalMasuk: tanggalMasukBekerja });
                    } else if (kegiatan === "Melanjutkan Studi") {
                        const { namaUniversitas, alamatUniversitas, fakultas, programStudi, tanggalMasukUniversitas } = req.body;
                        Object.assign(existingKegiatan, { namaUniversitas, alamatUniversitas, fakultas, programStudi, tanggalMasuk: tanggalMasukUniversitas });
                    } else if (kegiatan === "Berwirausaha") {
                        const { namaUsaha, alamatUsaha, teleponUsaha, bidangUsaha, jumlahKaryawan, tanggalMulaiUsaha } = req.body;
                        Object.assign(existingKegiatan, { namaUsaha, alamatUsaha, teleponUsaha, bidangUsaha, jumlahKaryawan, tanggalMulai: tanggalMulaiUsaha });
                    } else if (kegiatan === "Kursus") {
                        const { namaKursus, alamatKursus, bidangKursus, tanggalMulaiKursus, tanggalSelesaiKursus } = req.body;
                        Object.assign(existingKegiatan, { namaKursus, alamatKursus, bidangKursus, tanggalMulai: tanggalMulaiKursus, tanggalSelesai: tanggalSelesaiKursus });
                    }
                    await existingKegiatan.save();
                } else {
                    // Edge case: Kegiatan tidak berubah tapi kegiatanDetailId-nya hilang/invalid. Buat yang baru.
                    console.warn(`[UpdateForm] Existing activity detail (${kegiatan}) with ID ${kegiatanDetailId} not found. Attempting to create new one.`);
                    let kegiatanData;

                    // Logika pembuatan kegiatanData seperti di atas (untuk kasus kegiatan baru)
                    if (kegiatan === "Bekerja") {
                        const { namaPerusahaan, alamatPerusahaan, teleponPerusahaan, sektorPerusahaan, posisi, tanggalMasukBekerja } = req.body;
                        kegiatanData = new KegiatanModel({ alumniId: alumni._id, namaPerusahaan, alamatPerusahaan, teleponPerusahaan, sektorPerusahaan, posisi, tanggalMasuk: tanggalMasukBekerja });
                    } else if (kegiatan === "Melanjutkan Studi") {
                        const { namaUniversitas, alamatUniversitas, fakultas, programStudi, tanggalMasukUniversitas } = req.body;
                        kegiatanData = new KegiatanModel({ alumniId: alumni._id, namaUniversitas, alamatUniversitas, fakultas, programStudi, tanggalMasuk: tanggalMasukUniversitas });
                    } else if (kegiatan === "Berwirausaha") {
                        const { namaUsaha, alamatUsaha, teleponUsaha, bidangUsaha, jumlahKaryawan, tanggalMulaiUsaha } = req.body;
                        kegiatanData = new KegiatanModel({ alumniId: alumni._id, namaUsaha, alamatUsaha, teleponUsaha, bidangUsaha, jumlahKaryawan, tanggalMulai: tanggalMulaiUsaha });
                    } else if (kegiatan === "Kursus") {
                        const { namaKursus, alamatKursus, bidangKursus, tanggalMulaiKursus, tanggalSelesaiKursus } = req.body;
                        kegiatanData = new KegiatanModel({ alumniId: alumni._id, namaKursus, alamatKursus, bidangKursus, tanggalMulai: tanggalMulaiKursus, tanggalSelesai: tanggalSelesaiKursus });
                    }

                    if (kegiatanData) {
                        const savedKegiatan = await kegiatanData.save();
                        kegiatanDetailId = savedKegiatan._id;
                        console.log(`[UpdateForm] Created new activity detail (fallback) for ${kegiatan} with ID: ${kegiatanDetailId}`);
                    } else {
                        console.warn(`[UpdateForm] Could not create new activity detail for ${kegiatan} (fallback). 'kegiatanData' was not initialized.`);
                    }
                }
            } else if (kegiatan === "Belum Ada Kegiatan" && tracerStudy.kegiatan !== "Belum Ada Kegiatan") {
                // Ini khusus untuk kasus ketika MENGUBAH dari kegiatan spesifik ke "Belum Ada Kegiatan"
                if (tracerStudy.kegiatanRef && tracerStudy.kegiatanDetail) {
                    try {
                        const PreviousModel = mongoose.model(tracerStudy.kegiatanRef);
                        await PreviousModel.findByIdAndDelete(tracerStudy.kegiatanDetail);
                        console.log(`Deleted old activity detail because changed to 'Belum Ada Kegiatan': ${tracerStudy.kegiatanRef}`);
                    } catch (deleteError) {
                        console.error("Error deleting old activity detail (to 'Belum Ada Kegiatan'):", deleteError);
                    }
                }
                kegiatanDetailId = null;
            }

            // --- Update data feedback ---
            let feedbackDoc;
            if (feedbackId) {
                feedbackDoc = await Feedback.findById(feedbackId);
            }

            if (feedbackDoc) {
                feedbackDoc.pesan = feedbackDetail;
                await feedbackDoc.save();
            } else {
                const newFeedback = new Feedback({ alumniId: alumni._id, pesan: feedbackDetail });
                const savedFeedback = await newFeedback.save();
                feedbackId = savedFeedback._id;
            }

            // --- Update data tracer study utama ---
            tracerStudy.email = email.trim();
            tracerStudy.tahunLulus = tahunLulus.trim();
            tracerStudy.kegiatan = kegiatan.trim();
            tracerStudy.kegiatanRef = kegiatanRef;
            tracerStudy.kegiatanDetail = kegiatanDetailId; // Akan menjadi null jika "Belum Ada Kegiatan"
            // Menggunakan nama variabel yang sesuai dari req.body
            tracerStudy.belumAdaKegiatanDetail = (kegiatan === "Belum Ada Kegiatan") ? belumAdaKegiatanDetail : null;
            tracerStudy.feedback = feedbackId;

            await tracerStudy.save();

            req.flash('success_msg', 'Data berhasil diubah.');
            return res.redirect('/alumni');
        } catch (error) {
            console.error("Error in updateForm controller:", error); // Log error secara detail
            req.flash('error_msg', 'Gagal mengubah data. Silakan coba lagi.');
            return res.status(500).redirect('/alumni'); // Tambahkan status 500 dan redirect
        }
    }

}