/**
 * @swagger
 * tags:
 *   name: 统计
 *   description: 数据统计相关接口
 */

const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const auth = require('../middlewares/auth');
const {
  getStatisticsValidation
} = require('../middlewares/validation');

// 获取司机统计数据
router.get('/statistics/drivers/:id', auth, getStatisticsValidation, statisticsController.getDriverStatistics);

// 获取货主统计数据
router.get('/statistics/owners/:id', auth, getStatisticsValidation, statisticsController.getOwnerStatistics);

// 获取平台统计数据
router.get('/statistics/platform', auth, statisticsController.getPlatformStatistics);

// 获取订单统计数据
router.get('/statistics/orders', auth, getStatisticsValidation, statisticsController.getOrderStatistics);

module.exports = router;