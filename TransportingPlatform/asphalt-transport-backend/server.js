const app = require('./app');
const config = require('./config/app.config');
const logger = require('./utils/logger');
const { handleUncaughtException, handleUnhandledRejection } = require('./utils/errorHandler');
const websocket = require('./utils/websocket');

// 启动服务器
const server = app.listen(config.server.port, () => {
  logger.info(`Server running in ${config.server.env} mode on port ${config.server.port}`);
});

// 初始化WebSocket服务
websocket.init(server);
logger.info('WebSocket服务已启动');

// 处理未捕获的异常和未处理的Promise拒绝
process.on('uncaughtException', handleUncaughtException);
process.on('unhandledRejection', handleUnhandledRejection);

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

// 导出服务器实例（用于测试）
module.exports = server;