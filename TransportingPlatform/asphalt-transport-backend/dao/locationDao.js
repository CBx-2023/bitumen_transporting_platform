const { v4: uuidv4 } = require('uuid');
const { query } = require('../utils/db');
const logger = require('../utils/logger');

class LocationDao {
  /**
   * 更新司机位置
   * @param {string} driverId - 司机ID
   * @param {number} latitude - 纬度
   * @param {number} longitude - 经度
   * @returns {Promise<boolean>} - 更新是否成功
   */
  async updateDriverLocation(driverId, latitude, longitude) {
    try {
      const sql = `
        UPDATE driver_profiles 
        SET current_lat = ?, current_lng = ?, location_update_time = NOW() 
        WHERE driver_id = ?
      `;
      
      const result = await query(sql, [latitude, longitude, driverId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in updateDriverLocation: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取司机当前位置
   * @param {string} driverId - 司机ID
   * @returns {Promise<Object|null>} - 位置信息或null
   */
  async getDriverLocation(driverId) {
    try {
      const sql = `
        SELECT driver_id, current_lat, current_lng, location_update_time 
        FROM driver_profiles 
        WHERE driver_id = ?
      `;
      
      const results = await query(sql, [driverId]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error(`Error in getDriverLocation: ${error.message}`);
      throw error;
    }
  }

  /**
   * 添加运输轨迹点
   * @param {Object} trackData - 轨迹数据
   * @returns {Promise<string>} - 轨迹ID
   */
  async addTrackPoint(trackData) {
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
      logger.error(`Error in addTrackPoint: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取订单的轨迹点
   * @param {string} orderId - 订单ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} - 轨迹点列表
   */
  async getOrderTracks(orderId, options = {}) {
    try {
      let sql = `
        SELECT * FROM transport_tracks 
        WHERE order_id = ? 
      `;
      
      const params = [orderId];
      
      // 添加时间范围过滤
      if (options.startTime) {
        sql += ' AND track_time >= ?';
        params.push(options.startTime);
      }
      
      if (options.endTime) {
        sql += ' AND track_time <= ?';
        params.push(options.endTime);
      }
      
      // 添加排序
      sql += ' ORDER BY track_time ASC';
      
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
      logger.error(`Error in getOrderTracks: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取最新的轨迹点
   * @param {string} orderId - 订单ID
   * @returns {Promise<Object|null>} - 最新轨迹点或null
   */
  async getLatestTrackPoint(orderId) {
    try {
      const sql = `
        SELECT * FROM transport_tracks 
        WHERE order_id = ? 
        ORDER BY track_time DESC 
        LIMIT 1
      `;
      
      const results = await query(sql, [orderId]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error(`Error in getLatestTrackPoint: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取指定范围内的司机
   * @param {number} latitude - 中心点纬度
   * @param {number} longitude - 中心点经度
   * @param {number} radiusKm - 半径（公里）
   * @param {string} status - 司机状态过滤
   * @returns {Promise<Array>} - 司机列表
   */
  async getNearbyDrivers(latitude, longitude, radiusKm, status = null) {
    try {
      // 使用Haversine公式计算距离
      const sql = `
        SELECT 
          d.*,
          u.name, u.phone, u.avatar,
          (
            6371 * acos(
              cos(radians(?)) * cos(radians(d.current_lat)) * cos(radians(d.current_lng) - radians(?)) +
              sin(radians(?)) * sin(radians(d.current_lat))
            )
          ) AS distance
        FROM driver_profiles d
        JOIN users u ON d.user_id = u.user_id
        WHERE d.current_lat IS NOT NULL 
          AND d.current_lng IS NOT NULL
          ${status ? 'AND d.driver_status = ?' : ''}
        HAVING distance < ?
        ORDER BY distance
        LIMIT 100
      `;
      
      const params = status 
        ? [latitude, longitude, latitude, status, radiusKm]
        : [latitude, longitude, latitude, radiusKm];
      
      return await query(sql, params);
    } catch (error) {
      logger.error(`Error in getNearbyDrivers: ${error.message}`);
      throw error;
    }
  }

  /**
   * 计算两点之间的距离（公里）
   * @param {number} lat1 - 第一点纬度
   * @param {number} lng1 - 第一点经度
   * @param {number} lat2 - 第二点纬度
   * @param {number} lng2 - 第二点经度
   * @returns {number} - 距离（公里）
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 地球半径（公里）
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 将角度转换为弧度
   * @param {number} degrees - 角度
   * @returns {number} - 弧度
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = new LocationDao();