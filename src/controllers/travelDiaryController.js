const TravelDiary = require('../models/TravelDiary')
const User = require('../models/User')
const ossService = require('../services/ossService')
const sizeOf = require('image-size')
const ffprobe = require('ffprobe')
const ffmpeg = require('fluent-ffmpeg')

// 处理笔记数据
const MapTravelDiaries = (travelDiaries) => {
  const data = travelDiaries.map((diary) => ({
    id: diary._id,
    title: diary.title,
    content: diary.content,
    cover: diary.images[0] || diary.video || '', // 添加cover字段
    likes: diary.likes.length,
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
    console.log('Creating travel diary:', req.headers)
    console.log('User ID:', req.user) // 这里的req.user.id是通过JWT middleware解析token后注入的
    const { title, content, images, video, mediaType, detailType } = req.body

    // 验证必填项
    if (!title || !content || !images || images.length === 0) {
      return res.status(400).json({ message: '标题、内容和图片为必填项' })
    }

    // 创建游记
    const travelDiary = new TravelDiary({
      title,
      content,
      images,
      video,
      mediaType,
      detailType,
      status: 'approved', // 默认状态为已通过
      author: req.user.id,
    })

    await travelDiary.save()

    res.status(201).json(travelDiary)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 获取游记列表
exports.getTravelDiaries = async (req, res) => {
  try {
    console.log('Fetching travel diaries:', req.query.params)
    const { page = 1, limit = 10, keyword = '' } = JSON.parse(req.query.params)
    console.log('Page:', page, 'Limit:', limit, 'Keyword:', keyword)

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { publishTime: -1 },
    }

    const query = {
      status: 'approved',
      isDeleted: false,
      $or: [{ title: { $regex: keyword, $options: 'i' } }, { 'author.nickname': { $regex: keyword, $options: 'i' } }],
    }

    let travelDiaries = []
    let total = 0

    try {
      travelDiaries = await TravelDiary.find(query)
        .populate('author', 'nickname avatar')
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .sort(options.sort)
    } catch (err) {
      console.error('Error fetching travel diaries:', err)
      // return res.status(500).json({ message: '服务器错误' })
    }

    try {
      total = await TravelDiary.countDocuments(query)
    } catch (err) {
      console.error('Error counting travel diaries:', err)
      // return res.status(500).json({ message: '服务器错误' })
    }

    console.log('Travel diaries:', total)

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

// 获取我的游记列表
exports.getMyTravelDiaries = async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword = '', status = 'approved' } = JSON.parse(req.query.params)
    console.log('Page:', page, 'Limit:', limit, 'Keyword:', keyword)

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { publishTime: -1 },
    }

    const query = {
      status: status,
      author: req.user.id,
      isDeleted: false,
    }

    console.log(req.user.id)
    // const { status } = req.query

    // const query = { author: req.user.id }
    // if (status) {
    //   query.status = status
    // }

    // const travelDiaries = await TravelDiary.find(query).sort({ publishTime: -1 })

    let travelDiaries = []
    let total = 0

    try {
      travelDiaries = await TravelDiary.find(query)
        .populate('author', 'nickname avatar')
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .sort(options.sort)
    } catch (err) {
      console.error('Error fetching travel diaries:', err)
      // return res.status(500).json({ message: '服务器错误' })
    }

    try {
      total = await TravelDiary.countDocuments(query)
    } catch (err) {
      console.error('Error counting travel diaries:', err)
      // return res.status(500).json({ message: '服务器错误' })
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
    const travelDiary = await TravelDiary.findById(req.params.id).populate('author', 'nickname avatar')

    if (!travelDiary) {
      return res.status(404).json({ message: '游记不存在' })
    }

    // 检查权限（只有已通过的游记或作者本人/管理员可查看）
    if (travelDiary.status !== 'approved' && (travelDiary.author._id.toString() !== req.user.id || req.user.role !== 'admin')) {
      return res.status(403).json({ message: '无权限查看此游记' })
    }

    // 更新浏览量
    travelDiary.views += 1
    await travelDiary.save()

    res.json({
      id: travelDiary._id,
      title: travelDiary.title,
      content: travelDiary.content,
      images: travelDiary.images,
      video: travelDiary.video,
      likes: travelDiary.likes.length,
      views: travelDiary.views,
      author: {
        id: travelDiary.author._id,
        nickname: travelDiary.author.nickname,
        avatar: travelDiary.author.avatar,
      },
      publishTime: travelDiary.publishTime,
      status: travelDiary.status,
      rejectionReason: travelDiary.rejectionReason,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 编辑游记
exports.updateTravelDiary = async (req, res) => {
  try {
    const { title, content, images, video } = req.body

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

    // 检查状态（只有待审核或未通过的游记可编辑）
    if (travelDiary.status === 'approved') {
      return res.status(400).json({ message: '已通过的游记不可编辑' })
    }

    // 删除不再使用的图片
    const removedImages = travelDiary.images.filter((img) => !images.includes(img))
    await Promise.all(removedImages.map((image) => ossService.deleteImage(image)))

    // 删除不再使用的视频
    if (travelDiary.video && travelDiary.video !== video) {
      await ossService.deleteImage(travelDiary.video)
    }

    // 更新游记
    travelDiary.title = title
    travelDiary.content = content
    travelDiary.images = images
    travelDiary.video = video
    travelDiary.updatedAt = Date.now()

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
      await Promise.all(travelDiary.images.map((image) => ossService.deleteImage(image)))

      // 删除视频
      if (travelDiary.video) {
        await ossService.deleteImage(travelDiary.video)
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
