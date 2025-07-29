const logger = require('../utils/logger');

/**
 * 请求日志中间件
 * 记录所有传入的HTTP请求
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // 记录请求开始
  logger.info(`Started ${req.method} ${req.originalUrl}`);
  
  // 当响应完成时记录结果
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      `Completed ${res.statusCode} ${res.statusMessage} in ${duration}ms`
    );
  });
  
  next();
};

module.exports = requestLogger;