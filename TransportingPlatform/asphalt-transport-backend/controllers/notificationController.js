const notificationService = require('../services/notificationService');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * 获取用户通知列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const options = {
      isRead: req.query.isRead,
      type: req.query.type,
      limit: req.query.limit,
      offset: req.query.offset
    };
    
    // 调用服务层方法
    const notifications = await notificationService.getUserNotifications(userId, options);
    
    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 标记通知为已读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const notificationId = req.params.notificationId;
    const userId = req.user.id;
    
    // 调用服务层方法
    const result = await notificationService.markNotificationAsRead(notificationId, userId);
    
    res.status(200).json({
      success: true,
      message: '通知已标记为已读',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 标记所有通知为已读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 调用服务层方法
    const result = await notificationService.markAllNotificationsAsRead(userId);
    
    res.status(200).json({
      success: true,
      message: '所有通知已标记为已读',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除通知
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const notificationId = req.params.notificationId;
    const userId = req.user.id;
    
    // 调用服务层方法
    const result = await notificationService.deleteNotification(notificationId, userId);
    
    res.status(200).json({
      success: true,
      message: '通知已删除',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取未读通知数量
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getUnreadNotificationCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 调用服务层方法
    const result = await notificationService.getUnreadNotificationCount(userId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 发送消息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content, orderId } = req.body;
    
    // 验证必要字段
    if (!receiverId || !content) {
      throw new ApiError(400, '接收者ID和消息内容为必填项');
    }
    
    // 调用服务层方法
    const message = await notificationService.sendMessage({
      senderId,
      receiverId,
      content,
      orderId
    });
    
    res.status(201).json({
      success: true,
      message: '消息发送成功',
      data: message
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取用户消息列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const options = {
      isRead: req.query.isRead,
      orderId: req.query.orderId,
      limit: req.query.limit,
      offset: req.query.offset
    };
    
    // 调用服务层方法
    const messages = await notificationService.getUserMessages(userId, options);
    
    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取用户对话列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 调用服务层方法
    const conversations = await notificationService.getUserConversations(userId);
    
    res.status(200).json({
      success: true,
      data: conversations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 标记消息为已读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.markMessageAsRead = async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user.id;
    
    // 调用服务层方法
    const result = await notificationService.markMessageAsRead(messageId, userId);
    
    res.status(200).json({
      success: true,
      message: '消息已标记为已读',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 标记与特定用户的所有消息为已读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.markAllMessagesAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;
    
    // 调用服务层方法
    const result = await notificationService.markAllMessagesAsRead(userId, otherUserId);
    
    res.status(200).json({
      success: true,
      message: '所有消息已标记为已读',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取未读消息数量
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getUnreadMessageCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 调用服务层方法
    const result = await notificationService.getUnreadMessageCount(userId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};