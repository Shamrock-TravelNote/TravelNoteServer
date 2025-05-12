const TravelDiary = require('../models/TravelDiary')
const User = require('../models/User')
const ossService = require('../services/ossService')
const mongoose = require('mongoose')
// const sizeOf = require('image-size')
// const ffprobe = require('ffprobe')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { promisify } = require('util')
const { searchAndPaginateTravelDiaries } = require('../utils/searchUtils')

// 辅助函数：从视频URL截取封面并上传到OSS
async function generateAndUploadCoverFromVideo(videoOssUrl, diaryId) {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir()
    // 为封面创建一个唯一的文件名
    const uniqueCoverFilename = `cover_${diaryId}_${Date.now()}.png`
    const tempCoverPath = path.join(tempDir, uniqueCoverFilename)

    console.log(`[Cover Gen] Video URL: ${videoOssUrl}`)
    console.log(`[Cover Gen] Temporary cover path: ${tempCoverPath}`)

    ffmpeg(videoOssUrl) // 直接使用 OSS URL 作为输入
      .on('start', function (commandLine) {
        console.log('[Cover Gen] Spawned Ffmpeg with command: ' + commandLine)
      })
      .on('error', async (err, stdout, stderr) => {
        console.error('[Cover Gen] Ffmpeg Error:', err.message)
        console.error('[Cover Gen] Ffmpeg stderr:', stderr)
        // 尝试清理临时文件
        try {
          if (fs.existsSync(tempCoverPath)) {
            await promisify(fs.unlink)(tempCoverPath)
          }
        } catch (cleanupErr) {
          console.error('[Cover Gen] Error cleaning up temp file after ffmpeg error:', cleanupErr)
        }
        reject(new Error(`无法从视频生成封面: ${err.message}`))
      })
      .on('end', async () => {
        console.log('[Cover Gen] 封面截取成功，临时保存在:', tempCoverPath)
        try {
          if (!fs.existsSync(tempCoverPath)) {
            console.error('[Cover Gen] 截帧成功但文件未找到:', tempCoverPath)
            return reject(new Error('截帧成功但输出文件未找到'))
          }

          // 1. 将截取的封面上传到 OSS
          const ossCoverPath = `/covers` // OSS中的路径
          const coverUploadResult = await ossService.uploadLocalFile(
            tempCoverPath,
            ossCoverPath,
            uniqueCoverFilename, // 使用 ffmpeg 生成时确定的文件名
            false // 或者 true，如果你想用 sharp 再处理一次（比如统一转 jpg 和压缩）
          )

          if (!coverUploadResult || !coverUploadResult.url) {
            console.error('[Cover Gen] 封面上传到OSS后未返回URL', coverUploadResult)
            throw new Error('封面上传到OSS失败或未返回URL')
          }
          console.log('[Cover Gen] 封面成功上传到OSS, URL:', coverUploadResult.url)

          // 2. 清理本地临时文件
          await fs.promises.unlink(tempCoverPath)
          console.log('[Cover Gen] 临时封面文件已删除:', tempCoverPath)

          resolve(coverUploadResult.url) // 返回封面的OSS URL
        } catch (uploadError) {
          console.error('[Cover Gen] 上传封面到OSS或清理文件时出错:', uploadError)
          // 尝试清理临时文件
          try {
            if (fs.existsSync(tempCoverPath)) {
              await fs.promises.unlink(tempCoverPath)
            }
          } catch (cleanupErr) {
            console.error('[Cover Gen] Error cleaning up temp file after upload error:', cleanupErr)
          }
          reject(uploadError)
        }
      })
      // .screenshots({ // fluent-ffmpeg 的截图方法
      //   timestamps: ['1%'], // 尝试在视频的1%处截图，或 '00:00:01.000'
      //   filename: coverFilename, // ffmpeg 会自动添加 .png
      //   folder: tempDir,
      //   size: '640x?' // 可选，指定尺寸
      // });
      // 使用 .outputOptions() 和 .output() 进行更精细的控制
      .outputOptions([
        '-vframes 1', // 只截取1帧
        '-ss 00:00:01.000', // 从第1秒开始截取 (避免视频开始的黑帧)
        '-an', // 无音频
        '-vf scale=640:-1', // 可选：缩放宽度到640px，高度按比例
      ])
      .output(tempCoverPath) // 指定输出路径
      .run()
  })
}

