const userService = require('../services/userService');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * 获取用户信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    
    // 检查权限
    if (req.user.id !== userId && req.user.role !== 'supervisor') {
      throw new ApiError(403, '无权查看此用户信息');
    }
    
    // 调用服务层方法
    const userInfo = await userService.getUserInfo(userId);
    
    res.status(200).json({
      success: true,
      data: userInfo
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新用户信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.updateUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const userData = req.body;
    
    // 检查权限
    if (req.user.id !== userId) {
      throw new ApiError(403, '只能更新自己的信息');
    }
    
    // 调用服务层方法
    const updatedUser = await userService.updateUserInfo(userId, userData);
    
    res.status(200).json({
      success: true,
      message: '用户信息更新成功',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取司机列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getDrivers = async (req, res, next) => {
  try {
    // 检查权限
    if (req.user.role !== 'owner' && req.user.role !== 'supervisor') {
      throw new ApiError(403, '无权查看司机列表');
    }
    
    const filters = {
      status: req.query.status,
      limit: req.query.limit,
      offset: req.query.offset
    };
    
    // 调用服务层方法
    const drivers = await userService.getDrivers(filters);
    
    res.status(200).json({
      success: true,
      data: drivers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取货主列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getOwners = async (req, res, next) => {
  try {
    // 检查权限
    if (req.user.role !== 'supervisor') {
      throw new ApiError(403, '无权查看货主列表');
    }
    
    const filters = {
      limit: req.query.limit,
      offset: req.query.offset
    };
    
    // 调用服务层方法
    const owners = await userService.getOwners(filters);
    
    res.status(200).json({
      success: true,
      data: owners
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新司机状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.updateDriverStatus = async (req, res, next) => {
  try {
    const driverId = req.params.driverId;
    const { status } = req.body;
    
    // 检查权限
    if (req.user.role !== 'driver' && req.user.role !== 'supervisor') {
      throw new ApiError(403, '无权更新司机状态');
    }
    
    // 如果是司机本人，只能更新自己的状态
    if (req.user.role === 'driver') {
      const driverProfile = await userDao.getDriverProfile(req.user.id);
      if (!driverProfile || driverProfile.driver_id !== driverId) {
        throw new ApiError(403, '只能更新自己的状态');
      }
    }
    
    // 调用服务层方法
    const result = await userService.updateDriverStatus(driverId, status);
    
    res.status(200).json({
      success: true,
      message: '司机状态更新成功'
    });
  } catch (error) {
    next(error);
  }
};