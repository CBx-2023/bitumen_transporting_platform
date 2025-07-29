const userService = require('../services/userService');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * 用户注册
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.register = async (req, res, next) => {
  try {
    const userData = req.body;
    
    // 验证必要字段
    if (!userData.phone || !userData.password || !userData.name || !userData.role) {
      throw new ApiError(400, '手机号、密码、姓名和角色为必填项');
    }
    
    // 验证角色
    const validRoles = ['driver', 'owner', 'supervisor'];
    if (!validRoles.includes(userData.role)) {
      throw new ApiError(400, '无效的角色');
    }
    
    // 调用服务层方法
    const result = await userService.register(userData);
    
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 用户登录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    
    // 验证必要字段
    if (!phone || !password) {
      throw new ApiError(400, '手机号和密码为必填项');
    }
    
    // 调用服务层方法
    const result = await userService.login(phone, password);
    
    res.status(200).json({
      success: true,
      message: '登录成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前用户信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    // 从请求对象中获取用户ID（由认证中间件设置）
    const userId = req.user.id;
    
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
 * 更改密码
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    
    // 验证必要字段
    if (!oldPassword || !newPassword) {
      throw new ApiError(400, '旧密码和新密码为必填项');
    }
    
    // 验证新密码长度
    if (newPassword.length < 6) {
      throw new ApiError(400, '新密码长度不能少于6位');
    }
    
    // 调用服务层方法
    const result = await userService.changePassword(userId, oldPassword, newPassword);
    
    res.status(200).json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 刷新令牌
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
exports.refreshToken = async (req, res, next) => {
  try {
    // 从请求对象中获取用户信息（由认证中间件设置）
    const { id, role, profileId } = req.user;
    
    // 生成新的令牌
    const { generateToken } = require('../utils/jwtHelper');
    const token = generateToken({ id, role, profileId });
    
    res.status(200).json({
      success: true,
      message: '令牌刷新成功',
      data: { token }
    });
  } catch (error) {
    next(error);
  }
};