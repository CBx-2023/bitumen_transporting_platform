const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { 
  registerValidation, 
  loginValidation, 
  changePasswordValidation 
} = require('../middlewares/validation');

// 用户注册
router.post('/register', registerValidation, authController.register);

// 用户登录
router.post('/login', loginValidation, authController.login);

// 获取当前用户信息
router.get('/me', authenticate, authController.getCurrentUser);

// 更改密码
router.put('/change-password', authenticate, changePasswordValidation, authController.changePassword);

// 刷新令牌
router.post('/refresh-token', authenticate, authController.refreshToken);

module.exports = router;