// 处理笔记数据
const MapTravelDiaries = (travelDiaries) => {
  const data = travelDiaries.map((diary) => ({
    id: diary._id,
    title: diary.title,
    content: diary.content,
    cover: diary.cover || diary.images[0] || (diary.mediaType === 'video' ? diary.video : '') || '',
    likes: diary.likes ? diary.likes.length : 0,
    views: diary.views,
    author: {
      id: diary.author._id,
      nickname: diary.author.nickname,
      avatar: diary.author.avatar,
    },
    publishTime: diary.publishTime,
    mediaType: diary.mediaType,
    detailType: diary.detailType,
  }))
  return data
}

// 发布新游记
exports.createTravelDiary = async (req, res) => {
  try {
    // console.log('Creating travel diary:', req.headers)
    console.log('Create s User ID:', req.user) // 这里的req.user.id是通过JWT middleware解析token后注入的
    const { title, content, images, video, mediaType, detailType } = req.body
    console.log('video:', video)

    // 验证必填项
    if (!title || !content) {
      return res.status(400).json({ message: '标题和内容为必填项' })
    }
    // if (!images || !video) {
    //   return res.status(400).json({ message: '图片和视频必须至少选择一个' })
    // }

    let coverImageUrl = null

    const tempDiaryId = new mongoose.Types.ObjectId().toString()

    if (mediaType === 'video' && video) {
      try {
        console.log(`[Create Diary] mediaType 是 video, 开始为视频 ${video} 生成封面...`)
        // 从视频的OSS URL生成封面并上传到OSS，返回封面的OSS URL
        coverImageUrl = await generateAndUploadCoverFromVideo(video, tempDiaryId)
        console.log(`[Create Diary] 视频封面已生成并上传, OSS URL: ${coverImageUrl}`)
      } catch (coverError) {
        console.error('[Create Diary] 生成或上传视频封面失败:', coverError)
      }
    } else if (mediaType === 'image' && images && images.length > 0) {
      // 如果是图片类型，默认使用第一张图片作为封面
      coverImageUrl = images[0]
      console.log(`[Create Diary] mediaType 是 image, 使用第一张图片作为封面: ${coverImageUrl}`)
    }

    // 创建游记
    const travelDiaryData = {
      title,
      content,
      images,
      video,
      mediaType,
      detailType,
      status: 'approved', // 默认状态为已通过
      author: req.user.id,
      cover: coverImageUrl,
    }

    if (mediaType === 'image') {
      travelDiaryData.images = images
    } else if (mediaType === 'video') {
      travelDiaryData.video = video
    }

    const travelDiary = new TravelDiary(travelDiaryData)
    await travelDiary.save()

    res.status(201).json(travelDiary)
  } catch (err) {
    console.error('[Create Diary] 创建游记时发生服务器错误:', err)
    // 检查是否是ffmpeg相关的路径错误 (例如 ffmpeg not found)
    if (err.message && (err.message.includes('ENOENT') || err.message.toLowerCase().includes('ffmpeg'))) {
      console.error('[Create Diary] FFMPEG 相关错误，请确保 ffmpeg 已安装并配置在系统 PATH 中。')
      return res.status(500).json({ message: '服务器配置错误：无法处理视频文件。' })
    }
    res.status(500).json({ message: '服务器错误' })
  }
}

