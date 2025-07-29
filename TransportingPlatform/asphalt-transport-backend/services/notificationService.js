const notificationDao = require('../dao/notificationDao');
const userDao = require('../dao/userDao');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * 创建系统通知
   * @param {Object} notificationData - 通知数据
   * @returns {Promise<Object>} - 创建的通知
   */
  async createNotification(notificationData) {
    try {
      const { userId, title, content, type } = notificationData;
      
      // 验证用户是否存在
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      // 创建通知
      const notificationId = await notificationDao.createNotification({
        userId,
        title,
        content,
        type
      });
      
      return {
        notificationId,
        userId,
        title,
        content,
        type,
        isRead: false,
        createTime: new Date()
      };
    } catch (error) {
      logger.error(`Error in createNotification service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 批量创建系统通知
   * @param {Array<string>} userIds - 用户ID数组
   * @param {Object} notificationData - 通知数据
   * @returns {Promise<Object>} - 批量创建结果
   */
  async createNotificationBatch(userIds, notificationData) {
    try {
      const { title, content, type } = notificationData;
      
      // 验证用户是否存在
      const users = await Promise.all(
        userIds.map(userId => userDao.findById(userId))
      );
      
      // 过滤掉无效的用户ID
      const validUserIds = userIds.filter((_, index) => users[index] !== null);
      
      if (validUserIds.length === 0) {
        throw new ApiError(404, '没有有效的用户ID');
      }
      
      // 批量创建通知
      const notificationIds = await notificationDao.createNotificationBatch(
        validUserIds,
        { title, content, type }
      );
      
      return {
        success: true,
        notificationIds,
        totalCount: validUserIds.length
      };
    } catch (error) {
      logger.error(`Error in createNotificationBatch service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户通知列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} - 通知列表
   */
  async getUserNotifications(userId, options = {}) {
    try {
      // 验证用户是否存在
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      return await notificationDao.getUserNotifications(userId, options);
    } catch (error) {
      logger.error(`Error in getUserNotifications service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   * @param {string} notificationId - 通知ID
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} - 操作结果
   */
  async markNotificationAsRead(notificationId, userId) {
    try {
      // 验证用户是否存在
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      // 验证通知是否存在且属于该用户
      const notifications = await notificationDao.getUserNotifications(userId, {
        limit: 1,
        offset: 0
      });
      
      const notification = notifications.find(n => n.notification_id === notificationId);
      if (!notification) {
        throw new ApiError(404, '通知不存在或不属于该用户');
      }
      
      // 标记为已读
      const success = await notificationDao.markNotificationAsRead(notificationId, userId);
      
      return {
        success,
        notificationId,
        isRead: true
      };
    } catch (error) {
      logger.error(`Error in markNotificationAsRead service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 标记所有通知为已读
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} - 操作结果
   */
  async markAllNotificationsAsRead(userId) {
    try {
      // 验证用户是否存在
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      // 标记所有通知为已读
      const updatedCount = await notificationDao.markAllNotificationsAsRead(userId);
      
      return {
        success: true,
        updatedCount
      };
    } catch (error) {
      logger.error(`Error in markAllNotificationsAsRead service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除通知
   * @param {string} notificationId - 通知ID
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} - 操作结果
   */
  async deleteNotification(notificationId, userId) {
    try {
      // 验证用户是否存在
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      // 验证通知是否存在且属于该用户
      const notifications = await notificationDao.getUserNotifications(userId, {
        limit: 1,
        offset: 0
      });
      
      const notification = notifications.find(n => n.notification_id === notificationId);
      if (!notification) {
        throw new ApiError(404, '通知不存在或不属于该用户');
      }
      
      // 删除通知
      const success = await notificationDao.deleteNotification(notificationId, userId);
      
      return {
        success,
        notificationId
      };
    } catch (error) {
      logger.error(`Error in deleteNotification service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户未读通知数量
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} - 未读通知数量
   */
  async getUnreadNotificationCount(userId) {
    try {
      // 验证用户是否存在
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      const count = await notificationDao.getUnreadNotificationCount(userId);
      
      return {
        count,
        userId
      };
    } catch (error) {
      logger.error(`Error in getUnreadNotificationCount service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 发送用户间消息
   * @param {Object} messageData - 消息数据
   * @returns {Promise<Object>} - 发送的消息
   */
  async sendMessage(messageData) {
    try {
      const { senderId, receiverId, content, orderId = null } = messageData;
      
      // 验证发送者和接收者是否存在
      const [sender, receiver] = await Promise.all([
        userDao.findById(senderId),
        userDao.findById(receiverId)
      ]);
      
      if (!sender || !receiver) {
        throw new ApiError(404, '发送者或接收者不存在');
      }
      
      // 如果关联订单，验证订单是否存在且与发送者/接收者相关
      if (orderId) {
        const order = await orderDao.getOrderById(orderId);
        if (!order) {
          throw new ApiError(404, '订单不存在');
        }
        
        // 检查发送者和接收者是否与订单相关
        const isSenderRelated = await this.isUserRelatedToOrder(sender, order);
        const isReceiverRelated = await this.isUserRelatedToOrder(receiver, order);
        
        if (!isSenderRelated || !isReceiverRelated) {
          throw new ApiError(403, '发送者或接收者与订单无关');
        }
      }
      
      // 创建消息
      const messageId = await notificationDao.createMessage({
        senderId,
        receiverId,
        content,
        orderId
      });
      
      // 通知接收者
      await notificationDao.createNotification({
        userId: receiverId,
        title: `来自${sender.name}的消息`,
        content: content.length > 30 ? `${content.substring(0, 30)}...` : content,
        type: 'new_message'
      });
      
      return {
        messageId,
        senderId,
        receiverId,
        content,
        orderId,
        isRead: false,
        createTime: new Date()
      };
    } catch (error) {
      logger.error(`Error in sendMessage service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查用户是否与订单相关
   * @param {Object} user - 用户信息
   * @param {Object} order - 订单信息
   * @returns {Promise<boolean>} - 是否相关
   */
  async isUserRelatedToOrder(user, order) {
    try {
      if (user.role === 'owner') {
        const ownerProfile = await userDao.getOwnerProfile(user.user_id);
        return ownerProfile && order.owner_id === ownerProfile.owner_id;
      } else if (user.role === 'driver') {
        const driverProfile = await userDao.getDriverProfile(user.user_id);
        return driverProfile && order.driver_id === driverProfile.driver_id;
      } else if (user.role === 'supervisor') {
        return true; // 监管人员可以查看所有订单
      }
      return false;
    } catch (error) {
      logger.error(`Error in isUserRelatedToOrder service: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取用户消息列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} - 消息列表
   */
  async getUserMessages(userId, options = {}) {
    try {
      // 验证用户是否存在
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      return await notificationDao.getUserMessages(userId, options);
    } catch (error) {
      logger.error(`Error in getUserMessages service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户对话列表
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} - 对话列表
   */
  async getUserConversations(userId) {
    try {
      // 验证用户是否存在
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      return await notificationDao.getUserConversations(userId);
    } catch (error) {
      logger.error(`Error in getUserConversations service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 标记消息为已读
   * @param {string} messageId - 消息ID
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} - 操作结果
   */
  async markMessageAsRead(messageId, userId) {
    try {
      // 验证用户是否存在
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      // 验证消息是否存在且属于该用户
      const messages = await notificationDao.getUserMessages(userId, {
        limit: 1,
        offset: 0
      });
      
      const message = messages.find(m => m.message_id === messageId);
      if (!message) {
        throw new ApiError(404, '消息不存在或不属于该用户');
      }
      
      // 标记为已读
      const success = await notificationDao.markMessageAsRead(messageId, userId);
      
      return {
        success,
        messageId,
        isRead: true
      };
    } catch (error) {
      logger.error(`Error in markMessageAsRead service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 标记与特定用户的所有消息为已读
   * @param {string} userId - 当前用户ID
   * @param {string} otherUserId - 对话的另一方用户ID
   * @returns {Promise<Object>} - 操作结果
   */
  async markAllMessagesAsRead(userId, otherUserId) {
    try {
      // 验证用户是否存在
      const [user, otherUser] = await Promise.all([
        userDao.findById(userId),
        userDao.findById(otherUserId)
      ]);
      
      if (!user || !otherUser) {
        throw new ApiError(404, '用户不存在');
      }
      
      // 标记所有消息为已读
      const updatedCount = await notificationDao.markAllMessagesAsRead(userId, otherUserId);
      
      return {
        success: true,
        updatedCount,
        userId,
        otherUserId
      };
    } catch (error) {
      logger.error(`Error in markAllMessagesAsRead service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户未读消息数量
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} - 未读消息数量
   */
  async getUnreadMessageCount(userId) {
    try {
      // 验证用户是否存在
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      const count = await notificationDao.getUnreadMessageCount(userId);
      
      return {
        count,
        userId
      };
    } catch (error) {
      logger.error(`Error in getUnreadMessageCount service: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new NotificationService();