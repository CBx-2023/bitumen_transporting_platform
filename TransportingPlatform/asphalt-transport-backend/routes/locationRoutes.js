/**
 * @swagger
 * tags:
 *   name: 位置
 *   description: 位置跟踪相关接口
 */

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const auth = require('../middlewares/auth');
const {
  updateLocationValidation,
  getLocationHistoryValidation,
  getDriverLocationValidation
} = require('../middlewares/validation');

// 更新位置
router.post('/locations', auth, updateLocationValidation, locationController.updateLocation);

// 获取位置历史
router.get('/locations/history', auth, getLocationHistoryValidation, locationController.getLocationHistory);

// 获取司机当前位置
router.get('/locations/drivers/:id', auth, getDriverLocationValidation, locationController.getDriverLocation);

module.exports = router;