const statisticsService = require('../services/statisticsService');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * 获取平台概览统计数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getPlatformOverview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 调用服务层方法
    const statistics = await statisticsService.getPlatformOverview(userId, userRole);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取司机统计数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getDriverStatistics = async (req, res, next) => {
  try {
    const driverId = req.params.driverId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 调用服务层方法
    const statistics = await statisticsService.getDriverStatistics(driverId, userId, userRole);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取货主统计数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getOwnerStatistics = async (req, res, next) => {
  try {
    const ownerId = req.params.ownerId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 调用服务层方法
    const statistics = await statisticsService.getOwnerStatistics(ownerId, userId, userRole);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取每日订单统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getDailyOrderStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 调用服务层方法
    const statistics = await statisticsService.getDailyOrderStatistics(
      startDate,
      endDate,
      userId,
      userRole
    );
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取每月订单统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getMonthlyOrderStatistics = async (req, res, next) => {
  try {
    const { year } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 调用服务层方法
    const statistics = await statisticsService.getMonthlyOrderStatistics(
      year,
      userId,
      userRole
    );
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取货物类型统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getGoodsTypeStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 调用服务层方法
    const statistics = await statisticsService.getGoodsTypeStatistics(userId, userRole);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取热门路线统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getPopularRoutes = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 调用服务层方法
    const statistics = await statisticsService.getPopularRoutes(limit, userId, userRole);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取司机排名
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getDriverRankings = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 调用服务层方法
    const statistics = await statisticsService.getDriverRankings(limit, userId, userRole);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取用户个人统计数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getUserPersonalStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 调用服务层方法
    const statistics = await statisticsService.getUserPersonalStatistics(userId, userRole);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};