const express = require('express');
const router = express.Router();
const userController = require('../controllers/alumni');
const { isAlumni } = require('../middleware/auth');

// router.get('alumni/profile', userController.profile);
// router.put('alumni/user/:id', userController.update);
router.get('/alumni', isAlumni, userController.index);
router.get('/alumni/profile', isAlumni, userController.profile);

router.post('/alumni/update-profile', isAlumni, userController.profileUpdate);
router.post('/alumni/update-password', isAlumni, userController.profileUpdatePassword);

router.post('/alumni/submit-tracer-study', isAlumni, userController.saveForm)
router.post('/alumni/update-tracer-study', isAlumni, userController.updateForm)


module.exports = router