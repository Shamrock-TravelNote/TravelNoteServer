const jwt = require('jsonwebtoken')
require('dotenv').config()

// 快速开发模式下的测试用户信息
const TEST_USER = {
  id: '65bd974ba8c8f33a0c522f7b', // 替换为实际的测试用户ID
  role: 'admin',
}

// 验证JWT令牌
exports.auth = async (req, res, next) => {
  // 快速开发模式直接注入测试用户信息
  if (process.env.DEV_MODE === 'quick') {
    req.user = TEST_USER
    return next()
  }

  try {
    // 获取令牌
    const token = req.header('x-auth-token')

    if (!token) {
      return res.status(401).json({ message: '无令牌，无法访问' })
    }

    // 验证令牌并解析用户信息
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // 将解析出的用户信息注入到 req.user 中
    req.user = decoded // decoded 中包含了用户ID等信息

    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '令牌无效' })
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '令牌已过期' })
    }
    next(err)
  }
}

// 角色验证
exports.authorizeRole = (...roles) => {
  return (req, res, next) => {
    // 快速开发模式跳过角色验证
    if (process.env.DEV_MODE === 'quick') {
      return next()
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: '无权限访问此资源' })
    }
    next()
  }
}
