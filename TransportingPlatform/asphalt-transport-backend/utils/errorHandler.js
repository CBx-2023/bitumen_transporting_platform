const logger = require('./logger');
const { validationResult } = require('express-validator');

// 自定义API错误类
class ApiError extends Error {
  constructor(statusCode, message, errors = null, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors; // 用于存储验证错误详情
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  
  // 默认错误状态码和消息
  statusCode = statusCode || 500;
  message = message || 'Internal Server Error';

  // 处理验证错误
  if (err.errors && Array.isArray(err.errors)) {
    return res.status(statusCode).json({
      success: false,
      status: statusCode,
      message: message,
      errors: err.errors
    });
  }

  // 记录错误日志
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  logger.error(err.stack);

  // 发送错误响应
  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: statusCode === 500 && process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    ...(err.errors && { errors: err.errors })
  });
};

// 捕获未处理的Promise拒绝
const handleUnhandledRejection = (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // 在生产环境中，可能需要优雅地关闭服务器
  // process.exit(1);
};

// 捕获未捕获的异常
const handleUncaughtException = (err) => {
  logger.error('Uncaught Exception:', err);
  // 在生产环境中，可能需要优雅地关闭服务器
  // process.exit(1);
};

// 处理404错误
const handleNotFound = (req, res, next) => {
  next(new ApiError(404, `找不到路径: ${req.originalUrl}`));
};

module.exports = {
  ApiError,
  errorHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  handleNotFound
};