const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: function () {
      return !this.openid
    },
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.openid
    },
  },
  nickname: {
    type: String,
    required: true,
    unique: true,
  },
  avatar: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'reviewer', 'admin'],
    default: 'user',
  },
  openid: {
    type: String,
    unique: true,
    sparse: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// 密码加密
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next()
  }
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

module.exports = mongoose.model('User', userSchema)
