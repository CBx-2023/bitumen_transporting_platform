const { v4: uuidv4 } = require('uuid');
const { query } = require('../utils/db');
const logger = require('../utils/logger');

class OrderDao {
  /**
   * 创建订单
   * @param {Object} orderData - 订单数据
   * @returns {Promise<Object>} - 包含订单ID和订单编号的对象
   */
  async createOrder(orderData) {
    try {
      const orderId = uuidv4();
      const orderNumber = this.generateOrderNumber();
      
      const {
        ownerId,
        goodsType,
        weight,
        volume = null,
        price,
        startAddress,
        startLat,
        startLng,
        endAddress,
        endLat,
        endLng,
        expectedStartTime = null,
        expectedEndTime = null,
        remarks = null
      } = orderData;
      
      const sql = `
        INSERT INTO orders (
          order_id, order_number, owner_id, goods_type, weight, volume, price,
          start_address, start_lat, start_lng, end_address, end_lat, end_lng,
          expected_start_time, expected_end_time, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await query(sql, [
        orderId, orderNumber, ownerId, goodsType, weight, volume, price,
        startAddress, startLat, startLng, endAddress, endLat, endLng,
        expectedStartTime, expectedEndTime, remarks
      ]);
      
      return { orderId, orderNumber };
    } catch (error) {
      logger.error(`Error in createOrder: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成订单编号
   * @returns {string} - 订单编号
   */
  generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `AS${year}${month}${day}${random}`;
  }

  /**
   * 根据ID获取订单详情
   * @param {string} orderId - 订单ID
   * @returns {Promise<Object|null>} - 订单详情或null
   */
  async getOrderById(orderId) {
    try {
      const sql = `
        SELECT o.* 
        FROM orders o
        WHERE o.order_id = ?
      `;
      
      const orders = await query(sql, [orderId]);
      return orders.length > 0 ? orders[0] : null;
    } catch (error) {
      logger.error(`Error in getOrderById: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取订单详情（包含关联信息）
   * @param {string} orderId - 订单ID
   * @returns {Promise<Object|null>} - 订单详情或null
   */
  async getOrderWithDetails(orderId) {
    try {
      const sql = `
        SELECT o.*, 
               op.company as owner_company, u1.name as owner_name, u1.phone as owner_phone,
               u2.name as driver_name, u2.phone as driver_phone, dp.car_number
        FROM orders o
        LEFT JOIN owner_profiles op ON o.owner_id = op.owner_id
        LEFT JOIN users u1 ON op.user_id = u1.user_id
        LEFT JOIN driver_profiles dp ON o.driver_id = dp.driver_id
        LEFT JOIN users u2 ON dp.user_id = u2.user_id
        WHERE o.order_id = ?
      `;
      
      const orders = await query(sql, [orderId]);
      return orders.length > 0 ? orders[0] : null;
    } catch (error) {
      logger.error(`Error in getOrderWithDetails: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取订单列表
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} - 订单列表
   */
  async getOrders(filters = {}) {
    try {
      let sql = `
        SELECT o.* 
        FROM orders o
        WHERE 1=1
      `;
      
      const params = [];
      
      // 添加过滤条件
      if (filters.ownerId) {
        sql += ' AND o.owner_id = ?';
        params.push(filters.ownerId);
      }
      
      if (filters.driverId) {
        sql += ' AND o.driver_id = ?';
        params.push(filters.driverId);
      }
      
      if (filters.status) {
        sql += ' AND o.status = ?';
        params.push(filters.status);
      }
      
      // 添加排序
      sql += ' ORDER BY o.create_time DESC';
      
      // 添加分页
      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(filters.limit));
        
        if (filters.offset) {
          sql += ' OFFSET ?';
          params.push(parseInt(filters.offset));
        }
      }
      
      return await query(sql, params);
    } catch (error) {
      logger.error(`Error in getOrders: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取订单列表（包含关联信息）
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} - 订单列表
   */
  async getOrdersWithDetails(filters = {}) {
    try {
      let sql = `
        SELECT o.*, 
               op.company as owner_company, u1.name as owner_name, u1.phone as owner_phone,
               u2.name as driver_name, u2.phone as driver_phone, dp.car_number
        FROM orders o
        LEFT JOIN owner_profiles op ON o.owner_id = op.owner_id
        LEFT JOIN users u1 ON op.user_id = u1.user_id
        LEFT JOIN driver_profiles dp ON o.driver_id = dp.driver_id
        LEFT JOIN users u2 ON dp.user_id = u2.user_id
        WHERE 1=1
      `;
      
      const params = [];
      
      // 添加过滤条件
      if (filters.ownerId) {
        sql += ' AND o.owner_id = ?';
        params.push(filters.ownerId);
      }
      
      if (filters.driverId) {
        sql += ' AND o.driver_id = ?';
        params.push(filters.driverId);
      }
      
      if (filters.status) {
        sql += ' AND o.status = ?';
        params.push(filters.status);
      }
      
      // 添加排序
      sql += ' ORDER BY o.create_time DESC';
      
      // 添加分页
      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(filters.limit));
        
        if (filters.offset) {
          sql += ' OFFSET ?';
          params.push(parseInt(filters.offset));
        }
      }
      
      return await query(sql, params);
    } catch (error) {
      logger.error(`Error in getOrdersWithDetails: ${error.message}`);
      throw error;
    }
  }

  /**
   * 司机接单
   * @param {string} orderId - 订单ID
   * @param {string} driverId - 司机ID
   * @returns {Promise<boolean>} - 接单是否成功
   */
  async acceptOrder(orderId, driverId) {
    try {
      const sql = `
        UPDATE orders 
        SET driver_id = ?, status = '运输中', accept_time = NOW() 
        WHERE order_id = ? AND status = '待接单'
      `;
      
      const result = await query(sql, [driverId, orderId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in acceptOrder: ${error.message}`);
      throw error;
    }
  }

  /**
   * 开始运输
   * @param {string} orderId - 订单ID
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async startTransport(orderId) {
    try {
      const sql = `
        UPDATE orders 
        SET start_time = NOW() 
        WHERE order_id = ? AND status = '运输中' AND start_time IS NULL
      `;
      
      const result = await query(sql, [orderId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in startTransport: ${error.message}`);
      throw error;
    }
  }

  /**
   * 完成订单
   * @param {string} orderId - 订单ID
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async completeOrder(orderId) {
    try {
      const sql = `
        UPDATE orders 
        SET status = '已完成', complete_time = NOW() 
        WHERE order_id = ? AND status = '运输中'
      `;
      
      const result = await query(sql, [orderId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in completeOrder: ${error.message}`);
      throw error;
    }
  }

  /**
   * 取消订单
   * @param {string} orderId - 订单ID
   * @param {string} reason - 取消原因
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async cancelOrder(orderId, reason) {
    try {
      const sql = `
        UPDATE orders 
        SET status = '已取消', cancel_time = NOW(), cancel_reason = ? 
        WHERE order_id = ? AND status = '待接单'
      `;
      
      const result = await query(sql, [reason, orderId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in cancelOrder: ${error.message}`);
      throw error;
    }
  }

  /**
   * 记录订单状态变更
   * @param {Object} logData - 日志数据
   * @returns {Promise<string>} - 日志ID
   */
  async logOrderStatusChange(logData) {
    try {
      const logId = uuidv4();
      const {
        orderId,
        previousStatus,
        currentStatus,
        operatorId,
        operatorRole,
        remarks = null
      } = logData;
      
      const sql = `
        INSERT INTO order_status_logs 
        (log_id, order_id, previous_status, current_status, operator_id, operator_role, remarks) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await query(sql, [
        logId, 
        orderId, 
        previousStatus, 
        currentStatus, 
        operatorId, 
        operatorRole, 
        remarks
      ]);
      
      return logId;
    } catch (error) {
      logger.error(`Error in logOrderStatusChange: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取订单状态变更日志
   * @param {string} orderId - 订单ID
   * @returns {Promise<Array>} - 日志列表
   */
  async getOrderStatusLogs(orderId) {
    try {
      const sql = `
        SELECT l.*, 
               CASE 
                 WHEN l.operator_role = 'driver' THEN d.name
                 WHEN l.operator_role = 'owner' THEN o.name
                 WHEN l.operator_role = 'supervisor' THEN s.name
               END as operator_name
        FROM order_status_logs l
        LEFT JOIN users d ON l.operator_id = d.user_id AND l.operator_role = 'driver'
        LEFT JOIN users o ON l.operator_id = o.user_id AND l.operator_role = 'owner'
        LEFT JOIN users s ON l.operator_id = s.user_id AND l.operator_role = 'supervisor'
        WHERE l.order_id = ?
        ORDER BY l.change_time ASC
      `;
      
      return await query(sql, [orderId]);
    } catch (error) {
      logger.error(`Error in getOrderStatusLogs: ${error.message}`);
      throw error;
    }
  }

  /**
   * 添加运输轨迹
   * @param {Object} trackData - 轨迹数据
   * @returns {Promise<string>} - 轨迹ID
   */
  async addTransportTrack(trackData) {
    try {
      const trackId = uuidv4();
      const { 
        orderId, 
        driverId, 
        latitude, 
        longitude, 
        speed = null, 
        direction = null 
      } = trackData;
      
      const sql = `
        INSERT INTO transport_tracks 
        (track_id, order_id, driver_id, latitude, longitude, speed, direction, track_time) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      await query(sql, [
        trackId, 
        orderId, 
        driverId, 
        latitude, 
        longitude, 
        speed, 
        direction
      ]);
      
      return trackId;
    } catch (error) {
      logger.error(`Error in addTransportTrack: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取运输轨迹
   * @param {string} orderId - 订单ID
   * @returns {Promise<Array>} - 轨迹列表
   */
  async getTransportTracks(orderId) {
    try {
      const sql = `
        SELECT * FROM transport_tracks 
        WHERE order_id = ? 
        ORDER BY track_time ASC
      `;
      
      return await query(sql, [orderId]);
    } catch (error) {
      logger.error(`Error in getTransportTracks: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取最新的运输轨迹
   * @param {string} orderId - 订单ID
   * @returns {Promise<Object|null>} - 最新轨迹或null
   */
  async getLatestTransportTrack(orderId) {
    try {
      const sql = `
        SELECT * FROM transport_tracks 
        WHERE order_id = ? 
        ORDER BY track_time DESC 
        LIMIT 1
      `;
      
      const tracks = await query(sql, [orderId]);
      return tracks.length > 0 ? tracks[0] : null;
    } catch (error) {
      logger.error(`Error in getLatestTransportTrack: ${error.message}`);
      throw error;
    }
  }

  /**
   * 添加支付记录
   * @param {Object} paymentData - 支付数据
   * @returns {Promise<string>} - 支付记录ID
   */
  async addPayment(paymentData) {
    try {
      const paymentId = uuidv4();
      const {
        orderId,
        amount,
        paymentMethod,
        transactionId = null,
        paymentStatus,
        paymentTime = null,
        payerId,
        receiverId
      } = paymentData;
      
      const sql = `
        INSERT INTO payments 
        (payment_id, order_id, amount, payment_method, transaction_id, 
         payment_status, payment_time, payer_id, receiver_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await query(sql, [
        paymentId,
        orderId,
        amount,
        paymentMethod,
        transactionId,
        paymentStatus,
        paymentTime,
        payerId,
        receiverId
      ]);
      
      return paymentId;
    } catch (error) {
      logger.error(`Error in addPayment: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新支付状态
   * @param {string} paymentId - 支付记录ID
   * @param {string} status - 新状态
   * @param {string} transactionId - 交易号
   * @returns {Promise<boolean>} - 更新是否成功
   */
  async updatePaymentStatus(paymentId, status, transactionId = null) {
    try {
      let sql = `
        UPDATE payments 
        SET payment_status = ?, update_time = CURRENT_TIMESTAMP
      `;
      
      const params = [status];
      
      if (status === '已支付') {
        sql += ', payment_time = NOW()';
      }
      
      if (transactionId) {
        sql += ', transaction_id = ?';
        params.push(transactionId);
      }
      
      sql += ' WHERE payment_id = ?';
      params.push(paymentId);
      
      const result = await query(sql, params);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in updatePaymentStatus: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取订单的支付记录
   * @param {string} orderId - 订单ID
   * @returns {Promise<Array>} - 支付记录列表
   */
  async getOrderPayments(orderId) {
    try {
      const sql = `
        SELECT * FROM payments 
        WHERE order_id = ? 
        ORDER BY create_time DESC
      `;
      
      return await query(sql, [orderId]);
    } catch (error) {
      logger.error(`Error in getOrderPayments: ${error.message}`);
      throw error;
    }
  }

  /**
   * 添加评价
   * @param {Object} ratingData - 评价数据
   * @returns {Promise<string>} - 评价ID
   */
  async addRating(ratingData) {
    try {
      const ratingId = uuidv4();
      const {
        orderId,
        fromUserId,
        toUserId,
        score,
        content = null
      } = ratingData;
      
      const sql = `
        INSERT INTO ratings 
        (rating_id, order_id, from_user_id, to_user_id, score, content) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await query(sql, [
        ratingId,
        orderId,
        fromUserId,
        toUserId,
        score,
        content
      ]);
      
      return ratingId;
    } catch (error) {
      logger.error(`Error in addRating: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户的评价
   * @param {string} userId - 用户ID
   * @param {boolean} isReceived - 是否为收到的评价
   * @returns {Promise<Array>} - 评价列表
   */
  async getUserRatings(userId, isReceived = true) {
    try {
      const sql = `
        SELECT r.*, 
               o.order_number,
               u1.name as from_user_name, u1.avatar as from_user_avatar,
               u2.name as to_user_name, u2.avatar as to_user_avatar
        FROM ratings r
        JOIN orders o ON r.order_id = o.order_id
        JOIN users u1 ON r.from_user_id = u1.user_id
        JOIN users u2 ON r.to_user_id = u2.user_id
        WHERE ${isReceived ? 'r.to_user_id' : 'r.from_user_id'} = ?
        ORDER BY r.create_time DESC
      `;
      
      return await query(sql, [userId]);
    } catch (error) {
      logger.error(`Error in getUserRatings: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取订单的评价
   * @param {string} orderId - 订单ID
   * @returns {Promise<Array>} - 评价列表
   */
  async getOrderRatings(orderId) {
    try {
      const sql = `
        SELECT r.*, 
               u1.name as from_user_name, u1.avatar as from_user_avatar,
               u2.name as to_user_name, u2.avatar as to_user_avatar
        FROM ratings r
        JOIN users u1 ON r.from_user_id = u1.user_id
        JOIN users u2 ON r.to_user_id = u2.user_id
        WHERE r.order_id = ?
        ORDER BY r.create_time DESC
      `;
      
      return await query(sql, [orderId]);
    } catch (error) {
      logger.error(`Error in getOrderRatings: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new OrderDao();