const multer = require('multer')

// 配置内存存储
const storage = multer.memoryStorage()

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 只允许图片和视频
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件类型'), false)
  }
}

// 创建multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制10MB
    files: 10, // 最多10个文件
  },
})

module.exports = upload
