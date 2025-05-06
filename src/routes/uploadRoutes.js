const express = require('express')
const router = express.Router()
const upload = require('../middleware/uploadMiddleware')
const auth = require('../middleware/authMiddleware')
const uploadController = require('../controllers/uploadController')

// 图片上传路由
router.post('/image', auth, upload.single('image'), uploadController.uploadImage)

// 视频上传路由
router.post('/video', auth, upload.single('video'), uploadController.uploadVideo)

module.exports = router
