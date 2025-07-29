const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { errorHandler } = require('./utils/errorHandler');
const requestLogger = require('./middlewares/requestLogger');
const logger = require('./utils/logger');
const config = require('./config/app.config');
const { swaggerUi, specs } = require('./config/swagger');

// 初始化Express应用
const app = express();

// 数据库连接测试
require('./utils/db').testConnection();

// 中间件配置
app.use(cors()); // 启用CORS
app.use(express.json()); // 解析JSON请求体
app.use(express.urlencoded({ extended: true })); // 解析URL编码请求体

// 日志中间件
if (config.server.env === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// 路由配置
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const locationRoutes = require('./routes/locationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');

// 应用路由
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', orderRoutes);
app.use('/api', locationRoutes);
app.use('/api', notificationRoutes);
app.use('/api', statisticsRoutes);

// 404处理
const { handleNotFound } = require('./utils/errorHandler');
app.use(handleNotFound);

// 错误处理中间件
app.use(errorHandler);

module.exports = app;