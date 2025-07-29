/**
 * @swagger
 * tags:
 *   name: 用户
 *   description: 用户管理相关接口
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');
const { 
  updateUserValidation,
  getStatisticsValidation
} = require('../middlewares/validation');

// 获取用户信息
router.get('/users/me', auth, userController.getCurrentUser);

// 更新用户信息
router.put('/users/me', auth, updateUserValidation, userController.updateUser);

// 获取司机列表
router.get('/users/drivers', auth, userController.getDrivers);

// 获取货主列表
router.get('/users/owners', auth, userController.getOwners);

// 更新司机状态
router.put('/users/drivers/:id/status', auth, getStatisticsValidation, userController.updateDriverStatus);

module.exports = router;