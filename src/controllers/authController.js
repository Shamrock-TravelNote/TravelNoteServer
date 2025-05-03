const User = require('../models/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

// 用户注册
exports.register = async (req, res) => {
  try {
    const { username, password, nickname, avatar } = req.body

    // 验证必填项
    if (!username || !password || !nickname) {
      return res.status(400).json({ message: '用户名、密码和昵称为必填项' })
    }

    // 检查用户名或昵称是否已存在
    let user = await User.findOne({ $or: [{ username }, { nickname }] })
    if (user) {
      return res.status(400).json({ message: '用户名或昵称已存在' })
    }

    // 创建新用户
    user = new User({ username, password, nickname, avatar })
    await user.save()

    // 生成JWT令牌
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' })

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 用户登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body

    // 验证必填项
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' })
    }

    // 检查用户名是否存在
    let user = await User.findOne({ $or: [{ username }, { nickname: username }] })
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }

    // 生成JWT令牌
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' })

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 获取当前用户信息
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}