// 获取游记列表
exports.getTravelDiaries = async (req, res) => {
  try {
    let params = {}
    // 检查 req.query.params 是否存在且为字符串类型
    if (req.query.params && typeof req.query.params === 'string') {
      try {
        params = JSON.parse(req.query.params)
      } catch (e) {
        console.warn('[getTravelDiaries] Failed to parse req.query.params, falling back to direct query params.', e.message)
        // 如果JSON.parse失败，尝试直接使用req.query (排除'params'本身)
        params = { ...req.query }
        delete params.params
      }
    } else if (typeof req.query === 'object' && req.query !== null) {
      // 如果 req.query.params 不存在或不是字符串，直接使用 req.query
      params = { ...req.query }
    }

    const { page = 1, limit = 10, keyword = '' } = params
    console.log('Page:', page, 'Limit:', limit, 'Keyword:', keyword)

    // const options = {
    //   page: parseInt(page),
    //   limit: parseInt(limit),
    //   sort: { publishTime: -1 },
    // }

    // const query = {
    //   status: 'approved',
    //   isDeleted: false,
    //   $or: [{ title: { $regex: keyword, $options: 'i' } }, { 'author.nickname': { $regex: keyword, $options: 'i' } }],
    // }

    const baseQuery = {
      status: 'approved',
      isDeleted: false,
    }

    // 使用新的搜索工具函数
    const {
      data: travelDiariesFromSearch, // 重命名以避免与旧的 travelDiaries 变量混淆
      total,
      page: resultPage,
      limit: resultLimit,
    } = await searchAndPaginateTravelDiaries(keyword, page, limit, baseQuery)

    console.log('[getTravelDiaries] Found diaries count:', total)

    // let travelDiaries = []
    // let total = 0

    // try {
    //   travelDiaries = await TravelDiary.find(query)
    //     .populate('author', 'nickname avatar')
    //     .skip((options.page - 1) * options.limit)
    //     .limit(options.limit)
    //     .sort(options.sort)
    // } catch (err) {
    //   console.error('Error fetching travel diaries:', err)
    //   // return res.status(500).json({ message: '服务器错误' })
    // }

    // try {
    //   total = await TravelDiary.countDocuments(query)
    // } catch (err) {
    //   console.error('Error counting travel diaries:', err)
    //   // return res.status(500).json({ message: '服务器错误' })
    // }

    // console.log('Travel diaries:', total)

    res.json({
      total,
      page: resultPage,
      limit: resultLimit,
      data: MapTravelDiaries(travelDiariesFromSearch),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 获取我的游记列表
exports.getMyTravelDiaries = async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword = '', status = 'approved' } = JSON.parse(req.query.params)
    console.log('Page:', page, 'Limit:', limit, 'Keyword:', keyword)

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { publishTime: -1 },
    }

    const query = {
      // status: status,
      author: req.user.id,
      isDeleted: false,
    }

    if (status && typeof status === 'string' && status.toLowerCase() !== 'all') {
      // 确保 status 值是你的 schema enum 中允许的值
      const validStatuses = ['pending', 'approved', 'rejected'] // 从你的 TravelDiary schema 获取
      if (validStatuses.includes(status.toLowerCase())) {
        query.status = status.toLowerCase()
      } else {
        console.warn(`[getMyTravelDiaries] Invalid status value received: ${status}. Ignoring status filter.`)
        // 或者返回错误: return res.status(400).json({ message: `无效的状态值: ${status}` });
      }
    }
    // 如果前端可能发送空字符串的 keyword，而后端不希望按空字符串搜索，可以处理
    if (keyword && typeof keyword === 'string' && keyword.trim() !== '') {
      query.$or = [
        { title: { $regex: keyword.trim(), $options: 'i' } },
        // 如果需要根据内容搜索也可以加入
        // { content: { $regex: keyword.trim(), $options: 'i' } }
      ]
    }

    console.log(req.user.id)

    let travelDiaries = []
    let total = 0

    try {
      travelDiaries = await TravelDiary.find(query)
        .populate('author', 'nickname avatar')
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .sort(options.sort)
      total = await TravelDiary.countDocuments(query)
    } catch (err) {
      console.error('Error fetching travel diaries:', err)
      return res.status(500).json({ message: '获取游记数据失败' })
    }

    console.log('Travel diaries:', total)

    // res.json(travelDiaries)
    res.json({
      total,
      page: options.page,
      limit: options.limit,
      data: MapTravelDiaries(travelDiaries),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 获取游记详情
exports.getTravelDiaryById = async (req, res) => {
  try {
    const diaryId = req.params.id
    const currentUserId = req.user ? req.user.id : null // 获取当前登录用户ID，可能未登录
    const currentUserRole = req.user ? req.user.role : null // 获取当前用户角色

    // 使用 lean() 可以提高查询性能，因为它返回的是普通JS对象而不是Mongoose文档。
    // 但后续如果需要调用 .save() (如此处的 views++)，则不能用 lean()。
    // 如果不需要 .save()，可以考虑 .lean()
    const travelDiary = await TravelDiary.findById(diaryId).populate('author', 'nickname avatar') // 只 populate 需要的字段

    if (!travelDiary) {
      return res.status(404).json({ message: '游记不存在' })
    }

    // 权限检查

    const isAuthor = currentUserId && travelDiary.author && travelDiary.author._id.toString() === currentUserId
    const isAdmin = currentUserRole === 'admin'

    if (travelDiary.status !== 'approved' && !isAuthor && !isAdmin) {
      return res.status(403).json({ message: '无权限查看此游记' })
    }

    // 更新浏览量 (只有在首次加载或非作者本人查看时增加，具体逻辑可调整)
    // 为避免每次API调用都增加，可以考虑更复杂的浏览量记录逻辑，但简单起见先这样
    if (travelDiary.status === 'approved') {
      // 只对已批准的游记增加浏览量
      travelDiary.views += 1
      await travelDiary.save() // 保存更新后的浏览量
    }

    // 构造返回给前端的数据对象
    const responseData = {
      id: travelDiary._id,
      title: travelDiary.title,
      content: travelDiary.content,
      mediaType: travelDiary.mediaType,
      images: travelDiary.images || [], // 确保 images 是数组，即使为空
      video: travelDiary.video || null, // 确保 video 是字符串或 null
      cover: travelDiary.cover || null, // 确保 cover 是字符串或 null
      detailType: travelDiary.detailType,
      likes: travelDiary.likes.length,
      views: travelDiary.views,
      author: travelDiary.author
        ? {
            // 检查 author 是否成功 populate
            id: travelDiary.author._id,
            nickname: travelDiary.author.nickname,
            avatar: travelDiary.author.avatar,
          }
        : null,
      authorId: travelDiary.author ? travelDiary.author._id.toString() : null, // 作者ID
      publishTime: travelDiary.publishTime,
      createdAt: travelDiary.createdAt,
      updatedAt: travelDiary.updatedAt,
      status: travelDiary.status,
      rejectionReason: travelDiary.rejectionReason,
      isLiked: currentUserId ? travelDiary.likes.includes(currentUserId) : false, // 当前用户是否点赞
    }

    res.json(responseData)
  } catch (err) {
    console.error('获取游记详情失败:', err)
    if (err.name === 'CastError' && err.path === '_id') {
      // 更精确的 CastError 判断
      return res.status(400).json({ message: '无效的游记ID格式' })
    }
    res.status(500).json({ message: '服务器错误，获取游记详情失败' })
  }
}

// 编辑游记
exports.updateTravelDiary = async (req, res) => {
  try {
    const { title, content, mediaType, detailType, images, video } = req.body

    // 验证必填项
    if (!title || !content || !images || images.length === 0) {
      return res.status(400).json({ message: '标题、内容和图片为必填项' })
    }

    // 获取游记
    const travelDiary = await TravelDiary.findById(req.params.id)

    if (!travelDiary) {
      return res.status(404).json({ message: '游记不存在' })
    }

    // 检查权限（只有作者本人/管理员可编辑）
    if (travelDiary.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限编辑此游记' })
    }

    // // 检查状态（只有待审核或未通过的游记可编辑）
    // if (travelDiary.status === 'approved') {
    //   return res.status(400).json({ message: '已通过的游记不可编辑' })
    // }

    // 删除不再使用的图片
    const newImageUrls = new Set(images || [])
    const oldImageUrls = travelDiary.images || []
    const imagesToDelete = oldImageUrls.filter((imgUrl) => !newImageUrls.has(imgUrl))

    if (imagesToDelete.length > 0) {
      console.log('[UpdateTravelDiary] Deleting old images from OSS:', imagesToDelete)
      try {
        await Promise.all(imagesToDelete.map((url) => ossService.deleteFile(url)))
      } catch (ossError) {
        console.error('[UpdateTravelDiary] Error deleting images from OSS:', ossError)
      }
    }

    // 删除不再使用的视频
    const newVideoUrl = video || null
    const oldVideoUrl = travelDiary.video

    if (oldVideoUrl && oldVideoUrl !== newVideoUrl) {
      console.log('[UpdateTravelDiary] Deleting old video from OSS:', oldVideoUrl)
      try {
        await ossService.deleteFile(oldVideoUrl)
      } catch (ossError) {
        console.error('[UpdateTravelDiary] Error deleting video from OSS:', ossError)
      }
    }

    // 更新游记
    travelDiary.title = title
    travelDiary.content = content
    travelDiary.mediaType = mediaType || null
    travelDiary.detailType = detailType || (mediaType ? 'horizontal' : null)
    travelDiary.images = images || []
    travelDiary.video = newVideoUrl
    travelDiary.updatedAt = Date.now()
    travelDiary.status = 'pending'
    travelDiary.rejectionReason = null

    await travelDiary.save()

    res.json(travelDiary)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 删除游记
exports.deleteTravelDiary = async (req, res) => {
  try {
    const travelDiary = await TravelDiary.findById(req.params.id)

    if (!travelDiary) {
      return res.status(404).json({ message: '游记不存在' })
    }

    // 检查权限（只有作者本人/管理员可删除）
    if (travelDiary.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限删除此游记' })
    }

    // 删除OSS中的图片和视频
    try {
      // 删除图片
      await Promise.all(travelDiary.images.map((image) => ossService.deleteFile(image)))

      // 删除视频
      if (travelDiary.video) {
        await ossService.deleteFile(travelDiary.video)
      }
    } catch (error) {
      console.error('删除OSS文件失败:', error)
    }

    // 标记为逻辑删除
    travelDiary.isDeleted = true
    travelDiary.updatedAt = Date.now()

    await travelDiary.save()

    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 添加点赞功能
exports.toggleLike = async (req, res) => {
  try {
    const travelDiary = await TravelDiary.findById(req.params.id)

    if (!travelDiary) {
      return res.status(404).json({ message: '游记不存在' })
    }

    const userId = req.user.id
    const likeIndex = travelDiary.likes.indexOf(userId)

    if (likeIndex === -1) {
      travelDiary.likes.push(userId)
    } else {
      travelDiary.likes.splice(likeIndex, 1)
    }

    await travelDiary.save()

    res.json({
      likes: travelDiary.likes.length,
      isLiked: likeIndex === -1,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 检查用户是否已点赞
exports.checkLikeStatus = async (req, res) => {
  try {
    const travelDiary = await TravelDiary.findById(req.params.id)

    if (!travelDiary) {
      return res.status(404).json({ message: '游记不存在' })
    }

    const isLiked = travelDiary.likes.includes(req.user.id)

    res.json({
      isLiked,
      likes: travelDiary.likes.length,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}
