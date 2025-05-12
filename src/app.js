const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const multer = require('multer')
const connectDB = require('../config/db')
const authRoutes = require('./routes/authRoutes')
const travelDiaryRoutes = require('./routes/travelDiaryRoutes')
const adminRoutes = require('./routes/adminRoutes')
const uploadRoutes = require('./routes/uploadRoutes')

const app = express()

// 允许跨域请求
const corsOptions = {
  origin: ['http://localhost:10086', 'http://localhost:27017', 'http://localhost:3001'], // 允许的源
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // 允许携带凭证
  optionsSuccessStatus: 200, // 对于某些老旧浏览器的支持
}

app.use(cors(corsOptions))

// 连接数据库
connectDB()

// 中间件
app.use(express.json())

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/traveldiaries', travelDiaryRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/upload', uploadRoutes)

// 错误处理中间件
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      code: 400,
      message: '文件上传错误: ' + err.message,
    })
  }

  console.error(err.stack)
  res.status(500).json({
    code: 500,
    message: '服务器错误',
  })
})

module.exports = app
