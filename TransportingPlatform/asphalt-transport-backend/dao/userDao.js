const { v4: uuidv4 } = require('uuid');
const { query } = require('../utils/db');
const logger = require('../utils/logger');

class UserDao {
  /**
   * 根据手机号查找用户
   * @param {string} phone - 用户手机号
   * @returns {Promise<Object|null>} - 用户对象或null
   */
  async findByPhone(phone) {
    try {
      const sql = 'SELECT * FROM users WHERE phone = ?';
      const users = await query(sql, [phone]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error(`Error in findByPhone: ${error.message}`);
      throw error;
    }
  }

  /**
   * 根据ID查找用户
   * @param {string} userId - 用户ID
   * @returns {Promise<Object|null>} - 用户对象或null
   */
  async findById(userId) {
    try {
      const sql = 'SELECT * FROM users WHERE user_id = ?';
      const users = await query(sql, [userId]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error(`Error in findById: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建新用户
   * @param {Object} userData - 用户数据
   * @returns {Promise<string>} - 新创建的用户ID
   */
  async create(userData) {
    try {
      const userId = uuidv4();
      const { phone, passwordHash, name, role, avatar = null } = userData;
      
      const sql = `
        INSERT INTO users (user_id, phone, password_hash, name, role, avatar) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await query(sql, [userId, phone, passwordHash, name, role, avatar]);
      
      return userId;
    } catch (error) {
      logger.error(`Error in create user: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新用户信息
   * @param {string} userId - 用户ID
   * @param {Object} userData - 要更新的用户数据
   * @returns {Promise<boolean>} - 更新是否成功
   */
  async update(userId, userData) {
    try {
      const { name, avatar } = userData;
      
      const sql = `
        UPDATE users 
        SET name = ?, avatar = ?, update_time = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;
      
      const result = await query(sql, [name, avatar, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in update user: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新用户密码
   * @param {string} userId - 用户ID
   * @param {string} passwordHash - 新密码的哈希值
   * @returns {Promise<boolean>} - 更新是否成功
   */
  async updatePassword(userId, passwordHash) {
    try {
      const sql = `
        UPDATE users 
        SET password_hash = ?, update_time = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;
      
      const result = await query(sql, [passwordHash, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in updatePassword: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新用户最后登录时间
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} - 更新是否成功
   */
  async updateLastLoginTime(userId) {
    try {
      const sql = `
        UPDATE users 
        SET last_login_time = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;
      
      const result = await query(sql, [userId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in updateLastLoginTime: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建司机信息
   * @param {Object} driverData - 司机数据
   * @returns {Promise<string>} - 新创建的司机ID
   */
  async createDriverProfile(driverData) {
    try {
      const driverId = uuidv4();
      const { 
        userId, 
        idCard, 
        licenseNumber, 
        carNumber, 
        carType, 
        carCapacity 
      } = driverData;
      
      const sql = `
        INSERT INTO driver_profiles 
        (driver_id, user_id, id_card, license_number, car_number, car_type, car_capacity) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await query(sql, [
        driverId, 
        userId, 
        idCard, 
        licenseNumber, 
        carNumber, 
        carType, 
        carCapacity
      ]);
      
      return driverId;
    } catch (error) {
      logger.error(`Error in createDriverProfile: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建货主信息
   * @param {Object} ownerData - 货主数据
   * @returns {Promise<string>} - 新创建的货主ID
   */
  async createOwnerProfile(ownerData) {
    try {
      const ownerId = uuidv4();
      const { 
        userId, 
        company = null, 
        businessLicense = null, 
        contactAddress = null 
      } = ownerData;
      
      const sql = `
        INSERT INTO owner_profiles 
        (owner_id, user_id, company, business_license, contact_address) 
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await query(sql, [
        ownerId, 
        userId, 
        company, 
        businessLicense, 
        contactAddress
      ]);
      
      return ownerId;
    } catch (error) {
      logger.error(`Error in createOwnerProfile: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建监管人员信息
   * @param {Object} supervisorData - 监管人员数据
   * @returns {Promise<string>} - 新创建的监管人员ID
   */
  async createSupervisorProfile(supervisorData) {
    try {
      const supervisorId = uuidv4();
      const { 
        userId, 
        department, 
        position, 
        authorityLevel = 1 
      } = supervisorData;
      
      const sql = `
        INSERT INTO supervisor_profiles 
        (supervisor_id, user_id, department, position, authority_level) 
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await query(sql, [
        supervisorId, 
        userId, 
        department, 
        position, 
        authorityLevel
      ]);
      
      return supervisorId;
    } catch (error) {
      logger.error(`Error in createSupervisorProfile: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取司机信息
   * @param {string} userId - 用户ID
   * @returns {Promise<Object|null>} - 司机信息或null
   */
  async getDriverProfile(userId) {
    try {
      const sql = `
        SELECT d.* FROM driver_profiles d
        JOIN users u ON d.user_id = u.user_id
        WHERE u.user_id = ?
      `;
      
      const profiles = await query(sql, [userId]);
      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      logger.error(`Error in getDriverProfile: ${error.message}`);
      throw error;
    }
  }

  /**
   * 根据司机ID获取司机信息
   * @param {string} driverId - 司机ID
   * @returns {Promise<Object|null>} - 司机信息或null
   */
  async getDriverProfileById(driverId) {
    try {
      const sql = `
        SELECT d.*, u.name, u.phone, u.avatar 
        FROM driver_profiles d
        JOIN users u ON d.user_id = u.user_id
        WHERE d.driver_id = ?
      `;
      
      const profiles = await query(sql, [driverId]);
      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      logger.error(`Error in getDriverProfileById: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取货主信息
   * @param {string} userId - 用户ID
   * @returns {Promise<Object|null>} - 货主信息或null
   */
  async getOwnerProfile(userId) {
    try {
      const sql = `
        SELECT o.* FROM owner_profiles o
        JOIN users u ON o.user_id = u.user_id
        WHERE u.user_id = ?
      `;
      
      const profiles = await query(sql, [userId]);
      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      logger.error(`Error in getOwnerProfile: ${error.message}`);
      throw error;
    }
  }

  /**
   * 根据货主ID获取货主信息
   * @param {string} ownerId - 货主ID
   * @returns {Promise<Object|null>} - 货主信息或null
   */
  async getOwnerProfileById(ownerId) {
    try {
      const sql = `
        SELECT o.*, u.name, u.phone, u.avatar 
        FROM owner_profiles o
        JOIN users u ON o.user_id = u.user_id
        WHERE o.owner_id = ?
      `;
      
      const profiles = await query(sql, [ownerId]);
      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      logger.error(`Error in getOwnerProfileById: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取监管人员信息
   * @param {string} userId - 用户ID
   * @returns {Promise<Object|null>} - 监管人员信息或null
   */
  async getSupervisorProfile(userId) {
    try {
      const sql = `
        SELECT s.* FROM supervisor_profiles s
        JOIN users u ON s.user_id = u.user_id
        WHERE u.user_id = ?
      `;
      
      const profiles = await query(sql, [userId]);
      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      logger.error(`Error in getSupervisorProfile: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新司机状态
   * @param {string} driverId - 司机ID
   * @param {string} status - 新状态
   * @returns {Promise<boolean>} - 更新是否成功
   */
  async updateDriverStatus(driverId, status) {
    try {
      const sql = 'UPDATE driver_profiles SET driver_status = ? WHERE driver_id = ?';
      const result = await query(sql, [status, driverId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in updateDriverStatus: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新司机位置
   * @param {string} driverId - 司机ID
   * @param {number} lat - 纬度
   * @param {number} lng - 经度
   * @returns {Promise<boolean>} - 更新是否成功
   */
  async updateDriverLocation(driverId, lat, lng) {
    try {
      const sql = `
        UPDATE driver_profiles 
        SET current_lat = ?, current_lng = ?, location_update_time = NOW() 
        WHERE driver_id = ?
      `;
      const result = await query(sql, [lat, lng, driverId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error in updateDriverLocation: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取所有司机列表
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} - 司机列表
   */
  async getDrivers(filters = {}) {
    try {
      let sql = `
        SELECT d.*, u.name, u.phone, u.avatar 
        FROM driver_profiles d
        JOIN users u ON d.user_id = u.user_id
        WHERE 1=1
      `;
      
      const params = [];
      
      // 添加过滤条件
      if (filters.status) {
        sql += ' AND d.driver_status = ?';
        params.push(filters.status);
      }
      
      // 添加排序
      sql += ' ORDER BY u.name ASC';
      
      // 添加分页
      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(filters.limit));
        
        if (filters.offset) {
          sql += ' OFFSET ?';
          params.push(parseInt(filters.offset));
        }
      }
      
      return await query(sql, params);
    } catch (error) {
      logger.error(`Error in getDrivers: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取所有货主列表
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} - 货主列表
   */
  async getOwners(filters = {}) {
    try {
      let sql = `
        SELECT o.*, u.name, u.phone, u.avatar 
        FROM owner_profiles o
        JOIN users u ON o.user_id = u.user_id
        WHERE 1=1
      `;
      
      const params = [];
      
      // 添加排序
      sql += ' ORDER BY u.name ASC';
      
      // 添加分页
      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(filters.limit));
        
        if (filters.offset) {
          sql += ' OFFSET ?';
          params.push(parseInt(filters.offset));
        }
      }
      
      return await query(sql, params);
    } catch (error) {
      logger.error(`Error in getOwners: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new UserDao();