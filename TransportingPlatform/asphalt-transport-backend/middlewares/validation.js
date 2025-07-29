// validation.js
const { body, param, query, validationResult } = require('express-validator');
const { ApiError } = require('../utils/errorHandler');

// 验证结果处理中间件
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => `${error.param}: ${error.msg}`).join(', ');
    return next(new ApiError(400, `验证错误: ${errorMessages}`));
  }
  next();
};

// 用户注册验证规则
const registerValidation = [
  body('phone')
    .notEmpty().withMessage('手机号不能为空')
    .isMobilePhone('zh-CN').withMessage('请输入有效的中国手机号'),
  body('password')
    .notEmpty().withMessage('密码不能为空')
    .isLength({ min: 6 }).withMessage('密码长度不能少于6个字符'),
  body('name')
    .notEmpty().withMessage('姓名不能为空'),
  body('role')
    .notEmpty().withMessage('角色不能为空')
    .isIn(['driver', 'owner', 'supervisor']).withMessage('角色必须是driver、owner或supervisor'),
  validate
];

// 用户登录验证规则
const loginValidation = [
  body('phone')
    .notEmpty().withMessage('手机号不能为空')
    .isMobilePhone('zh-CN').withMessage('请输入有效的中国手机号'),
  body('password')
    .notEmpty().withMessage('密码不能为空'),
  validate
];

// 更新用户信息验证规则
const updateUserValidation = [
  body('name').optional(),
  body('avatar').optional(),
  body('email').optional().isEmail().withMessage('请输入有效的邮箱地址'),
  body('address').optional(),
  validate
];

// 更改密码验证规则
const changePasswordValidation = [
  body('oldPassword')
    .notEmpty().withMessage('旧密码不能为空'),
  body('newPassword')
    .notEmpty().withMessage('新密码不能为空')
    .isLength({ min: 6 }).withMessage('新密码长度不能少于6个字符'),
  validate
];

// 创建订单验证规则
const createOrderValidation = [
  body('startLocation')
    .notEmpty().withMessage('起点位置不能为空'),
  body('endLocation')
    .notEmpty().withMessage('终点位置不能为空'),
  body('goodsType')
    .notEmpty().withMessage('货物类型不能为空'),
  body('weight')
    .notEmpty().withMessage('重量不能为空')
    .isNumeric().withMessage('重量必须是数字'),
  body('expectedPickupTime')
    .notEmpty().withMessage('预期提货时间不能为空')
    .isISO8601().withMessage('预期提货时间必须是有效的日期时间格式'),
  body('expectedDeliveryTime')
    .notEmpty().withMessage('预期交货时间不能为空')
    .isISO8601().withMessage('预期交货时间必须是有效的日期时间格式'),
  body('price')
    .notEmpty().withMessage('价格不能为空')
    .isNumeric().withMessage('价格必须是数字'),
  body('remark').optional(),
  validate
];

// 获取订单详情验证规则
const getOrderByIdValidation = [
  param('id')
    .notEmpty().withMessage('订单ID不能为空')
    .isUUID().withMessage('订单ID必须是有效的UUID'),
  validate
];

// 获取订单列表验证规则
const getOrdersValidation = [
  query('status').optional(),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('页码必须是大于等于1的整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1到100之间的整数'),
  query('startDate').optional().isISO8601().withMessage('开始日期必须是有效的日期格式'),
  query('endDate').optional().isISO8601().withMessage('结束日期必须是有效的日期格式'),
  validate
];

// 接单验证规则
const takeOrderValidation = [
  param('id')
    .notEmpty().withMessage('订单ID不能为空')
    .isUUID().withMessage('订单ID必须是有效的UUID'),
  validate
];

// 开始运输验证规则
const startTransportValidation = [
  param('id')
    .notEmpty().withMessage('订单ID不能为空')
    .isUUID().withMessage('订单ID必须是有效的UUID'),
  validate
];

// 完成订单验证规则
const completeOrderValidation = [
  param('id')
    .notEmpty().withMessage('订单ID不能为空')
    .isUUID().withMessage('订单ID必须是有效的UUID'),
  validate
];

// 取消订单验证规则
const cancelOrderValidation = [
  param('id')
    .notEmpty().withMessage('订单ID不能为空')
    .isUUID().withMessage('订单ID必须是有效的UUID'),
  body('reason')
    .notEmpty().withMessage('取消原因不能为空'),
  validate
];

// 添加订单评价验证规则
const addOrderReviewValidation = [
  param('id')
    .notEmpty().withMessage('订单ID不能为空')
    .isUUID().withMessage('订单ID必须是有效的UUID'),
  body('rating')
    .notEmpty().withMessage('评分不能为空')
    .isInt({ min: 1, max: 5 }).withMessage('评分必须是1到5之间的整数'),
  body('comment').optional(),
  validate
];

// 更新位置验证规则
const updateLocationValidation = [
  body('latitude')
    .notEmpty().withMessage('纬度不能为空')
    .isFloat({ min: -90, max: 90 }).withMessage('纬度必须是-90到90之间的数字'),
  body('longitude')
    .notEmpty().withMessage('经度不能为空')
    .isFloat({ min: -180, max: 180 }).withMessage('经度必须是-180到180之间的数字'),
  body('orderId')
    .optional()
    .isUUID().withMessage('订单ID必须是有效的UUID'),
  body('speed').optional().isNumeric().withMessage('速度必须是数字'),
  validate
];

// 获取位置历史验证规则
const getLocationHistoryValidation = [
  query('driverId')
    .notEmpty().withMessage('司机ID不能为空')
    .isUUID().withMessage('司机ID必须是有效的UUID'),
  query('startTime')
    .optional()
    .isISO8601().withMessage('开始时间必须是有效的日期时间格式'),
  query('endTime')
    .optional()
    .isISO8601().withMessage('结束时间必须是有效的日期时间格式'),
  validate
];

// 获取司机当前位置验证规则
const getDriverLocationValidation = [
  param('id')
    .notEmpty().withMessage('司机ID不能为空')
    .isUUID().withMessage('司机ID必须是有效的UUID'),
  validate
];

// 标记通知为已读验证规则
const markAsReadValidation = [
  param('id')
    .notEmpty().withMessage('通知ID不能为空')
    .isUUID().withMessage('通知ID必须是有效的UUID'),
  validate
];

// 删除通知验证规则
const deleteNotificationValidation = [
  param('id')
    .notEmpty().withMessage('通知ID不能为空')
    .isUUID().withMessage('通知ID必须是有效的UUID'),
  validate
];

// 获取统计数据验证规则
const getStatisticsValidation = [
  param('id')
    .notEmpty().withMessage('用户ID不能为空')
    .isUUID().withMessage('用户ID必须是有效的UUID'),
  query('startDate')
    .optional()
    .isISO8601().withMessage('开始日期必须是有效的日期格式'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('结束日期必须是有效的日期格式'),
  validate
];

module.exports = {
  registerValidation,
  loginValidation,
  updateUserValidation,
  changePasswordValidation,
  createOrderValidation,
  getOrderByIdValidation,
  getOrdersValidation,
  takeOrderValidation,
  startTransportValidation,
  completeOrderValidation,
  cancelOrderValidation,
  addOrderReviewValidation,
  updateLocationValidation,
  getLocationHistoryValidation,
  getDriverLocationValidation,
  markAsReadValidation,
  deleteNotificationValidation,
  getStatisticsValidation
};