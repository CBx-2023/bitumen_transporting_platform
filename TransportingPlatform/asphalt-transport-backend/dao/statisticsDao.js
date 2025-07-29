const { query } = require('../utils/db');
const logger = require('../utils/logger');

class StatisticsDao {
  /**
   * 获取平台概览统计数据
   * @returns {Promise<Object>} - 统计数据
   */
  async getPlatformOverview() {
    try {
      // 用户统计
      const userCountSql = `
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN role = 'driver' THEN 1 ELSE 0 END) as driver_count,
          SUM(CASE WHEN role = 'owner' THEN 1 ELSE 0 END) as owner_count,
          SUM(CASE WHEN role = 'supervisor' THEN 1 ELSE 0 END) as supervisor_count
        FROM users
      `;
      
      // 订单统计
      const orderCountSql = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = '待接单' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = '运输中' THEN 1 ELSE 0 END) as in_progress_orders,
          SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) as cancelled_orders
        FROM orders
      `;
      
      // 今日订单统计
      const todayOrdersSql = `
        SELECT 
          COUNT(*) as today_orders,
          SUM(CASE WHEN status = '待接单' THEN 1 ELSE 0 END) as today_pending,
          SUM(CASE WHEN status = '运输中' THEN 1 ELSE 0 END) as today_in_progress,
          SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as today_completed,
          SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) as today_cancelled
        FROM orders
        WHERE DATE(create_time) = CURDATE()
      `;
      
      // 司机状态统计
      const driverStatusSql = `
        SELECT 
          SUM(CASE WHEN driver_status = '空闲中' THEN 1 ELSE 0 END) as free_drivers,
          SUM(CASE WHEN driver_status = '运输中' THEN 1 ELSE 0 END) as busy_drivers,
          SUM(CASE WHEN driver_status = '休息中' THEN 1 ELSE 0 END) as resting_drivers
        FROM driver_profiles
      `;
      
      // 并行执行所有查询
      const [userStats, orderStats, todayStats, driverStats] = await Promise.all([
        query(userCountSql),
        query(orderCountSql),
        query(todayOrdersSql),
        query(driverStatusSql)
      ]);
      
      return {
        users: userStats[0],
        orders: orderStats[0],
        todayOrders: todayStats[0],
        driverStatus: driverStats[0]
      };
    } catch (error) {
      logger.error(`Error in getPlatformOverview: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取司机统计数据
   * @param {string} driverId - 司机ID
   * @returns {Promise<Object>} - 统计数据
   */
  async getDriverStatistics(driverId) {
    try {
      // 订单总数统计
      const orderCountSql = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = '运输中' THEN 1 ELSE 0 END) as in_progress_orders,
          SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed_orders
        FROM orders
        WHERE driver_id = ?
      `;
      
      // 今日订单统计
      const todayOrdersSql = `
        SELECT COUNT(*) as today_orders
        FROM orders
        WHERE driver_id = ? AND DATE(create_time) = CURDATE()
      `;
      
      // 本月订单统计
      const monthOrdersSql = `
        SELECT COUNT(*) as month_orders
        FROM orders
        WHERE driver_id = ? AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())
      `;
      
      // 评分统计
      const ratingSql = `
        SELECT 
          AVG(score) as average_rating,
          COUNT(*) as rating_count
        FROM ratings
        WHERE to_user_id = (SELECT user_id FROM driver_profiles WHERE driver_id = ?)
      `;
      
      // 并行执行所有查询
      const [orderStats, todayStats, monthStats, ratingStats] = await Promise.all([
        query(orderCountSql, [driverId]),
        query(todayOrdersSql, [driverId]),
        query(monthOrdersSql, [driverId]),
        query(ratingSql, [driverId])
      ]);
      
      return {
        orders: orderStats[0],
        todayOrders: todayStats[0].today_orders,
        monthOrders: monthStats[0].month_orders,
        rating: {
          average: ratingStats[0].average_rating || 0,
          count: ratingStats[0].rating_count || 0
        }
      };
    } catch (error) {
      logger.error(`Error in getDriverStatistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取货主统计数据
   * @param {string} ownerId - 货主ID
   * @returns {Promise<Object>} - 统计数据
   */
  async getOwnerStatistics(ownerId) {
    try {
      // 订单总数统计
      const orderCountSql = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = '待接单' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = '运输中' THEN 1 ELSE 0 END) as in_progress_orders,
          SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) as cancelled_orders
        FROM orders
        WHERE owner_id = ?
      `;
      
      // 今日订单统计
      const todayOrdersSql = `
        SELECT COUNT(*) as today_orders
        FROM orders
        WHERE owner_id = ? AND DATE(create_time) = CURDATE()
      `;
      
      // 本月订单统计
      const monthOrdersSql = `
        SELECT COUNT(*) as month_orders
        FROM orders
        WHERE owner_id = ? AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())
      `;
      
      // 支付统计
      const paymentSql = `
        SELECT 
          SUM(amount) as total_payment,
          COUNT(*) as payment_count
        FROM payments
        WHERE payer_id = (SELECT user_id FROM owner_profiles WHERE owner_id = ?)
          AND payment_status = '已支付'
      `;
      
      // 并行执行所有查询
      const [orderStats, todayStats, monthStats, paymentStats] = await Promise.all([
        query(orderCountSql, [ownerId]),
        query(todayOrdersSql, [ownerId]),
        query(monthOrdersSql, [ownerId]),
        query(paymentSql, [ownerId])
      ]);
      
      return {
        orders: orderStats[0],
        todayOrders: todayStats[0].today_orders,
        monthOrders: monthStats[0].month_orders,
        payment: {
          total: paymentStats[0].total_payment || 0,
          count: paymentStats[0].payment_count || 0
        }
      };
    } catch (error) {
      logger.error(`Error in getOwnerStatistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取每日订单统计
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Promise<Array>} - 每日统计数据
   */
  async getDailyOrderStatistics(startDate, endDate) {
    try {
      const sql = `
        SELECT 
          DATE(create_time) as date,
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = '待接单' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = '运输中' THEN 1 ELSE 0 END) as in_progress_orders,
          SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) as cancelled_orders
        FROM orders
        WHERE create_time BETWEEN ? AND ?
        GROUP BY DATE(create_time)
        ORDER BY DATE(create_time)
      `;
      
      return await query(sql, [startDate, endDate]);
    } catch (error) {
      logger.error(`Error in getDailyOrderStatistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取每月订单统计
   * @param {number} year - 年份
   * @returns {Promise<Array>} - 每月统计数据
   */
  async getMonthlyOrderStatistics(year) {
    try {
      const sql = `
        SELECT 
          MONTH(create_time) as month,
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = '待接单' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = '运输中' THEN 1 ELSE 0 END) as in_progress_orders,
          SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) as cancelled_orders
        FROM orders
        WHERE YEAR(create_time) = ?
        GROUP BY MONTH(create_time)
        ORDER BY MONTH(create_time)
      `;
      
      return await query(sql, [year]);
    } catch (error) {
      logger.error(`Error in getMonthlyOrderStatistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取货物类型统计
   * @returns {Promise<Array>} - 货物类型统计数据
   */
  async getGoodsTypeStatistics() {
    try {
      const sql = `
        SELECT 
          goods_type,
          COUNT(*) as order_count,
          SUM(weight) as total_weight
        FROM orders
        GROUP BY goods_type
        ORDER BY order_count DESC
      `;
      
      return await query(sql);
    } catch (error) {
      logger.error(`Error in getGoodsTypeStatistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取热门路线统计
   * @param {number} limit - 限制返回数量
   * @returns {Promise<Array>} - 热门路线统计数据
   */
  async getPopularRoutes(limit = 10) {
    try {
      const sql = `
        SELECT 
          start_address,
          end_address,
          COUNT(*) as route_count
        FROM orders
        GROUP BY start_address, end_address
        ORDER BY route_count DESC
        LIMIT ?
      `;
      
      return await query(sql, [limit]);
    } catch (error) {
      logger.error(`Error in getPopularRoutes: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取司机排名
   * @param {number} limit - 限制返回数量
   * @returns {Promise<Array>} - 司机排名数据
   */
  async getDriverRankings(limit = 10) {
    try {
      const sql = `
        SELECT 
          d.driver_id,
          u.name,
          u.avatar,
          d.car_number,
          COUNT(o.order_id) as completed_orders,
          AVG(r.score) as average_rating
        FROM driver_profiles d
        JOIN users u ON d.user_id = u.user_id
        LEFT JOIN orders o ON d.driver_id = o.driver_id AND o.status = '已完成'
        LEFT JOIN ratings r ON r.to_user_id = u.user_id
        GROUP BY d.driver_id, u.name, u.avatar, d.car_number
        ORDER BY completed_orders DESC, average_rating DESC
        LIMIT ?
      `;
      
      return await query(sql, [limit]);
    } catch (error) {
      logger.error(`Error in getDriverRankings: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new StatisticsDao();