// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./app.config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '沥青运输平台 API',
      version: '1.0.0',
      description: '沥青运输平台后端API文档',
      contact: {
        name: '技术支持',
        email: 'support@asphalt-transport.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}/api`,
        description: '开发服务器'
      },
      {
        url: 'https://api.asphalt-transport.com/v1',
        description: '生产服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: '用户ID'
            },
            phone: {
              type: 'string',
              description: '手机号'
            },
            name: {
              type: 'string',
              description: '姓名'
            },
            role: {
              type: 'string',
              enum: ['driver', 'owner', 'supervisor'],
              description: '用户角色'
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: '订单ID'
            },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'transporting', 'completed', 'cancelled'],
              description: '订单状态'
            },
            startLocation: {
              type: 'string',
              description: '起点位置'
            },
            endLocation: {
              type: 'string',
              description: '终点位置'
            },
            goodsType: {
              type: 'string',
              description: '货物类型'
            },
            weight: {
              type: 'number',
              description: '重量(吨)'
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js', './controllers/*.js'] // 包含路由和控制器的文件路径
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };