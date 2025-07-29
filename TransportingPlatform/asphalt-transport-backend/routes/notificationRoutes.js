/**
 * @swagger
 * tags:
 *   name: 通知
 *   description: 消息通知相关接口
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middlewares/auth');
const {
  markAsReadValidation,
  deleteNotificationValidation
} = require('../middlewares/validation');

// 获取通知列表
router.get('/notifications', auth, notificationController.getNotifications);

// 标记通知为已读
router.put('/notifications/:id/read', auth, markAsReadValidation, notificationController.markAsRead);

// 删除通知
router.delete('/notifications/:id', auth, deleteNotificationValidation, notificationController.deleteNotification);

// 获取未读通知数量
router.get('/notifications/unread/count', auth, notificationController.getUnreadCount);

module.exports = router;