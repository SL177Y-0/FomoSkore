const express = require('express');
const { authCallback } = require('../controllers/VeridaAuthController.js');

const router = express.Router();

// /auth/callback
router.get('/callback', authCallback);

module.exports = router;

