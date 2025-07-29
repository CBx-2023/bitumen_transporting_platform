const bcrypt = require('bcryptjs');
const userDao = require('../dao/userDao');
const { generateToken } = require('../utils/jwtHelper');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

class UserService {
  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} - 包含用户信息和token的对象
   */
  async register(userData) {
    try {
      const { phone, password, name, role } = userData;
      
      // 检查用户是否已存在
      const existingUser = await userDao.findByPhone(phone);
      if (existingUser) {
        throw new ApiError(409, '该手机号已注册');
      }
      
      // 密码加密
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      // 创建用户
      const userId = await userDao.create({
        phone,
        passwordHash,
        name,
        role
      });
      
      // 根据角色创建对应的信息
      let profileId = null;
      
      if (role === 'driver') {
        const { idCard, licenseNumber, carNumber, carType, carCapacity } = userData;
        
        // 验证司机特有字段
        if (!idCard || !licenseNumber || !carNumber || !carType || !carCapacity) {
          throw new ApiError(400, '司机注册需要提供完整的车辆和证件信息');
        }
        
        profileId = await userDao.createDriverProfile({
          userId,
          idCard,
          licenseNumber,
          carNumber,
          carType,
          carCapacity
        });
      } else if (role === 'owner') {
        const { company, businessLicense, contactAddress } = userData;
        
        profileId = await userDao.createOwnerProfile({
          userId,
          company,
          businessLicense,
          contactAddress
        });
      } else if (role === 'supervisor') {
        const { department, position, authorityLevel } = userData;
        
        // 验证监管人员特有字段
        if (!department || !position) {
          throw new ApiError(400, '监管人员注册需要提供部门和职位信息');
        }
        
        profileId = await userDao.createSupervisorProfile({
          userId,
          department,
          position,
          authorityLevel
        });
      }
      
      // 获取创建的用户
      const user = await userDao.findById(userId);
      
      // 生成JWT令牌
      const token = generateToken({
        id: userId,
        role,
        profileId
      });
      
      // 返回用户信息和令牌
      return {
        token,
        user: {
          id: userId,
          name: user.name,
          phone: user.phone,
          role: user.role,
          profileId
        }
      };
    } catch (error) {
      logger.error(`Error in register service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 用户登录
   * @param {string} phone - 手机号
   * @param {string} password - 密码
   * @returns {Promise<Object>} - 包含用户信息和token的对象
   */
  async login(phone, password) {
    try {
      // 查找用户
      const user = await userDao.findByPhone(phone);
      if (!user) {
        throw new ApiError(401, '手机号或密码错误');
      }
      
      // 验证密码
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        throw new ApiError(401, '手机号或密码错误');
      }
      
      // 检查用户状态
      if (user.status === 0) {
        throw new ApiError(403, '账号已被禁用，请联系管理员');
      }
      
      // 获取用户角色对应的信息
      let profileId = null;
      let profileData = null;
      
      if (user.role === 'driver') {
        const driverProfile = await userDao.getDriverProfile(user.user_id);
        if (driverProfile) {
          profileId = driverProfile.driver_id;
          profileData = {
            carNumber: driverProfile.car_number,
            carType: driverProfile.car_type,
            carCapacity: driverProfile.car_capacity,
            status: driverProfile.driver_status
          };
        }
      } else if (user.role === 'owner') {
        const ownerProfile = await userDao.getOwnerProfile(user.user_id);
        if (ownerProfile) {
          profileId = ownerProfile.owner_id;
          profileData = {
            company: ownerProfile.company
          };
        }
      } else if (user.role === 'supervisor') {
        const supervisorProfile = await userDao.getSupervisorProfile(user.user_id);
        if (supervisorProfile) {
          profileId = supervisorProfile.supervisor_id;
          profileData = {
            department: supervisorProfile.department,
            position: supervisorProfile.position,
            authorityLevel: supervisorProfile.authority_level
          };
        }
      }
      
      // 更新最后登录时间
      await userDao.updateLastLoginTime(user.user_id);
      
      // 生成JWT令牌
      const token = generateToken({
        id: user.user_id,
        role: user.role,
        profileId
      });
      
      // 返回用户信息和令牌
      return {
        token,
        user: {
          id: user.user_id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          profileId,
          ...profileData
        }
      };
    } catch (error) {
      logger.error(`Error in login service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户信息
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} - 用户信息
   */
  async getUserInfo(userId) {
    try {
      // 查找用户
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      // 获取用户角色对应的信息
      let profileId = null;
      let profileData = null;
      
      if (user.role === 'driver') {
        const driverProfile = await userDao.getDriverProfile(user.user_id);
        if (driverProfile) {
          profileId = driverProfile.driver_id;
          profileData = {
            carNumber: driverProfile.car_number,
            carType: driverProfile.car_type,
            carCapacity: driverProfile.car_capacity,
            status: driverProfile.driver_status
          };
        }
      } else if (user.role === 'owner') {
        const ownerProfile = await userDao.getOwnerProfile(user.user_id);
        if (ownerProfile) {
          profileId = ownerProfile.owner_id;
          profileData = {
            company: ownerProfile.company
          };
        }
      } else if (user.role === 'supervisor') {
        const supervisorProfile = await userDao.getSupervisorProfile(user.user_id);
        if (supervisorProfile) {
          profileId = supervisorProfile.supervisor_id;
          profileData = {
            department: supervisorProfile.department,
            position: supervisorProfile.position,
            authorityLevel: supervisorProfile.authority_level
          };
        }
      }
      
      // 返回用户信息
      return {
        id: user.user_id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        createTime: user.create_time,
        lastLoginTime: user.last_login_time,
        profileId,
        ...profileData
      };
    } catch (error) {
      logger.error(`Error in getUserInfo service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新用户信息
   * @param {string} userId - 用户ID
   * @param {Object} userData - 要更新的用户数据
   * @returns {Promise<Object>} - 更新后的用户信息
   */
  async updateUserInfo(userId, userData) {
    try {
      // 查找用户
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      // 更新用户基本信息
      const { name, avatar } = userData;
      await userDao.update(userId, { name, avatar });
      
      // 根据角色更新对应的信息
      if (user.role === 'driver' && userData.driver) {
        const driverProfile = await userDao.getDriverProfile(userId);
        if (driverProfile) {
          // 更新司机信息的逻辑（如果需要）
          // 这里可以添加更新司机信息的代码
        }
      } else if (user.role === 'owner' && userData.owner) {
        const ownerProfile = await userDao.getOwnerProfile(userId);
        if (ownerProfile) {
          // 更新货主信息的逻辑（如果需要）
          // 这里可以添加更新货主信息的代码
        }
      }
      
      // 获取更新后的用户信息
      return await this.getUserInfo(userId);
    } catch (error) {
      logger.error(`Error in updateUserInfo service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更改密码
   * @param {string} userId - 用户ID
   * @param {string} oldPassword - 旧密码
   * @param {string} newPassword - 新密码
   * @returns {Promise<boolean>} - 是否更新成功
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // 查找用户
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      // 验证旧密码
      const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isMatch) {
        throw new ApiError(401, '旧密码错误');
      }
      
      // 加密新密码
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      
      // 更新密码
      await userDao.updatePassword(userId, passwordHash);
      
      return true;
    } catch (error) {
      logger.error(`Error in changePassword service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取司机列表
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} - 司机列表
   */
  async getDrivers(filters = {}) {
    try {
      return await userDao.getDrivers(filters);
    } catch (error) {
      logger.error(`Error in getDrivers service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取货主列表
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} - 货主列表
   */
  async getOwners(filters = {}) {
    try {
      return await userDao.getOwners(filters);
    } catch (error) {
      logger.error(`Error in getOwners service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新司机状态
   * @param {string} driverId - 司机ID
   * @param {string} status - 新状态
   * @returns {Promise<boolean>} - 是否更新成功
   */
  async updateDriverStatus(driverId, status) {
    try {
      // 验证状态值
      const validStatuses = ['空闲中', '运输中', '休息中'];
      if (!validStatuses.includes(status)) {
        throw new ApiError(400, '无效的状态值');
      }
      
      // 更新状态
      return await userDao.updateDriverStatus(driverId, status);
    } catch (error) {
      logger.error(`Error in updateDriverStatus service: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new UserService();