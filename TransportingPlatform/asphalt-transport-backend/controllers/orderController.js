const orderService = require('../services/orderService');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * 创建订单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.createOrder = async (req, res, next) => {
  try {
    const orderData = req.body;
    const userId = req.user.id;
    
    // 验证必要字段
    if (!orderData.goodsType || !orderData.weight || !orderData.price ||
        !orderData.startAddress || !orderData.startLat || !orderData.startLng ||
        !orderData.endAddress || !orderData.endLat || !orderData.endLng) {
      throw new ApiError(400, '缺少必要的订单信息');
    }
    
    // 调用服务层方法
    const result = await orderService.createOrder(orderData, userId);
    
    res.status(201).json({
      success: true,
      message: '订单创建成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取订单详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getOrderDetail = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 调用服务层方法
    const order = await orderService.getOrderDetail(orderId, userId, userRole);
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取订单列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const filters = {
      status: req.query.status,
      limit: req.query.limit,
      offset: req.query.offset
    };
    
    // 调用服务层方法
    const orders = await orderService.getOrders(filters, userId, userRole);
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 司机接单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.acceptOrder = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user.id;
    
    // 调用服务层方法
    const result = await orderService.acceptOrder(orderId, userId);
    
    res.status(200).json({
      success: true,
      message: '接单成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 开始运输
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.startTransport = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user.id;
    
    // 调用服务层方法
    const result = await orderService.startTransport(orderId, userId);
    
    res.status(200).json({
      success: true,
      message: '开始运输成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 完成订单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.completeOrder = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user.id;
    
    // 调用服务层方法
    const result = await orderService.completeOrder(orderId, userId);
    
    res.status(200).json({
      success: true,
      message: '订单完成成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 取消订单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.cancelOrder = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user.id;
    const { reason } = req.body;
    
    // 验证取消原因
    if (!reason) {
      throw new ApiError(400, '取消原因为必填项');
    }
    
    // 调用服务层方法
    const result = await orderService.cancelOrder(orderId, userId, reason);
    
    res.status(200).json({
      success: true,
      message: '订单取消成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 添加订单评价
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.addRating = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const fromUserId = req.user.id;
    const { toUserId, score, content } = req.body;
    
    // 验证必要字段
    if (!toUserId || !score) {
      throw new ApiError(400, '被评价人ID和评分为必填项');
    }
    
    // 调用服务层方法
    const result = await orderService.addRating(orderId, fromUserId, toUserId, score, content);
    
    res.status(201).json({
      success: true,
      message: '评价添加成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取订单轨迹
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getOrderTracks = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 调用服务层方法
    const tracks = await orderService.getOrderTracks(orderId, userId, userRole);
    
    res.status(200).json({
      success: true,
      data: tracks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取订单支付记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getOrderPayments = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 调用服务层方法
    const payments = await orderService.getOrderPayments(orderId, userId, userRole);
    
    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 添加支付记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.addPayment = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user.id;
    const { amount, paymentMethod } = req.body;
    
    // 验证必要字段
    if (!amount || !paymentMethod) {
      throw new ApiError(400, '支付金额和支付方式为必填项');
    }
    
    // 调用服务层方法
    const result = await orderService.addPayment({
      orderId,
      amount,
      paymentMethod
    }, userId);
    
    res.status(201).json({
      success: true,
      message: '支付成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};