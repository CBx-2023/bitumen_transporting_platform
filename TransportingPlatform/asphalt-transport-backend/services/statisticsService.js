const statisticsDao = require('../dao/statisticsDao');
const userDao = require('../dao/userDao');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

class StatisticsService {
  /**
   * 获取平台概览统计数据
   * @param {string} userId - 请求用户ID
   * @param {string} userRole - 请求用户角色
   * @returns {Promise<Object>} - 统计数据
   */
  async getPlatformOverview(userId, userRole) {
    try {
      // 只有监管人员可以查看平台概览
      if (userRole !== 'supervisor') {
        throw new ApiError(403, '无权查看平台概览数据');
      }
      
      return await statisticsDao.getPlatformOverview();
    } catch (error) {
      logger.error(`Error in getPlatformOverview service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取司机统计数据
   * @param {string} driverId - 司机ID
   * @param {string} userId - 请求用户ID
   * @param {string} userRole - 请求用户角色
   * @returns {Promise<Object>} - 统计数据
   */
  async getDriverStatistics(driverId, userId, userRole) {
    try {
      // 检查权限
      if (userRole === 'driver') {
        // 司机只能查看自己的统计数据
        const driverProfile = await userDao.getDriverProfile(userId);
        if (!driverProfile || driverProfile.driver_id !== driverId) {
          throw new ApiError(403, '无权查看此司机的统计数据');
        }
      } else if (userRole !== 'supervisor') {
        // 只有司机本人和监管人员可以查看司机统计数据
        throw new ApiError(403, '无权查看司机统计数据');
      }
      
      // 获取司机信息
      const driverProfile = await userDao.getDriverProfileById(driverId);
      if (!driverProfile) {
        throw new ApiError(404, '司机信息不存在');
      }
      
      // 获取统计数据
      const statistics = await statisticsDao.getDriverStatistics(driverId);
      
      return {
        driverId,
        driverName: driverProfile.name,
        driverPhone: driverProfile.phone,
        driverCarNumber: driverProfile.car_number,
        ...statistics
      };
    } catch (error) {
      logger.error(`Error in getDriverStatistics service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取货主统计数据
   * @param {string} ownerId - 货主ID
   * @param {string} userId - 请求用户ID
   * @param {string} userRole - 请求用户角色
   * @returns {Promise<Object>} - 统计数据
   */
  async getOwnerStatistics(ownerId, userId, userRole) {
    try {
      // 检查权限
      if (userRole === 'owner') {
        // 货主只能查看自己的统计数据
        const ownerProfile = await userDao.getOwnerProfile(userId);
        if (!ownerProfile || ownerProfile.owner_id !== ownerId) {
          throw new ApiError(403, '无权查看此货主的统计数据');
        }
      } else if (userRole !== 'supervisor') {
        // 只有货主本人和监管人员可以查看货主统计数据
        throw new ApiError(403, '无权查看货主统计数据');
      }
      
      // 获取货主信息
      const ownerProfile = await userDao.getOwnerProfileById(ownerId);
      if (!ownerProfile) {
        throw new ApiError(404, '货主信息不存在');
      }
      
      // 获取统计数据
      const statistics = await statisticsDao.getOwnerStatistics(ownerId);
      
      return {
        ownerId,
        ownerName: ownerProfile.name,
        ownerPhone: ownerProfile.phone,
        ownerCompany: ownerProfile.company,
        ...statistics
      };
    } catch (error) {
      logger.error(`Error in getOwnerStatistics service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取每日订单统计
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @param {string} userId - 请求用户ID
   * @param {string} userRole - 请求用户角色
   * @returns {Promise<Array>} - 每日统计数据
   */
  async getDailyOrderStatistics(startDate, endDate, userId, userRole) {
    try {
      // 只有监管人员可以查看每日订单统计
      if (userRole !== 'supervisor') {
        throw new ApiError(403, '无权查看每日订单统计数据');
      }
      
      // 验证日期范围
      if (!startDate || !endDate) {
        throw new ApiError(400, '开始日期和结束日期不能为空');
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ApiError(400, '无效的日期格式');
      }
      
      if (start > end) {
        throw new ApiError(400, '开始日期不能晚于结束日期');
      }
      
      // 限制查询范围不超过90天
      const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) {
        throw new ApiError(400, '日期范围不能超过90天');
      }
      
      return await statisticsDao.getDailyOrderStatistics(start, end);
    } catch (error) {
      logger.error(`Error in getDailyOrderStatistics service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取每月订单统计
   * @param {number} year - 年份
   * @param {string} userId - 请求用户ID
   * @param {string} userRole - 请求用户角色
   * @returns {Promise<Array>} - 每月统计数据
   */
  async getMonthlyOrderStatistics(year, userId, userRole) {
    try {
      // 只有监管人员可以查看每月订单统计
      if (userRole !== 'supervisor') {
        throw new ApiError(403, '无权查看每月订单统计数据');
      }
      
      // 验证年份
      if (!year) {
        year = new Date().getFullYear();
      }
      
      year = parseInt(year);
      if (isNaN(year) || year < 2000 || year > 2100) {
        throw new ApiError(400, '无效的年份');
      }
      
      return await statisticsDao.getMonthlyOrderStatistics(year);
    } catch (error) {
      logger.error(`Error in getMonthlyOrderStatistics service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取货物类型统计
   * @param {string} userId - 请求用户ID
   * @param {string} userRole - 请求用户角色
   * @returns {Promise<Array>} - 货物类型统计数据
   */
  async getGoodsTypeStatistics(userId, userRole) {
    try {
      // 只有监管人员可以查看货物类型统计
      if (userRole !== 'supervisor') {
        throw new ApiError(403, '无权查看货物类型统计数据');
      }
      
      return await statisticsDao.getGoodsTypeStatistics();
    } catch (error) {
      logger.error(`Error in getGoodsTypeStatistics service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取热门路线统计
   * @param {number} limit - 限制返回数量
   * @param {string} userId - 请求用户ID
   * @param {string} userRole - 请求用户角色
   * @returns {Promise<Array>} - 热门路线统计数据
   */
  async getPopularRoutes(limit = 10, userId, userRole) {
    try {
      // 只有监管人员可以查看热门路线统计
      if (userRole !== 'supervisor') {
        throw new ApiError(403, '无权查看热门路线统计数据');
      }
      
      // 验证limit参数
      limit = parseInt(limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        limit = 10;
      }
      
      return await statisticsDao.getPopularRoutes(limit);
    } catch (error) {
      logger.error(`Error in getPopularRoutes service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取司机排名
   * @param {number} limit - 限制返回数量
   * @param {string} userId - 请求用户ID
   * @param {string} userRole - 请求用户角色
   * @returns {Promise<Array>} - 司机排名数据
   */
  async getDriverRankings(limit = 10, userId, userRole) {
    try {
      // 监管人员和货主可以查看司机排名
      if (userRole !== 'supervisor' && userRole !== 'owner') {
        throw new ApiError(403, '无权查看司机排名数据');
      }
      
      // 验证limit参数
      limit = parseInt(limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        limit = 10;
      }
      
      return await statisticsDao.getDriverRankings(limit);
    } catch (error) {
      logger.error(`Error in getDriverRankings service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户个人统计数据
   * @param {string} userId - 用户ID
   * @param {string} userRole - 用户角色
   * @returns {Promise<Object>} - 个人统计数据
   */
  async getUserPersonalStatistics(userId, userRole) {
    try {
      // 根据用户角色获取不同的统计数据
      if (userRole === 'driver') {
        const driverProfile = await userDao.getDriverProfile(userId);
        if (!driverProfile) {
          throw new ApiError(404, '司机信息不存在');
        }
        
        return await statisticsDao.getDriverStatistics(driverProfile.driver_id);
      } else if (userRole === 'owner') {
        const ownerProfile = await userDao.getOwnerProfile(userId);
        if (!ownerProfile) {
          throw new ApiError(404, '货主信息不存在');
        }
        
        return await statisticsDao.getOwnerStatistics(ownerProfile.owner_id);
      } else if (userRole === 'supervisor') {
        // 监管人员获取平台概览
        return await statisticsDao.getPlatformOverview();
      } else {
        throw new ApiError(400, '无效的用户角色');
      }
    } catch (error) {
      logger.error(`Error in getUserPersonalStatistics service: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new StatisticsService();