const express = require('express')
const mongoose = require('mongoose')
const connectDB = require('../config/db')
const authRoutes = require('./routes/authRoutes')
const travelDiaryRoutes = require('./routes/travelDiaryRoutes')
const adminRoutes = require('./routes/adminRoutes')

const app = express()

// 连接数据库
connectDB()

// 中间件
app.use(express.json())

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/traveldiaries', travelDiaryRoutes)
app.use('/api/admin', adminRoutes)

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: '服务器错误' })
})

module.exports = app
