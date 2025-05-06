const ossClient = require('../../config/oss')
const sharp = require('sharp')

class OssService {
  // 生成OSS访问URL
  async getImageUrl(objectName) {
    try {
      const url = await ossClient.signatureUrl(objectName, {
        expires: 3600, // URL有效期1小时
      })
      return url
    } catch (error) {
      console.error('获取图片URL失败:', error)
      throw error
    }
  }

  // 上传图片到OSS
  async uploadImage(file) {
    try {
      // 处理图片
      const processedImage = await sharp(file.buffer)
        .resize(1920, 1080, {
          // 最大尺寸限制
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 }) // 转换为jpeg格式并压缩
        .toBuffer()

      // 生成唯一文件名
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
      const objectName = `images/${filename}`

      // 上传到OSS
      await ossClient.put(objectName, processedImage)

      // 返回文件访问路径
      return objectName
    } catch (error) {
      console.error('上传图片失败:', error)
      throw error
    }
  }

  // 上传视频到OSS
  async uploadVideo(file) {
    try {
      // 生成唯一文件名
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.mp4`
      const objectName = `videos/${filename}`

      // 上传到OSS
      await ossClient.put(objectName, file.buffer)

      // 返回文件访问路径
      return objectName
    } catch (error) {
      console.error('上传视频失败:', error)
      throw error
    }
  }

  // 删除OSS中的图片
  async deleteImage(objectName) {
    try {
      await ossClient.delete(objectName)
    } catch (error) {
      console.error('删除图片失败:', error)
      throw error
    }
  }
}

module.exports = new OssService()
