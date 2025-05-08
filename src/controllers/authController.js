const User = require('../models/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const axios = require('axios')
require('dotenv').config()

// 微信小程序登录
exports.wechatLogin = async (req, res) => {
  try {
    console.log('微信登录请求:', req.body)
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ message: '缺少code参数' })
    }

    const { WECHAT_APPID, WECHAT_SECRET, JWT_SECRET } = process.env

    // 获取openid
    const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: WECHAT_APPID,
        secret: WECHAT_SECRET,
        js_code: code,
        grant_type: 'authorization_code',
      },
    })
    const { openid, session_key, unionid, errcode, errmsg } = response.data

    if (errcode || !openid) {
      console.error('微信登录失败:', response.data)
      return res.status(500).json({ message: '微信登录失败', errcode, errmsg })
    }

    // 检查用户是否已存在
    let user = await User.findOne({ openid })
    if (!user) {
      // 创建新用户
      const defaultNickname = `用户${openid.slice(-6)}`
      const defaultUsername = `user_${openid}`
      user = new User({
        openid: openid,
        nickname: defaultNickname,
        username: defaultUsername,
        avatar: `https://travelnote-data.oss-cn-nanjing.aliyuncs.com/Gemini_Generated_Image_49ztd749ztd749zt.jpeg`, // 使用默认头像
        role: 'user',
      })
      await user.save()
    }

    // 生成JWT令牌
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' })

    res.json({
      token,
      userInfo: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('微信授权登陆失败', err)
    if (err.isAxiosError) {
      console.log('微信授权登陆失败:', err.response?.data)
      return res.status(500).json({ message: '微信授权登陆失败', errcode: err.response.data.errcode, errmsg: err.response.data.errmsg })
    }
    res.status(500).json({ message: '服务器错误' })
  }
}

// 用户注册
exports.register = async (req, res) => {
  try {
    const { username, password, nickname, avatar } = req.body

    // 验证必填项
    if (!username || !password) {
      return res.status(400).json({ message: '用户名、密码为必填项' })
    }

    // 检查用户名或昵称是否已存在
    let user = await User.findOne({
      $or: [
        { username },
        // 确保openid不为null的用户也被检查
        { openid: { $ne: null, $exists: true } },
      ],
    })
    if (user) {
      return res.status(400).json({ message: '用户名已存在' })
    }

    // 创建新用户，显式设置openid为undefined以避免MongoDB设置null值
    user = new User({
      username,
      password,
      nickname: '用户' + username,
      avatar,
      openid: undefined, // 确保不设置openid字段
    })
    await user.save()

    // 生成JWT令牌
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' })

    console.log('注册成功:', user.username)

    res.status(201).json({
      token,
      userInfo: {
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

    console.log('登录成功:', user)

    res.status(200).json({
      token,
      userInfo: {
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
