const express = require('express');
const router = express.Router();
const { getAllDishes,getDishById,createDish,upload, updateDish, deleteDish} = require('../controllers/dish.controller');
const {verifyAccessToken, isAdmin} = require('../services/auth/AccessToken');

// router.use(verifyAccessToken);
router.get('/',getAllDishes);
router.get('/:id', getDishById);
// router.use(isAdmin);
router.post('/', upload.array('thumbnails'), createDish);
router.put('/:id', upload.array('thumbnails'), updateDish);
router.delete('/:id', deleteDish);

module.exports = router;