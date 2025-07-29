const mysql = require('mysql2/promise');
const config = require('../config/app.config');
const logger = require('../utils/logger');

// 创建数据库表的SQL语句
const createTableQueries = {
  // 用户表
  users: `
    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(36) PRIMARY KEY,
      phone VARCHAR(20) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(50) NOT NULL,
      role ENUM('driver', 'owner', 'supervisor') NOT NULL,
      avatar VARCHAR(255),
      create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login_time DATETIME,
      status TINYINT NOT NULL DEFAULT 1 COMMENT '1: 正常, 0: 禁用'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  // 司机信息表
  driver_profiles: `
    CREATE TABLE IF NOT EXISTS driver_profiles (
      driver_id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      id_card VARCHAR(20) NOT NULL COMMENT '身份证号',
      license_number VARCHAR(50) NOT NULL COMMENT '驾驶证号',
      car_number VARCHAR(20) NOT NULL COMMENT '车牌号',
      car_type VARCHAR(50) NOT NULL COMMENT '车辆类型',
      car_capacity DECIMAL(10,2) NOT NULL COMMENT '载重能力(吨)',
      driver_status ENUM('空闲中', '运输中', '休息中') NOT NULL DEFAULT '空闲中',
      current_lat DECIMAL(10,6) COMMENT '当前纬度',
      current_lng DECIMAL(10,6) COMMENT '当前经度',
      location_update_time DATETIME COMMENT '位置更新时间',
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  // 货主信息表
  owner_profiles: `
    CREATE TABLE IF NOT EXISTS owner_profiles (
      owner_id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      company VARCHAR(100) COMMENT '公司名称',
      business_license VARCHAR(50) COMMENT '营业执照号',
      contact_address VARCHAR(255) COMMENT '联系地址',
      credit_score INT DEFAULT 100 COMMENT '信用评分',
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  // 监管人员信息表
  supervisor_profiles: `
    CREATE TABLE IF NOT EXISTS supervisor_profiles (
      supervisor_id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      department VARCHAR(100) NOT NULL COMMENT '所属部门',
      position VARCHAR(50) NOT NULL COMMENT '职位',
      authority_level INT NOT NULL DEFAULT 1 COMMENT '权限等级',
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  // 订单表
  orders: `
    CREATE TABLE IF NOT EXISTS orders (
      order_id VARCHAR(36) PRIMARY KEY,
      order_number VARCHAR(20) NOT NULL UNIQUE COMMENT '订单编号',
      owner_id VARCHAR(36) NOT NULL COMMENT '货主ID',
      driver_id VARCHAR(36) COMMENT '司机ID',
      status ENUM('待接单', '运输中', '已完成', '已取消') NOT NULL DEFAULT '待接单',
      goods_type VARCHAR(50) NOT NULL COMMENT '货物类型',
      weight DECIMAL(10,2) NOT NULL COMMENT '重量(吨)',
      volume DECIMAL(10,2) COMMENT '体积(立方米)',
      price DECIMAL(10,2) NOT NULL COMMENT '运费(元)',
      start_address VARCHAR(255) NOT NULL COMMENT '起点地址',
      start_lat DECIMAL(10,6) NOT NULL COMMENT '起点纬度',
      start_lng DECIMAL(10,6) NOT NULL COMMENT '起点经度',
      end_address VARCHAR(255) NOT NULL COMMENT '终点地址',
      end_lat DECIMAL(10,6) NOT NULL COMMENT '终点纬度',
      end_lng DECIMAL(10,6) NOT NULL COMMENT '终点经度',
      expected_start_time DATETIME COMMENT '预计开始时间',
      expected_end_time DATETIME COMMENT '预计到达时间',
      create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      accept_time DATETIME COMMENT '接单时间',
      start_time DATETIME COMMENT '开始运输时间',
      complete_time DATETIME COMMENT '完成时间',
      cancel_time DATETIME COMMENT '取消时间',
      cancel_reason VARCHAR(255) COMMENT '取消原因',
      remarks TEXT COMMENT '备注',
      FOREIGN KEY (owner_id) REFERENCES owner_profiles(owner_id),
      FOREIGN KEY (driver_id) REFERENCES driver_profiles(driver_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  // 运输轨迹表
  transport_tracks: `
    CREATE TABLE IF NOT EXISTS transport_tracks (
      track_id VARCHAR(36) PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL,
      driver_id VARCHAR(36) NOT NULL,
      latitude DECIMAL(10,6) NOT NULL,
      longitude DECIMAL(10,6) NOT NULL,
      speed DECIMAL(5,2) COMMENT '速度(km/h)',
      direction INT COMMENT '方向(0-359度)',
      track_time DATETIME NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id),
      FOREIGN KEY (driver_id) REFERENCES driver_profiles(driver_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  // 订单状态变更记录表
  order_status_logs: `
    CREATE TABLE IF NOT EXISTS order_status_logs (
      log_id VARCHAR(36) PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL,
      previous_status VARCHAR(20) COMMENT '之前状态',
      current_status VARCHAR(20) NOT NULL COMMENT '当前状态',
      operator_id VARCHAR(36) NOT NULL COMMENT '操作人ID',
      operator_role ENUM('driver', 'owner', 'supervisor') NOT NULL,
      change_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      remarks VARCHAR(255) COMMENT '备注',
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  // 支付记录表
  payments: `
    CREATE TABLE IF NOT EXISTS payments (
      payment_id VARCHAR(36) PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL,
      amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
      payment_method VARCHAR(50) NOT NULL COMMENT '支付方式',
      transaction_id VARCHAR(100) COMMENT '交易号',
      payment_status ENUM('待支付', '支付中', '已支付', '已退款', '支付失败') NOT NULL,
      payment_time DATETIME COMMENT '支付时间',
      payer_id VARCHAR(36) NOT NULL COMMENT '支付人ID',
      receiver_id VARCHAR(36) NOT NULL COMMENT '接收人ID',
      create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  // 评价表
  ratings: `
    CREATE TABLE IF NOT EXISTS ratings (
      rating_id VARCHAR(36) PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL,
      from_user_id VARCHAR(36) NOT NULL COMMENT '评价人ID',
      to_user_id VARCHAR(36) NOT NULL COMMENT '被评价人ID',
      score INT NOT NULL COMMENT '评分(1-5)',
      content TEXT COMMENT '评价内容',
      create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(order_id),
      FOREIGN KEY (from_user_id) REFERENCES users(user_id),
      FOREIGN KEY (to_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  // 消息表
  messages: `
    CREATE TABLE IF NOT EXISTS messages (
      message_id VARCHAR(36) PRIMARY KEY,
      sender_id VARCHAR(36) NOT NULL,
      receiver_id VARCHAR(36) NOT NULL,
      order_id VARCHAR(36) COMMENT '相关订单ID',
      content TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(user_id),
      FOREIGN KEY (receiver_id) REFERENCES users(user_id),
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  // 系统通知表
  notifications: `
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      type VARCHAR(50) NOT NULL COMMENT '通知类型',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `
};

// 创建索引的SQL语句
const createIndexQueries = [
  // 用户表索引
  'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
  'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
  
  // 司机信息表索引
  'CREATE INDEX IF NOT EXISTS idx_driver_profiles_status ON driver_profiles(driver_status)',
  'CREATE INDEX IF NOT EXISTS idx_driver_profiles_location ON driver_profiles(current_lat, current_lng)',
  
  // 订单表索引
  'CREATE INDEX IF NOT EXISTS idx_orders_owner ON orders(owner_id)',
  'CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id)',
  'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
  'CREATE INDEX IF NOT EXISTS idx_orders_create_time ON orders(create_time)',
  
  // 运输轨迹表索引
  'CREATE INDEX IF NOT EXISTS idx_transport_tracks_order ON transport_tracks(order_id)',
  'CREATE INDEX IF NOT EXISTS idx_transport_tracks_driver ON transport_tracks(driver_id)',
  'CREATE INDEX IF NOT EXISTS idx_transport_tracks_time ON transport_tracks(track_time)',
  
  // 支付记录表索引
  'CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id)',
  'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status)',
  
  // 消息表索引
  'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)',
  'CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)',
  'CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read)',
  
  // 通知表索引
  'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)'
];

// 初始化数据库
async function initDatabase() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      port: config.db.port
    });
    
    logger.info('Connected to MySQL server');
    
    // 创建数据库（如果不存在）
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${config.db.database} 
                           CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    logger.info(`Database '${config.db.database}' created or already exists`);
    
    // 使用数据库
    await connection.query(`USE ${config.db.database}`);
    
    // 创建表
    for (const [tableName, query] of Object.entries(createTableQueries)) {
      await connection.query(query);
      logger.info(`Table '${tableName}' created or already exists`);
    }
    
    // 创建索引
    for (const query of createIndexQueries) {
      await connection.query(query);
    }
    logger.info('All indexes created or already exist');
    
    logger.info('Database initialization completed successfully');
  } catch (error) {
    logger.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      logger.info('Database connection closed');
    }
  }
}

// 执行初始化
initDatabase();