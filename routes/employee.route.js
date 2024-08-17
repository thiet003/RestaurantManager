const express = require('express');
const router = express.Router();
const {createEmployee, loginEmployee, listEmployees, deleteEmployee, updateEmployee,getEmployeeById
    ,getInformation, changePassword
} = require('../controllers/employee.controller');
const {verifyAccessToken, isAdmin} = require('../services/auth/AccessToken');

router.post('/login', loginEmployee);
router.use(verifyAccessToken);
router.get('/infor', getInformation);
router.patch('/change-password', changePassword);
router.use(isAdmin);
router.post('/create', createEmployee);
router.get('/', listEmployees);
router.delete('/:id', deleteEmployee);
router.patch('/:id', updateEmployee);
router.get('/:id', getEmployeeById);

module.exports = router;