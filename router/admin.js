const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin');
const { isAdmin } = require('../middleware/auth');


router.get('/admin', isAdmin, adminController.index);
router.route('/admin/alumni-list')
    .get(isAdmin, adminController.viewAlumniList)
    .post(isAdmin, adminController.store);
router.get('/admin/alumni-list/:nisn', isAdmin, adminController.viewAlumniDetail);
router.post('/admin/alumni-list/delete', isAdmin, adminController.deleteAlumni);
router.put('/admin/alumni-edit/:nisn', isAdmin, adminController.alumniUpdate);
router.put('/admin/alumni-edit/password/:nisn', isAdmin, adminController.alumniUpdatePassword);
router.get('/admin/profile', isAdmin, adminController.profile);
router.put('/admin/profile-edit/:adminId', isAdmin, adminController.profileUpdate);
router.put('/admin/profile-edit/password/:adminId', isAdmin, adminController.profileUpdatePassword);
module.exports = router;