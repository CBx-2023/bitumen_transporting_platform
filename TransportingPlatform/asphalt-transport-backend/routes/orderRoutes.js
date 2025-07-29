/**
 * @swagger
 * tags:
 *   name: 订单
 *   description: 订单管理相关接口
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middlewares/auth');
const {
  createOrderValidation,
  getOrderByIdValidation,
  getOrdersValidation,
  takeOrderValidation,
  startTransportValidation,
  completeOrderValidation,
  cancelOrderValidation,
  addOrderReviewValidation
} = require('../middlewares/validation');

// 创建订单
router.post('/orders', auth, createOrderValidation, orderController.createOrder);

// 获取订单详情
router.get('/orders/:id', auth, getOrderByIdValidation, orderController.getOrderById);

// 获取订单列表
router.get('/orders', auth, getOrdersValidation, orderController.getOrders);

// 司机接单
router.post('/orders/:id/take', auth, takeOrderValidation, orderController.takeOrder);

// 开始运输
router.post('/orders/:id/start', auth, startTransportValidation, orderController.startTransport);

// 完成订单
router.post('/orders/:id/complete', auth, completeOrderValidation, orderController.completeOrder);

// 取消订单
router.post('/orders/:id/cancel', auth, cancelOrderValidation, orderController.cancelOrder);

// 添加订单评价
router.post('/orders/:id/reviews', auth, addOrderReviewValidation, orderController.addOrderReview);

// 获取订单轨迹
router.get('/orders/:id/tracks', auth, getOrderByIdValidation, orderController.getOrderTracks);

// 获取订单支付记录
router.get('/orders/:id/payments', auth, getOrderByIdValidation, orderController.getOrderPayments);

// 添加支付记录
router.post('/orders/:id/payments', auth, getOrderByIdValidation, orderController.addPaymentRecord);

module.exports = router;