const { query, testConnection } = require('../utils/db');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// 迁移脚本目录
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// 创建迁移表（如果不存在）
async function createMigrationsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Migrations table created or already exists');
  } catch (error) {
    logger.error('Error creating migrations table:', error);
    throw error;
  }
}

// 获取已执行的迁移
async function getExecutedMigrations() {
  try {
    const [migrations] = await query('SELECT name FROM migrations ORDER BY id');
    return migrations.map(m => m.name);
  } catch (error) {
    logger.error('Error fetching executed migrations:', error);
    throw error;
  }
}

// 执行迁移
async function runMigration(name, sql) {
  try {
    await query('START TRANSACTION');
    
    // 执行迁移SQL
    await query(sql);
    
    // 记录迁移
    await query('INSERT INTO migrations (name) VALUES (?)', [name]);
    
    await query('COMMIT');
    logger.info(`Migration ${name} executed successfully`);
  } catch (error) {
    await query('ROLLBACK');
    logger.error(`Error executing migration ${name}:`, error);
    throw error;
  }
}

// 运行所有未执行的迁移
async function runMigrations() {
  try {
    // 测试数据库连接
    await testConnection();
    
    // 创建迁移表
    await createMigrationsTable();
    
    // 获取已执行的迁移
    const executedMigrations = await getExecutedMigrations();
    
    // 读取迁移文件
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    // 执行未运行的迁移
    for (const file of files) {
      if (!executedMigrations.includes(file)) {
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        logger.info(`Running migration: ${file}`);
        await runMigration(file, sql);
      }
    }
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// 创建新的迁移文件
function createMigration(name) {
  try {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const fileName = `${timestamp}_${name}.sql`;
    const filePath = path.join(MIGRATIONS_DIR, fileName);
    
    fs.writeFileSync(filePath, '-- Add your SQL migration here\n', 'utf8');
    logger.info(`Created new migration file: ${fileName}`);
  } catch (error) {
    logger.error('Error creating migration file:', error);
    throw error;
  }
}

// 解析命令行参数
const command = process.argv[2];
const name = process.argv[3];

// 创建migrations目录（如果不存在）
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR);
}

// 执行命令
if (command === 'up') {
  runMigrations();
} else if (command === 'create' && name) {
  createMigration(name);
} else {
  logger.error('Usage:');
  logger.error('  npm run migrate up - Run all pending migrations');
  logger.error('  npm run migrate create <name> - Create a new migration file');
  process.exit(1);
}