const locationService = require('../services/locationService');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * 更新司机位置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.updateDriverLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, speed, direction } = req.body;
    
    // 验证必要字段
    if (!latitude || !longitude) {
      throw new ApiError(400, '纬度和经度为必填项');
    }
    
    // 验证坐标范围
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new ApiError(400, '无效的坐标范围');
    }
    
    // 调用服务层方法
    const result = await locationService.updateDriverLocation(
      userId,
      parseFloat(latitude),
      parseFloat(longitude),
      { speed, direction }
    );
    
    res.status(200).json({
      success: true,
      message: '位置更新成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取司机当前位置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getDriverLocation = async (req, res, next) => {
  try {
    const driverId = req.params.driverId;
    
    // 调用服务层方法
    const location = await locationService.getDriverLocation(driverId);
    
    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取订单轨迹
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getOrderTracks = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    
    const options = {
      startTime: req.query.startTime,
      endTime: req.query.endTime,
      limit: req.query.limit,
      offset: req.query.offset
    };
    
    // 调用服务层方法
    const tracks = await locationService.getOrderTracks(orderId, options);
    
    res.status(200).json({
      success: true,
      data: tracks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取最新的轨迹点
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getLatestTrackPoint = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    
    // 调用服务层方法
    const track = await locationService.getLatestTrackPoint(orderId);
    
    res.status(200).json({
      success: true,
      data: track
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取附近的司机
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getNearbyDrivers = async (req, res, next) => {
  try {
    const { latitude, longitude, radius, status } = req.query;
    
    // 验证必要字段
    if (!latitude || !longitude) {
      throw new ApiError(400, '纬度和经度为必填项');
    }
    
    // 验证坐标范围
    if (parseFloat(latitude) < -90 || parseFloat(latitude) > 90 || 
        parseFloat(longitude) < -180 || parseFloat(longitude) > 180) {
      throw new ApiError(400, '无效的坐标范围');
    }
    
    // 验证半径
    const radiusKm = radius ? parseFloat(radius) : 10;
    if (isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
      throw new ApiError(400, '半径必须在0-100公里之间');
    }
    
    // 调用服务层方法
    const drivers = await locationService.getNearbyDrivers(
      parseFloat(latitude),
      parseFloat(longitude),
      radiusKm,
      status
    );
    
    res.status(200).json({
      success: true,
      data: drivers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取订单的实时位置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getOrderRealTimeLocation = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    
    // 调用服务层方法
    const location = await locationService.getOrderRealTimeLocation(orderId);
    
    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 计算两点之间的距离
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.calculateDistance = async (req, res, next) => {
  try {
    const { lat1, lng1, lat2, lng2 } = req.query;
    
    // 验证必要字段
    if (!lat1 || !lng1 || !lat2 || !lng2) {
      throw new ApiError(400, '两点的坐标为必填项');
    }
    
    // 验证坐标范围
    const coordinates = [
      { lat: parseFloat(lat1), lng: parseFloat(lng1) },
      { lat: parseFloat(lat2), lng: parseFloat(lng2) }
    ];
    
    for (const coord of coordinates) {
      if (coord.lat < -90 || coord.lat > 90 || coord.lng < -180 || coord.lng > 180) {
        throw new ApiError(400, '无效的坐标范围');
      }
    }
    
    // 调用服务层方法
    const distance = locationService.calculateDistance(
      parseFloat(lat1),
      parseFloat(lng1),
      parseFloat(lat2),
      parseFloat(lng2)
    );
    
    res.status(200).json({
      success: true,
      data: {
        distance: distance.toFixed(2),
        unit: 'km'
      }
    });
  } catch (error) {
    next(error);
  }
};