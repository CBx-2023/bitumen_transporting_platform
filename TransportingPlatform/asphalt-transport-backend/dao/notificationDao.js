const { v4: uuidv4 } = require('uuid');
const { query } = require('../utils/db');
const logger = require('../utils/logger');

class NotificationDao {
  /**
   * 创建系统通知
   * @param {Object} notificationData - 通知数据
   * @returns {Promise<string>} - 通知ID
   */
  async createNotification(notificationData) {
    try {
      const notificationId = uuidv4();
      const { userId, title, content, type } = notificationData;
      
      const sql = `
        INSERT INTO notifications 
        (notification_id, user_id, title, content, type) 
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await query(sql, [notificationId, userId, title, content, type]);
      
      return notificationId;
    } catch (error) {
      logger.error(`Error in createNotification: ${error.message}`);
      throw error;
    }
  }

  /**
   * 批量创建系统通知（发送给多个用户）
   * @param {Array<string>} userIds - 用户ID数组
   * @param {Object} notificationData - 通知数据
   * @returns {Promise<Array<string>>} - 通知ID数组
   */
  async createNotificationBatch(userIds, notificationData) {
    try {
      const { title, content, type } = notificationData;
      const notificationIds = [];
      
      // 构建批量插入的值
      const values = userIds.map(userId => {
        const notificationId = uuidv4();
        notificationIds.push(notificationId);
        return [notificationId, userId, title, content, type];
      });
      
      // 构建批量插入的SQL
      const sql = `
        INSERT INTO notifications 
        (notification_id, user_id, title, content, type) 
        VALUES ?
      `;
      
      await query(sql, [values]);
      
      return notificationIds;
    } catch (error) {
      logger.error(`Error in createNotificationBatch: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户的通知列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} - 通知列表
   */
  async getUserNotifications(userId, options = {}) {
    try {
      let sql = `
        SELECT * FROM notifications 
        WHERE user_id = ?
      `;
      
      const params = [userId];
      
      // 添加已读/未读过滤
      if (options.isRead !== undefined) {
        sql += ' AND is_read = ?';
        params.push(options.isRead);
      }
      
      // 添加类型过滤
      if (options.type) {
        sql += ' AND type = ?';
        params.push(options.type);
      }
      
      // 添加排序
      sql += ' ORDER BY create_time DESC';
      
      // 添加分页
      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(options.limit));
        
        if (options.offset) {
          sql += ' OFFSET ?';
          params.push(parseInt(options.offset));
        }
      }
      
      return await query(sql, params);
    } catch (error) {
      logger.error(`Error in getUserNotifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   * @param {string} notificationId - 通知ID
   * @param {string} userId - 用户ID（用于验证权限）
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async markNotificationAsRead(notificationId, userId) {
    try {
      const sql = `
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE notification_id = ? AND user_id = ?
      `;
      
      const result = await query(sql, [notificationId, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in markNotificationAsRead: ${error.message}`);
      throw error;
    }
  }

  /**
   * 标记用户的所有通知为已读
   * @param {string} userId - 用户ID
   * @returns {Promise<number>} - 更新的通知数量
   */
  async markAllNotificationsAsRead(userId) {
    try {
      const sql = `
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE user_id = ? AND is_read = FALSE
      `;
      
      const result = await query(sql, [userId]);
      return result.affectedRows;
    } catch (error) {
      logger.error(`Error in markAllNotificationsAsRead: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除通知
   * @param {string} notificationId - 通知ID
   * @param {string} userId - 用户ID（用于验证权限）
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async deleteNotification(notificationId, userId) {
    try {
      const sql = `
        DELETE FROM notifications 
        WHERE notification_id = ? AND user_id = ?
      `;
      
      const result = await query(sql, [notificationId, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in deleteNotification: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户未读通知数量
   * @param {string} userId - 用户ID
   * @returns {Promise<number>} - 未读通知数量
   */
  async getUnreadNotificationCount(userId) {
    try {
      const sql = `
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = ? AND is_read = FALSE
      `;
      
      const result = await query(sql, [userId]);
      return result[0].count;
    } catch (error) {
      logger.error(`Error in getUnreadNotificationCount: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建用户间消息
   * @param {Object} messageData - 消息数据
   * @returns {Promise<string>} - 消息ID
   */
  async createMessage(messageData) {
    try {
      const messageId = uuidv4();
      const { 
        senderId, 
        receiverId, 
        content, 
        orderId = null 
      } = messageData;
      
      const sql = `
        INSERT INTO messages 
        (message_id, sender_id, receiver_id, content, order_id) 
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await query(sql, [messageId, senderId, receiverId, content, orderId]);
      
      return messageId;
    } catch (error) {
      logger.error(`Error in createMessage: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户的消息列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} - 消息列表
   */
  async getUserMessages(userId, options = {}) {
    try {
      let sql = `
        SELECT m.*,
               u1.name as sender_name, u1.avatar as sender_avatar,
               u2.name as receiver_name, u2.avatar as receiver_avatar
        FROM messages m
        JOIN users u1 ON m.sender_id = u1.user_id
        JOIN users u2 ON m.receiver_id = u2.user_id
        WHERE m.sender_id = ? OR m.receiver_id = ?
      `;
      
      const params = [userId, userId];
      
      // 添加订单过滤
      if (options.orderId) {
        sql += ' AND m.order_id = ?';
        params.push(options.orderId);
      }
      
      // 添加对话过滤（与特定用户的对话）
      if (options.otherUserId) {
        sql += ' AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))';
        params.push(userId, options.otherUserId, options.otherUserId, userId);
      }
      
      // 添加已读/未读过滤
      if (options.isRead !== undefined) {
        sql += ' AND m.is_read = ?';
        params.push(options.isRead);
      }
      
      // 添加排序
      sql += ' ORDER BY m.create_time DESC';
      
      // 添加分页
      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(options.limit));
        
        if (options.offset) {
          sql += ' OFFSET ?';
          params.push(parseInt(options.offset));
        }
      }
      
      return await query(sql, params);
    } catch (error) {
      logger.error(`Error in getUserMessages: ${error.message}`);
      throw error;
    }
  }

  /**
   * 标记消息为已读
   * @param {string} messageId - 消息ID
   * @param {string} userId - 用户ID（用于验证权限）
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async markMessageAsRead(messageId, userId) {
    try {
      const sql = `
        UPDATE messages 
        SET is_read = TRUE 
        WHERE message_id = ? AND receiver_id = ?
      `;
      
      const result = await query(sql, [messageId, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in markMessageAsRead: ${error.message}`);
      throw error;
    }
  }

  /**
   * 标记与特定用户的所有消息为已读
   * @param {string} userId - 当前用户ID
   * @param {string} otherUserId - 对话的另一方用户ID
   * @returns {Promise<number>} - 更新的消息数量
   */
  async markAllMessagesAsRead(userId, otherUserId) {
    try {
      const sql = `
        UPDATE messages 
        SET is_read = TRUE 
        WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE
      `;
      
      const result = await query(sql, [userId, otherUserId]);
      return result.affectedRows;
    } catch (error) {
      logger.error(`Error in markAllMessagesAsRead: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户未读消息数量
   * @param {string} userId - 用户ID
   * @returns {Promise<number>} - 未读消息数量
   */
  async getUnreadMessageCount(userId) {
    try {
      const sql = `
        SELECT COUNT(*) as count 
        FROM messages 
        WHERE receiver_id = ? AND is_read = FALSE
      `;
      
      const result = await query(sql, [userId]);
      return result[0].count;
    } catch (error) {
      logger.error(`Error in getUnreadMessageCount: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户的对话列表（按联系人分组）
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} - 对话列表
   */
  async getUserConversations(userId) {
    try {
      // 这个查询比较复杂，需要获取每个对话的最新消息
      const sql = `
        SELECT 
          c.other_user_id,
          u.name as other_user_name,
          u.avatar as other_user_avatar,
          u.role as other_user_role,
          c.last_message_id,
          c.last_message_content,
          c.last_message_time,
          c.is_read,
          c.unread_count
        FROM (
          SELECT 
            CASE 
              WHEN m.sender_id = ? THEN m.receiver_id
              ELSE m.sender_id
            END as other_user_id,
            MAX(m.message_id) as last_message_id,
            MAX(m.content) as last_message_content,
            MAX(m.create_time) as last_message_time,
            MIN(CASE WHEN m.receiver_id = ? THEN m.is_read ELSE 1 END) as is_read,
            SUM(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) as unread_count
          FROM messages m
          WHERE m.sender_id = ? OR m.receiver_id = ?
          GROUP BY other_user_id
        ) c
        JOIN users u ON c.other_user_id = u.user_id
        ORDER BY c.last_message_time DESC
      `;
      
      return await query(sql, [userId, userId, userId, userId, userId]);
    } catch (error) {
      logger.error(`Error in getUserConversations: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new NotificationDao();