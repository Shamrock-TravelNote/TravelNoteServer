const ossService = require('../services/ossService')

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' })
    }
    const objectName = await ossService.uploadImage(req.file)
    const imageUrl = await ossService.getImageUrl(objectName)
    res.status(200).json({ objectName: objectName, url: imageUrl })
  } catch (error) {
    console.error('上传图片失败:', error)
    res.status(500).json({ message: '上传失败' })
  }
}

const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的视频' })
    }
    const objectName = await ossService.uploadVideo(req.file)
    const videoUrl = await ossService.getImageUrl(objectName)
    res.status(200).json({ objectName: objectName, url: videoUrl })
  } catch (error) {
    console.error('上传视频失败:', error)
    res.status(500).json({ message: '上传失败' })
  }
}

module.exports = {
  uploadImage,
  uploadVideo,
}
