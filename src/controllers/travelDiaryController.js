const TravelDiary = require('../models/TravelDiary')
const User = require('../models/User')

// 发布新游记
exports.createTravelDiary = async (req, res) => {
  try {
    console.log('Creating travel diary:', req.body)
    console.log('User ID:', req.user)
    const { title, content, images, video } = req.body

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
    const { page = 1, limit = 10, keyword = '' } = req.query

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

    const travelDiaries = await TravelDiary.find(query)
      .populate('author', 'nickname avatar')
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .sort(options.sort)

    const total = await TravelDiary.countDocuments(query)

    res.json({
      total,
      page: options.page,
      limit: options.limit,
      data: travelDiaries.map((diary) => ({
        id: diary._id,
        title: diary.title,
        content: diary.content,
        images: diary.images,
        video: diary.video,
        author: {
          id: diary.author._id,
          nickname: diary.author.nickname,
          avatar: diary.author.avatar,
        },
        publishTime: diary.publishTime,
      })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 获取我的游记列表
exports.getMyTravelDiaries = async (req, res) => {
  try {
    const { status } = req.query

    const query = { author: req.user.id }
    if (status) {
      query.status = status
    }

    const travelDiaries = await TravelDiary.find(query).sort({ publishTime: -1 })

    res.json(travelDiaries)
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

    res.json({
      id: travelDiary._id,
      title: travelDiary.title,
      content: travelDiary.content,
      images: travelDiary.images,
      video: travelDiary.video,
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
