const express = require('express');
const router = express.Router();
const userController = require('../controllers/alumni');
const { isAlumni } = require('../middleware/auth');

// router.get('alumni/profile', userController.profile);
// router.put('alumni/user/:id', userController.update);
router.get('/alumni', isAlumni, userController.index);
router.get('/alumni/profile', isAlumni, userController.profile);

router.put('/alumni/profile-edit/:nisn', isAlumni, userController.profileUpdate);
router.put('/alumni/profile-edit/password/:nisn', isAlumni, userController.profileUpdatePassword);

router.get('/alumni/alumni-form', isAlumni, userController.showForm)
router.post('/alumni/alumni-form/:nisn', isAlumni, userController.saveForm)

router.get('/alumni/alumni-form/edit/:alumniId', isAlumni, userController.editForm)
router.put('/alumni/alumni-form/edit/:alumniId', isAlumni, userController.updateForm)


module.exports = router