const ossService = require('../services/ossService')

// 图片上传处理
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' })
    }

    const objectName = await ossService.uploadImage(req.file)
    const imageUrl = await ossService.getImageUrl(objectName)

    res.json({
      url: imageUrl,
      objectName: objectName,
    })
  } catch (error) {
    console.error('图片上传失败:', error)
    res.status(500).json({ message: '图片上传失败' })
  }
}

// 视频上传处理
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的视频' })
    }

    const objectName = `videos/${Date.now()}-${Math.random().toString(36).substring(2)}${req.file.originalname}`
    await ossClient.put(objectName, req.file.buffer)
    const videoUrl = await ossService.getImageUrl(objectName)

    res.json({
      url: videoUrl,
      objectName: objectName,
    })
  } catch (error) {
    console.error('视频上传失败:', error)
    res.status(500).json({ message: '视频上传失败' })
  }
}
