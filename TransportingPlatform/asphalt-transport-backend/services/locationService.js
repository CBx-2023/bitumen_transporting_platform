const locationDao = require('../dao/locationDao');
const orderDao = require('../dao/orderDao');
const userDao = require('../dao/userDao');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

class LocationService {
  /**
   * 更新司机位置
   * @param {string} userId - 司机用户ID
   * @param {number} latitude - 纬度
   * @param {number} longitude - 经度
   * @param {Object} additionalData - 额外数据（速度、方向等）
   * @returns {Promise<Object>} - 更新结果
   */
  async updateDriverLocation(userId, latitude, longitude, additionalData = {}) {
    try {
      // 验证用户是否为司机
      const user = await userDao.findById(userId);
      if (!user || user.role !== 'driver') {
        throw new ApiError(403, '只有司机可以更新位置');
      }
      
      // 获取司机信息
      const driverProfile = await userDao.getDriverProfile(userId);
      if (!driverProfile) {
        throw new ApiError(404, '司机信息不存在');
      }
      
      // 更新司机位置
      await locationDao.updateDriverLocation(driverProfile.driver_id, latitude, longitude);
      
      // 如果司机正在运输中，记录轨迹
      if (driverProfile.driver_status === '运输中') {
        // 查找司机当前正在运输的订单
        const activeOrders = await orderDao.getOrders({
          driverId: driverProfile.driver_id,
          status: '运输中'
        });
        
        if (activeOrders && activeOrders.length > 0) {
          const order = activeOrders[0]; // 假设一个司机同时只能有一个运输中的订单
          
          // 记录轨迹点
          await locationDao.addTrackPoint({
            orderId: order.order_id,
            driverId: driverProfile.driver_id,
            latitude,
            longitude,
            speed: additionalData.speed || null,
            direction: additionalData.direction || null
          });
          
          // 计算与目的地的距离
          const endLat = order.end_lat;
          const endLng = order.end_lng;
          const distanceToDestination = locationDao.calculateDistance(
            latitude, longitude, endLat, endLng
          );
          
          return {
            success: true,
            updated: true,
            trackRecorded: true,
            distanceToDestination: distanceToDestination.toFixed(2),
            orderId: order.order_id
          };
        }
        
        return {
          success: true,
          updated: true,
          trackRecorded: false
        };
      }
      
      return {
        success: true,
        updated: true,
        trackRecorded: false
      };
    } catch (error) {
      logger.error(`Error in updateDriverLocation service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取司机当前位置
   * @param {string} driverId - 司机ID
   * @returns {Promise<Object>} - 位置信息
   */
  async getDriverLocation(driverId) {
    try {
      const location = await locationDao.getDriverLocation(driverId);
      if (!location) {
        throw new ApiError(404, '司机位置信息不存在');
      }
      
      return location;
    } catch (error) {
      logger.error(`Error in getDriverLocation service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取订单轨迹
   * @param {string} orderId - 订单ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} - 轨迹点列表
   */
  async getOrderTracks(orderId, options = {}) {
    try {
      // 获取订单信息
      const order = await orderDao.getOrderById(orderId);
      if (!order) {
        throw new ApiError(404, '订单不存在');
      }
      
      // 获取轨迹点
      const tracks = await locationDao.getOrderTracks(orderId, options);
      
      // 计算一些额外信息
      if (tracks.length > 0) {
        // 计算总距离
        let totalDistance = 0;
        for (let i = 1; i < tracks.length; i++) {
          const prevTrack = tracks[i - 1];
          const currTrack = tracks[i];
          
          const distance = locationDao.calculateDistance(
            prevTrack.latitude, prevTrack.longitude,
            currTrack.latitude, currTrack.longitude
          );
          
          totalDistance += distance;
        }
        
        // 计算平均速度
        const firstTrack = tracks[0];
        const lastTrack = tracks[tracks.length - 1];
        const timeElapsed = (new Date(lastTrack.track_time) - new Date(firstTrack.track_time)) / 3600000; // 小时
        const averageSpeed = timeElapsed > 0 ? totalDistance / timeElapsed : 0;
        
        return {
          tracks,
          totalDistance: totalDistance.toFixed(2),
          averageSpeed: averageSpeed.toFixed(2),
          trackCount: tracks.length,
          startTime: firstTrack.track_time,
          endTime: lastTrack.track_time
        };
      }
      
      return {
        tracks,
        totalDistance: 0,
        averageSpeed: 0,
        trackCount: 0
      };
    } catch (error) {
      logger.error(`Error in getOrderTracks service: ${error.message}`);
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
      return await locationDao.getLatestTrackPoint(orderId);
    } catch (error) {
      logger.error(`Error in getLatestTrackPoint service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取附近的司机
   * @param {number} latitude - 纬度
   * @param {number} longitude - 经度
   * @param {number} radiusKm - 半径（公里）
   * @param {string} status - 司机状态过滤
   * @returns {Promise<Array>} - 司机列表
   */
  async getNearbyDrivers(latitude, longitude, radiusKm = 10, status = null) {
    try {
      const drivers = await locationDao.getNearbyDrivers(latitude, longitude, radiusKm, status);
      
      // 计算每个司机的确切距离
      for (const driver of drivers) {
        driver.exactDistance = locationDao.calculateDistance(
          latitude, longitude, driver.current_lat, driver.current_lng
        ).toFixed(2);
      }
      
      return drivers;
    } catch (error) {
      logger.error(`Error in getNearbyDrivers service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 计算两点之间的距离
   * @param {number} lat1 - 第一点纬度
   * @param {number} lng1 - 第一点经度
   * @param {number} lat2 - 第二点纬度
   * @param {number} lng2 - 第二点经度
   * @returns {number} - 距离（公里）
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    return locationDao.calculateDistance(lat1, lng1, lat2, lng2);
  }

  /**
   * 获取订单的实时位置
   * @param {string} orderId - 订单ID
   * @returns {Promise<Object>} - 位置信息
   */
  async getOrderRealTimeLocation(orderId) {
    try {
      // 获取订单信息
      const order = await orderDao.getOrderById(orderId);
      if (!order) {
        throw new ApiError(404, '订单不存在');
      }
      
      // 检查订单状态
      if (order.status !== '运输中') {
        throw new ApiError(400, '只有运输中的订单才有实时位置');
      }
      
      // 获取最新轨迹点
      const latestTrack = await locationDao.getLatestTrackPoint(orderId);
      if (!latestTrack) {
        throw new ApiError(404, '暂无位置信息');
      }
      
      // 计算与目的地的距离
      const distanceToDestination = locationDao.calculateDistance(
        latestTrack.latitude, latestTrack.longitude,
        order.end_lat, order.end_lng
      );
      
      // 计算预计到达时间（简单估算，假设平均速度为60km/h）
      const estimatedArrivalTime = new Date();
      const hoursToDestination = distanceToDestination / 60; // 假设平均速度为60km/h
      estimatedArrivalTime.setHours(estimatedArrivalTime.getHours() + hoursToDestination);
      
      return {
        orderId,
        latitude: latestTrack.latitude,
        longitude: latestTrack.longitude,
        updateTime: latestTrack.track_time,
        speed: latestTrack.speed,
        direction: latestTrack.direction,
        distanceToDestination: distanceToDestination.toFixed(2),
        estimatedArrivalTime
      };
    } catch (error) {
      logger.error(`Error in getOrderRealTimeLocation service: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new LocationService();