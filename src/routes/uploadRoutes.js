const express = require('express')
const router = express.Router()
const uploadMiddleware = require('../middleware/uploadMiddleware')
const authMiddleware = require('../middleware/authMiddleware')
const { uploadImage, uploadVideo } = require('../controllers/uploadController')

router.post('/image', authMiddleware.auth, uploadMiddleware.single('image'), uploadImage)

router.post('/video', authMiddleware.auth, uploadMiddleware.single('video'), uploadVideo)

// router.post('/image', uploadMiddleware.single('file'), uploadImage)

// router.post('/video', uploadMiddleware.single('file'), uploadVideo)

module.exports = router
