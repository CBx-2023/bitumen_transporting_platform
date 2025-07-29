const orderDao = require('../dao/orderDao');
const userDao = require('../dao/userDao');
const locationDao = require('../dao/locationDao');
const notificationDao = require('../dao/notificationDao');
const { ApiError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

class OrderService {
  /**
   * 创建订单
   * @param {Object} orderData - 订单数据
   * @param {string} userId - 创建者用户ID
   * @returns {Promise<Object>} - 创建的订单信息
   */
  async createOrder(orderData, userId) {
    try {
      // 验证用户是否为货主
      const user = await userDao.findById(userId);
      if (!user || user.role !== 'owner') {
        throw new ApiError(403, '只有货主可以创建订单');
      }
      
      // 获取货主信息
      const ownerProfile = await userDao.getOwnerProfile(userId);
      if (!ownerProfile) {
        throw new ApiError(404, '货主信息不存在');
      }
      
      // 创建订单
      const { orderId, orderNumber } = await orderDao.createOrder({
        ...orderData,
        ownerId: ownerProfile.owner_id
      });
      
      // 获取创建的订单
      const order = await orderDao.getOrderById(orderId);
      
      // 记录订单状态变更
      await orderDao.logOrderStatusChange({
        orderId,
        previousStatus: null,
        currentStatus: '待接单',
        operatorId: userId,
        operatorRole: 'owner',
        remarks: '创建订单'
      });
      
      // 向附近的司机发送通知
      this.notifyNearbyDrivers(order);
      
      return {
        orderId,
        orderNumber,
        status: order.status,
        createTime: order.create_time
      };
    } catch (error) {
      logger.error(`Error in createOrder service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 向附近的司机发送新订单通知
   * @param {Object} order - 订单信息
   */
  async notifyNearbyDrivers(order) {
    try {
      // 获取起点附近的空闲司机
      const nearbyDrivers = await locationDao.getNearbyDrivers(
        order.start_lat,
        order.start_lng,
        20, // 20公里范围内
        '空闲中'
      );
      
      if (nearbyDrivers.length > 0) {
        // 获取司机用户ID列表
        const driverUserIds = await Promise.all(
          nearbyDrivers.map(async (driver) => {
            const driverProfile = await userDao.getDriverProfileById(driver.driver_id);
            return driverProfile ? driverProfile.user_id : null;
          })
        );
        
        // 过滤掉无效的用户ID
        const validUserIds = driverUserIds.filter(id => id !== null);
        
        if (validUserIds.length > 0) {
          // 批量创建通知
          await notificationDao.createNotificationBatch(validUserIds, {
            title: '新订单提醒',
            content: `有一个从${order.start_address}到${order.end_address}的新订单，货物类型：${order.goods_type}，重量：${order.weight}吨`,
            type: 'new_order'
          });
        }
      }
    } catch (error) {
      logger.error(`Error in notifyNearbyDrivers: ${error.message}`);
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 获取订单详情
   * @param {string} orderId - 订单ID
   * @param {string} userId - 请求用户ID
   * @param {string} userRole - 请求用户角色
   * @returns {Promise<Object>} - 订单详情
   */
  async getOrderDetail(orderId, userId, userRole) {
    try {
      // 获取订单详情
      const order = await orderDao.getOrderWithDetails(orderId);
      if (!order) {
        throw new ApiError(404, '订单不存在');
      }
      
      // 检查权限
      if (userRole === 'owner') {
        // 货主只能查看自己的订单
        const ownerProfile = await userDao.getOwnerProfile(userId);
        if (!ownerProfile || order.owner_id !== ownerProfile.owner_id) {
          throw new ApiError(403, '无权查看此订单');
        }
      } else if (userRole === 'driver') {
        // 司机只能查看自己接的单或待接单
        if (order.status !== '待接单') {
          const driverProfile = await userDao.getDriverProfile(userId);
          if (!driverProfile || order.driver_id !== driverProfile.driver_id) {
            throw new ApiError(403, '无权查看此订单');
          }
        }
      }
      // 监管人员可以查看所有订单
      
      // 获取订单状态变更日志
      const statusLogs = await orderDao.getOrderStatusLogs(orderId);
      
      // 获取订单评价
      const ratings = await orderDao.getOrderRatings(orderId);
      
      // 如果是运输中的订单，获取最新轨迹
      let latestTrack = null;
      if (order.status === '运输中') {
        latestTrack = await orderDao.getLatestTransportTrack(orderId);
      }
      
      // 返回订单详情
      return {
        ...order,
        statusLogs,
        ratings,
        latestTrack
      };
    } catch (error) {
      logger.error(`Error in getOrderDetail service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取订单列表
   * @param {Object} filters - 过滤条件
   * @param {string} userId - 请求用户ID
   * @param {string} userRole - 请求用户角色
   * @returns {Promise<Array>} - 订单列表
   */
  async getOrders(filters, userId, userRole) {
    try {
      // 根据用户角色设置过滤条件
      if (userRole === 'owner') {
        // 货主只能查看自己的订单
        const ownerProfile = await userDao.getOwnerProfile(userId);
        if (!ownerProfile) {
          throw new ApiError(404, '货主信息不存在');
        }
        filters.ownerId = ownerProfile.owner_id;
      } else if (userRole === 'driver') {
        // 司机可以查看自己接的单和待接单
        if (filters.status === '待接单') {
          // 查看待接单不需要额外过滤
        } else {
          const driverProfile = await userDao.getDriverProfile(userId);
          if (!driverProfile) {
            throw new ApiError(404, '司机信息不存在');
          }
          filters.driverId = driverProfile.driver_id;
        }
      }
      // 监管人员可以查看所有订单
      
      // 获取订单列表
      return await orderDao.getOrdersWithDetails(filters);
    } catch (error) {
      logger.error(`Error in getOrders service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 司机接单
   * @param {string} orderId - 订单ID
   * @param {string} userId - 司机用户ID
   * @returns {Promise<Object>} - 接单结果
   */
  async acceptOrder(orderId, userId) {
    try {
      // 验证用户是否为司机
      const user = await userDao.findById(userId);
      if (!user || user.role !== 'driver') {
        throw new ApiError(403, '只有司机可以接单');
      }
      
      // 获取司机信息
      const driverProfile = await userDao.getDriverProfile(userId);
      if (!driverProfile) {
        throw new ApiError(404, '司机信息不存在');
      }
      
      // 检查司机状态
      if (driverProfile.driver_status !== '空闲中') {
        throw new ApiError(400, '只有空闲状态的司机可以接单');
      }
      
      // 获取订单信息
      const order = await orderDao.getOrderById(orderId);
      if (!order) {
        throw new ApiError(404, '订单不存在');
      }
      
      // 检查订单状态
      if (order.status !== '待接单') {
        throw new ApiError(400, '只能接待接单状态的订单');
      }
      
      // 接单
      const success = await orderDao.acceptOrder(orderId, driverProfile.driver_id);
      if (!success) {
        throw new ApiError(500, '接单失败');
      }
      
      // 更新司机状态为运输中
      await userDao.updateDriverStatus(driverProfile.driver_id, '运输中');
      
      // 记录订单状态变更
      await orderDao.logOrderStatusChange({
        orderId,
        previousStatus: '待接单',
        currentStatus: '运输中',
        operatorId: userId,
        operatorRole: 'driver',
        remarks: '司机接单'
      });
      
      // 通知货主
      const ownerUser = await userDao.findById(order.owner_id);
      if (ownerUser) {
        await notificationDao.createNotification({
          userId: ownerUser.user_id,
          title: '订单已被接单',
          content: `您的订单(${order.order_number})已被司机${user.name}接单，请留意司机动态`,
          type: 'order_accepted'
        });
      }
      
      return {
        success: true,
        orderId,
        status: '运输中',
        acceptTime: new Date()
      };
    } catch (error) {
      logger.error(`Error in acceptOrder service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 开始运输
   * @param {string} orderId - 订单ID
   * @param {string} userId - 司机用户ID
   * @returns {Promise<Object>} - 操作结果
   */
  async startTransport(orderId, userId) {
    try {
      // 验证用户是否为司机
      const user = await userDao.findById(userId);
      if (!user || user.role !== 'driver') {
        throw new ApiError(403, '只有司机可以开始运输');
      }
      
      // 获取司机信息
      const driverProfile = await userDao.getDriverProfile(userId);
      if (!driverProfile) {
        throw new ApiError(404, '司机信息不存在');
      }
      
      // 获取订单信息
      const order = await orderDao.getOrderById(orderId);
      if (!order) {
        throw new ApiError(404, '订单不存在');
      }
      
      // 检查订单状态和司机
      if (order.status !== '运输中') {
        throw new ApiError(400, '只能开始运输中状态的订单');
      }
      
      if (order.driver_id !== driverProfile.driver_id) {
        throw new ApiError(403, '只能开始自己接的订单');
      }
      
      // 开始运输
      const success = await orderDao.startTransport(orderId);
      if (!success) {
        throw new ApiError(500, '操作失败');
      }
      
      // 记录订单状态变更
      await orderDao.logOrderStatusChange({
        orderId,
        previousStatus: '运输中',
        currentStatus: '运输中',
        operatorId: userId,
        operatorRole: 'driver',
        remarks: '开始运输'
      });
      
      // 通知货主
      const ownerUser = await userDao.findById(order.owner_id);
      if (ownerUser) {
        await notificationDao.createNotification({
          userId: ownerUser.user_id,
          title: '订单开始运输',
          content: `您的订单(${order.order_number})已开始运输，请留意司机动态`,
          type: 'transport_started'
        });
      }
      
      return {
        success: true,
        orderId,
        startTime: new Date()
      };
    } catch (error) {
      logger.error(`Error in startTransport service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 完成订单
   * @param {string} orderId - 订单ID
   * @param {string} userId - 司机用户ID
   * @returns {Promise<Object>} - 操作结果
   */
  async completeOrder(orderId, userId) {
    try {
      // 验证用户是否为司机
      const user = await userDao.findById(userId);
      if (!user || user.role !== 'driver') {
        throw new ApiError(403, '只有司机可以完成订单');
      }
      
      // 获取司机信息
      const driverProfile = await userDao.getDriverProfile(userId);
      if (!driverProfile) {
        throw new ApiError(404, '司机信息不存在');
      }
      
      // 获取订单信息
      const order = await orderDao.getOrderById(orderId);
      if (!order) {
        throw new ApiError(404, '订单不存在');
      }
      
      // 检查订单状态和司机
      if (order.status !== '运输中') {
        throw new ApiError(400, '只能完成运输中状态的订单');
      }
      
      if (order.driver_id !== driverProfile.driver_id) {
        throw new ApiError(403, '只能完成自己接的订单');
      }
      
      // 完成订单
      const success = await orderDao.completeOrder(orderId);
      if (!success) {
        throw new ApiError(500, '操作失败');
      }
      
      // 更新司机状态为空闲中
      await userDao.updateDriverStatus(driverProfile.driver_id, '空闲中');
      
      // 记录订单状态变更
      await orderDao.logOrderStatusChange({
        orderId,
        previousStatus: '运输中',
        currentStatus: '已完成',
        operatorId: userId,
        operatorRole: 'driver',
        remarks: '司机完成订单'
      });
      
      // 通知货主
      const ownerUser = await userDao.findById(order.owner_id);
      if (ownerUser) {
        await notificationDao.createNotification({
          userId: ownerUser.user_id,
          title: '订单已完成',
          content: `您的订单(${order.order_number})已由司机${user.name}完成，请确认收货并评价`,
          type: 'order_completed'
        });
      }
      
      return {
        success: true,
        orderId,
        status: '已完成',
        completeTime: new Date()
      };
    } catch (error) {
      logger.error(`Error in completeOrder service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 取消订单
   * @param {string} orderId - 订单ID
   * @param {string} userId - 用户ID
   * @param {string} reason - 取消原因
   * @returns {Promise<Object>} - 操作结果
   */
  async cancelOrder(orderId, userId, reason) {
    try {
      // 获取用户信息
      const user = await userDao.findById(userId);
      if (!user) {
        throw new ApiError(404, '用户不存在');
      }
      
      // 获取订单信息
      const order = await orderDao.getOrderById(orderId);
      if (!order) {
        throw new ApiError(404, '订单不存在');
      }
      
      // 检查订单状态
      if (order.status !== '待接单') {
        throw new ApiError(400, '只能取消待接单状态的订单');
      }
      
      // 检查权限
      if (user.role === 'owner') {
        // 货主只能取消自己的订单
        const ownerProfile = await userDao.getOwnerProfile(userId);
        if (!ownerProfile || order.owner_id !== ownerProfile.owner_id) {
          throw new ApiError(403, '无权取消此订单');
        }
      } else if (user.role !== 'supervisor') {
        // 只有货主和监管人员可以取消订单
        throw new ApiError(403, '无权取消订单');
      }
      
      // 取消订单
      const success = await orderDao.cancelOrder(orderId, reason);
      if (!success) {
        throw new ApiError(500, '操作失败');
      }
      
      // 记录订单状态变更
      await orderDao.logOrderStatusChange({
        orderId,
        previousStatus: '待接单',
        currentStatus: '已取消',
        operatorId: userId,
        operatorRole: user.role,
        remarks: `${user.role === 'owner' ? '货主' : '监管人员'}取消订单：${reason}`
      });
      
      return {
        success: true,
        orderId,
        status: '已取消',
        cancelTime: new Date(),
        cancelReason: reason
      };
    } catch (error) {
      logger.error(`Error in cancelOrder service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 添加订单评价
   * @param {string} orderId - 订单ID
   * @param {string} fromUserId - 评价人用户ID
   * @param {string} toUserId - 被评价人用户ID
   * @param {number} score - 评分(1-5)
   * @param {string} content - 评价内容
   * @returns {Promise<Object>} - 评价结果
   */
  async addRating(orderId, fromUserId, toUserId, score, content) {
    try {
      // 验证评分范围
      if (score < 1 || score > 5) {
        throw new ApiError(400, '评分必须在1-5之间');
      }
      
      // 获取订单信息
      const order = await orderDao.getOrderById(orderId);
      if (!order) {
        throw new ApiError(404, '订单不存在');
      }
      
      // 检查订单状态
      if (order.status !== '已完成') {
        throw new ApiError(400, '只能评价已完成的订单');
      }
      
      // 检查评价权限
      const fromUser = await userDao.findById(fromUserId);
      const toUser = await userDao.findById(toUserId);
      
      if (!fromUser || !toUser) {
        throw new ApiError(404, '用户不存在');
      }
      
      // 检查评价关系是否合法
      if (fromUser.role === 'owner' && toUser.role === 'driver') {
        // 货主评价司机
        const ownerProfile = await userDao.getOwnerProfile(fromUserId);
        if (!ownerProfile || order.owner_id !== ownerProfile.owner_id) {
          throw new ApiError(403, '无权评价此订单');
        }
        
        const driverProfile = await userDao.getDriverProfile(toUserId);
        if (!driverProfile || order.driver_id !== driverProfile.driver_id) {
          throw new ApiError(403, '无法评价此司机');
        }
      } else if (fromUser.role === 'driver' && toUser.role === 'owner') {
        // 司机评价货主
        const driverProfile = await userDao.getDriverProfile(fromUserId);
        if (!driverProfile || order.driver_id !== driverProfile.driver_id) {
          throw new ApiError(403, '无权评价此订单');
        }
        
        const ownerProfile = await userDao.getOwnerProfile(toUserId);
        if (!ownerProfile || order.owner_id !== ownerProfile.owner_id) {
          throw new ApiError(403, '无法评价此货主');
        }
      } else {
        throw new ApiError(400, '无效的评价关系');
      }
      
      // 检查是否已评价
      const existingRatings = await orderDao.getOrderRatings(orderId);
      const hasRated = existingRatings.some(
        rating => rating.from_user_id === fromUserId && rating.to_user_id === toUserId
      );
      
      if (hasRated) {
        throw new ApiError(400, '您已经评价过此订单');
      }
      
      // 添加评价
      const ratingId = await orderDao.addRating({
        orderId,
        fromUserId,
        toUserId,
        score,
        content
      });
      
      // 通知被评价人
      await notificationDao.createNotification({
        userId: toUserId,
        title: '收到新评价',
        content: `您在订单(${order.order_number})中收到了${fromUser.name}的评价`,
        type: 'new_rating'
      });
      
      return {
        success: true,
        ratingId,
        orderId,
        score,
        content
      };
    } catch (error) {
      logger.error(`Error in addRating service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取订单轨迹
   * @param {string} orderId - 订单ID
   * @param {string} userId - 请求用户ID
   * @param {string} userRole - 请求用户角色
   * @returns {Promise<Array>} - 轨迹列表
   */
  async getOrderTracks(orderId, userId, userRole) {
    try {
      // 获取订单信息
      const order = await orderDao.getOrderById(orderId);
      if (!order) {
        throw new ApiError(404, '订单不存在');
      }
      
      // 检查权限
      if (userRole === 'owner') {
        // 货主只能查看自己的订单
        const ownerProfile = await userDao.getOwnerProfile(userId);
        if (!ownerProfile || order.owner_id !== ownerProfile.owner_id) {
          throw new ApiError(403, '无权查看此订单轨迹');
        }
      } else if (userRole === 'driver') {
        // 司机只能查看自己接的单
        const driverProfile = await userDao.getDriverProfile(userId);
        if (!driverProfile || order.driver_id !== driverProfile.driver_id) {
          throw new ApiError(403, '无权查看此订单轨迹');
        }
      }
      // 监管人员可以查看所有订单轨迹
      
      // 获取轨迹
      return await orderDao.getTransportTracks(orderId);
    } catch (error) {
      logger.error(`Error in getOrderTracks service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取订单支付记录
   * @param {string} orderId - 订单ID
   * @param {string} userId - 请求用户ID
   * @param {string} userRole - 请求用户角色
   * @returns {Promise<Array>} - 支付记录列表
   */
  async getOrderPayments(orderId, userId, userRole) {
    try {
      // 获取订单信息
      const order = await orderDao.getOrderById(orderId);
      if (!order) {
        throw new ApiError(404, '订单不存在');
      }
      
      // 检查权限
      if (userRole === 'owner') {
        // 货主只能查看自己的订单
        const ownerProfile = await userDao.getOwnerProfile(userId);
        if (!ownerProfile || order.owner_id !== ownerProfile.owner_id) {
          throw new ApiError(403, '无权查看此订单支付记录');
        }
      } else if (userRole === 'driver') {
        // 司机只能查看自己接的单
        const driverProfile = await userDao.getDriverProfile(userId);
        if (!driverProfile || order.driver_id !== driverProfile.driver_id) {
          throw new ApiError(403, '无权查看此订单支付记录');
        }
      }
      // 监管人员可以查看所有订单支付记录
      
      // 获取支付记录
      return await orderDao.getOrderPayments(orderId);
    } catch (error) {
      logger.error(`Error in getOrderPayments service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 添加支付记录
   * @param {Object} paymentData - 支付数据
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} - 支付结果
   */
  async addPayment(paymentData, userId) {
    try {
      const { orderId, amount, paymentMethod } = paymentData;
      
      // 获取订单信息
      const order = await orderDao.getOrderById(orderId);
      if (!order) {
        throw new ApiError(404, '订单不存在');
      }
      
      // 验证用户是否为货主
      const user = await userDao.findById(userId);
      if (!user || user.role !== 'owner') {
        throw new ApiError(403, '只有货主可以支付订单');
      }
      
      // 获取货主信息
      const ownerProfile = await userDao.getOwnerProfile(userId);
      if (!ownerProfile || order.owner_id !== ownerProfile.owner_id) {
        throw new ApiError(403, '无权支付此订单');
      }
      
      // 获取司机信息
      if (!order.driver_id) {
        throw new ApiError(400, '订单尚未被司机接单，无法支付');
      }
      
      const driverProfile = await userDao.getDriverProfileById(order.driver_id);
      if (!driverProfile) {
        throw new ApiError(404, '司机信息不存在');
      }
      
      // 添加支付记录
      const paymentId = await orderDao.addPayment({
        orderId,
        amount,
        paymentMethod,
        paymentStatus: '待支付',
        payerId: userId,
        receiverId: driverProfile.user_id
      });
      
      // 这里应该有实际的支付处理逻辑，例如调用支付网关API
      // 为了演示，我们假设支付成功
      await orderDao.updatePaymentStatus(paymentId, '已支付');
      
      // 通知司机
      await notificationDao.createNotification({
        userId: driverProfile.user_id,
        title: '收到订单付款',
        content: `您在订单(${order.order_number})中收到了${amount}元的付款`,
        type: 'payment_received'
      });
      
      return {
        success: true,
        paymentId,
        orderId,
        amount,
        status: '已支付',
        paymentTime: new Date()
      };
    } catch (error) {
      logger.error(`Error in addPayment service: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new OrderService();