const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TravelNote API',
      version: '1.0.0',
      description: '游记分享平台API文档',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // API文件的路径
}

module.exports = swaggerJsdoc(options)
