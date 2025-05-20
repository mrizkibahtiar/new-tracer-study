const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin');
const { isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');


router.get('/admin', isAdmin, adminController.index);

// Alumni
router.route('/admin/alumni-list')
    .get(isAdmin, adminController.viewAlumniList)
    .post(isAdmin, adminController.storeAlumni);

router.get('/admin/alumni-list/:nisn', isAdmin, adminController.viewAlumniDetail);
router.post('/admin/alumni-list/delete', isAdmin, adminController.deleteAlumni);
router.post('/admin/alumni-list/edit', isAdmin, adminController.alumniUpdate);

// Berita 
router.route('/admin/berita')
    .get(isAdmin, adminController.viewBerita)
    .post(isAdmin, upload.single('gambarBerita'), adminController.storeBerita);
router.get('/admin/berita/:beritaId', isAdmin, adminController.viewBeritaDetail)
router.post('/admin/berita/delete/:beritaId', isAdmin, adminController.deleteBerita)
router.post('/admin/berita/edit', isAdmin, upload.single('gambarBerita'), adminController.beritaUpdate)

// Lowongan 
router.route('/admin/lowongan')
    .get(isAdmin, adminController.viewLowongan)
    .post(isAdmin, upload.single('gambarLowongan'), adminController.storeLowongan);
router.get('/admin/lowongan/:lowonganId', isAdmin, adminController.viewLowonganDetail)
router.post('/admin/lowongan/delete/:lowonganId', isAdmin, adminController.deleteLowongan)
router.post('/admin/lowongan/edit', isAdmin, upload.single('gambarLowongan'), adminController.lowonganUpdate)

// saran
router.get('/admin/saran', isAdmin, adminController.viewSaran);





// profile
router.get('/admin/profile', isAdmin, adminController.profile);
router.put('/admin/profile-edit/:adminId', isAdmin, adminController.profileUpdate);
router.put('/admin/profile-edit/password/:adminId', isAdmin, adminController.profileUpdatePassword);
module.exports = router;