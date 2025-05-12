const ossClient = require('../../config/oss')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

class OssService {
  // 上传本地文件
  async uploadLocalFile(localFilePath, ossDirectory, customOssFileName, useSharp = false) {
    try {
      const fileBuffer = await fs.promises.readFile(localFilePath) // 读取本地文件到Buffer

      let processedBuffer = fileBuffer
      let fileExtension = path.extname(customOssFileName || localFilePath).toLowerCase() // 获取原始扩展名
      let finalObjectName

      const baseFileName = customOssFileName
        ? path.basename(customOssFileName, path.extname(customOssFileName)) // 去掉扩展名
        : `${Date.now()}-${Math.random().toString(36).substring(2)}`

      if (useSharp && (fileExtension === '.png' || fileExtension === '.jpg' || fileExtension === '.jpeg' || fileExtension === '.webp')) {
        console.log(`[OSS Service] 使用 sharp 处理本地文件: ${localFilePath}`)
        processedBuffer = await sharp(fileBuffer)
          .resize(1920, 1080, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 80 }) // 统一转为jpeg并压缩
          .toBuffer()
        fileExtension = '.jpg' // sharp 处理后统一为 jpg
        finalObjectName = `${ossDirectory.replace(/\/$/, '')}/${baseFileName}${fileExtension}`
      } else {
        // 如果不使用 sharp 或文件类型不适合 sharp 处理，直接使用原始 buffer
        // 确保文件名有正确的扩展名
        finalObjectName = `${ossDirectory.replace(/\/$/, '')}/${baseFileName}${fileExtension === '' ? path.extname(localFilePath) : fileExtension}`
      }

      console.log(`[OSS Service] 准备上传到 OSS: ${finalObjectName}`)
      // 上传处理后或原始的 Buffer 到 OSS
      const result = await ossClient.put(finalObjectName, processedBuffer)

      console.log(`[OSS Service] 本地文件上传成功: ${result.name}`)
      return {
        name: result.name, // objectName
        url: result.url, // OSS URL
      }
    } catch (error) {
      console.error(`[OSS Service] 上传本地文件失败: ${localFilePath}`, error)
      throw error
    }
  }

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
      const result = await ossClient.put(objectName, processedImage)

      // 返回文件访问路径
      return {
        name: result.name,
        url: result.url,
      }
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
      const result = await ossClient.put(objectName, file.buffer)

      // 返回文件访问路径
      return {
        name: result.name,
        url: result.url,
      }
    } catch (error) {
      console.error('上传视频失败:', error)
      throw error
    }
  }

  // 删除OSS中的图片或视频
  async deleteFile(objectName) {
    try {
      await ossClient.delete(objectName)
    } catch (error) {
      console.error('删除图片失败:', error)
      throw error
    }
  }
}

module.exports = new OssService()
