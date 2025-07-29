// websocket.js
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/app.config');
const logger = require('./logger');
const userService = require('../services/userService');

let io;

/**
 * 初始化WebSocket服务
 * @param {Object} server - HTTP服务器实例
 */
function init(server) {
  io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // 身份验证中间件
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('认证失败: 未提供令牌'));
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await userService.getUserById(decoded.userId);
      
      if (!user) {
        return next(new Error('认证失败: 用户不存在'));
      }

      // 将用户信息附加到socket对象
      socket.user = {
        id: user.id,
        role: user.role,
        name: user.name
      };
      
      next();
    } catch (error) {
      logger.error(`WebSocket认证错误: ${error.message}`);
      next(new Error('认证失败: 无效的令牌'));
    }
  });

  // 连接事件处理
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const userRole = socket.user.role;
    
    logger.info(`用户 ${userId} (${userRole}) 已连接WebSocket`);
    
    // 将用户加入到对应角色的房间
    socket.join(`role:${userRole}`);
    socket.join(`user:${userId}`);
    
    // 位置更新事件
    socket.on('location:update', (data) => {
      handleLocationUpdate(socket, data);
    });
    
    // 订单状态更新事件
    socket.on('order:statusUpdate', (data) => {
      handleOrderStatusUpdate(socket, data);
    });
    
    // 断开连接事件
    socket.on('disconnect', () => {
      logger.info(`用户 ${userId} 已断开WebSocket连接`);
    });
  });

  logger.info('WebSocket服务已初始化');
}

/**
 * 处理位置更新事件
 * @param {Object} socket - Socket实例
 * @param {Object} data - 位置数据
 */
function handleLocationUpdate(socket, data) {
  try {
    const { orderId, latitude, longitude, speed } = data;
    const userId = socket.user.id;
    
    logger.debug(`用户 ${userId} 更新位置: ${latitude}, ${longitude}`);
    
    // 广播位置更新到相关订单的房间
    if (orderId) {
      io.to(`order:${orderId}`).emit('location:updated', {
        userId,
        orderId,
        latitude,
        longitude,
        speed,
        timestamp: new Date()
      });
    }
  } catch (error) {
    logger.error(`处理位置更新错误: ${error.message}`);
  }
}

/**
 * 处理订单状态更新事件
 * @param {Object} socket - Socket实例
 * @param {Object} data - 订单状态数据
 */
function handleOrderStatusUpdate(socket, data) {
  try {
    const { orderId, status, message } = data;
    const userId = socket.user.id;
    
    logger.debug(`用户 ${userId} 更新订单 ${orderId} 状态为 ${status}`);
    
    // 广播订单状态更新到相关订单的房间
    io.to(`order:${orderId}`).emit('order:statusUpdated', {
      orderId,
      status,
      message,
      updatedBy: userId,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error(`处理订单状态更新错误: ${error.message}`);
  }
}

/**
 * 发送通知给特定用户
 * @param {string} userId - 用户ID
 * @param {Object} notification - 通知数据
 */
function sendNotificationToUser(userId, notification) {
  try {
    io.to(`user:${userId}`).emit('notification:new', notification);
    logger.debug(`已发送通知给用户 ${userId}`);
  } catch (error) {
    logger.error(`发送通知错误: ${error.message}`);
  }
}

/**
 * 发送通知给特定角色的所有用户
 * @param {string} role - 用户角色
 * @param {Object} notification - 通知数据
 */
function sendNotificationToRole(role, notification) {
  try {
    io.to(`role:${role}`).emit('notification:new', notification);
    logger.debug(`已发送通知给角色 ${role}`);
  } catch (error) {
    logger.error(`发送通知错误: ${error.message}`);
  }
}

/**
 * 将用户加入到订单房间
 * @param {string} userId - 用户ID
 * @param {string} orderId - 订单ID
 */
function joinOrderRoom(userId, orderId) {
  const sockets = io.sockets.sockets;
  
  // 查找用户的所有socket连接
  for (const [socketId, socket] of sockets.entries()) {
    if (socket.user && socket.user.id === userId) {
      socket.join(`order:${orderId}`);
      logger.debug(`用户 ${userId} 已加入订单 ${orderId} 房间`);
    }
  }
}

/**
 * 将用户从订单房间移除
 * @param {string} userId - 用户ID
 * @param {string} orderId - 订单ID
 */
function leaveOrderRoom(userId, orderId) {
  const sockets = io.sockets.sockets;
  
  // 查找用户的所有socket连接
  for (const [socketId, socket] of sockets.entries()) {
    if (socket.user && socket.user.id === userId) {
      socket.leave(`order:${orderId}`);
      logger.debug(`用户 ${userId} 已离开订单 ${orderId} 房间`);
    }
  }
}

module.exports = {
  init,
  sendNotificationToUser,
  sendNotificationToRole,
  joinOrderRoom,
  leaveOrderRoom
};