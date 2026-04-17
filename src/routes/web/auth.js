const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { redirectIfAuth } = require('../../middleware/auth');

router.get('/register',        redirectIfAuth, authController.getRegister);
router.post('/register',       redirectIfAuth, authController.postRegister);

router.get('/login',           redirectIfAuth, authController.getLogin);
router.post('/login',          redirectIfAuth, authController.postLogin);

router.get('/forgot',          redirectIfAuth, authController.getForgot);
router.post('/forgot',         redirectIfAuth, authController.postForgot);

router.get('/reset-password',  authController.getReset);
router.post('/reset-password', authController.postReset);

router.get('/logout',          authController.logout);

module.exports = router;
