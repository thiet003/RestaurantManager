const express = require('express');
const router = express.Router();
const {createEmployee, loginEmployee} = require('../controllers/employee.controller');
const {verifyAccessToken, isAdmin} = require('../services/auth/AccessToken');

router.post('/login', loginEmployee);
router.use(verifyAccessToken);
router.use(isAdmin);
router.post('/create', createEmployee);

module.exports = router;