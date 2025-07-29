const { verifyToken } = require('../utils/jwtHelper');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * 认证中间件 - 验证用户是否已登录
 */
const authenticate = (req, res, next) => {
  try {
    // 从请求头中获取Authorization
    const authHeader = req.headers.authorization;
    
    // 检查Authorization头是否存在
    if (!authHeader) {
      throw new ApiError(401, 'Authorization header is required');
    }
    
    // 检查Authorization格式是否正确
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new ApiError(401, 'Authorization format should be: Bearer [token]');
    }
    
    const token = parts[1];
    
    // 验证令牌
    const decoded = verifyToken(token);
    
    // 将用户信息添加到请求对象
    req.user = decoded;
    
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    next(error);
  }
};

/**
 * 角色验证中间件 - 检查用户是否具有特定角色
 * @param {string[]} roles - 允许访问的角色数组
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    try {
      // 确保用户已通过认证
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated');
      }
      
      // 如果未指定角色，则允许所有已认证的用户
      if (roles.length === 0) {
        return next();
      }
      
      // 检查用户是否具有所需角色
      if (!roles.includes(req.user.role)) {
        throw new ApiError(403, 'You do not have permission to access this resource');
      }
      
      next();
    } catch (error) {
      logger.error(`Authorization error: ${error.message}`);
      next(error);
    }
  };
};

module.exports = {
  authenticate,
  authorize
};