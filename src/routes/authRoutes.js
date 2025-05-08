const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const authController = require('../controllers/authController')

// 微信登录
router.post('/wxlogin', authController.wechatLogin)

// 用户注册
router.post('/register', authController.register)

// 用户登录
router.post('/login', authController.login)

// 获取当前用户信息
router.get('/user', authMiddleware.auth, authController.getCurrentUser)

module.exports = router
