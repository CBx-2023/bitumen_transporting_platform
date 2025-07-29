const mysql = require('mysql2/promise');
const config = require('../config/app.config');

// 创建连接池
const pool = mysql.createPool(config.db);

// 测试连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection established successfully');
    connection.release();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

// 执行SQL查询
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

module.exports = {
  pool,
  query,
  testConnection
};