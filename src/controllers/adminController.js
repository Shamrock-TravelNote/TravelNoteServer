const TravelDiary = require('../models/TravelDiary')

// 获取审核列表
exports.getTravelDiariesForReview = async (req, res) => {
  try {
    const { status } = req.query

    const query = { isDeleted: false }
    if (status) {
      query.status = status
    }

    const travelDiaries = await TravelDiary.find(query).populate('author', 'nickname avatar').sort({ publishTime: -1 })

    res.json(travelDiaries)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 审核通过游记
exports.approveTravelDiary = async (req, res) => {
  try {
    const travelDiary = await TravelDiary.findById(req.params.id)

    if (!travelDiary) {
      return res.status(404).json({ message: '游记不存在' })
    }

    // 检查权限（只有审核人员或管理员可审核）
    if (req.user.role !== 'reviewer' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限进行此操作' })
    }

    // 更新游记状态为已通过
    travelDiary.status = 'approved'
    travelDiary.updatedAt = Date.now()

    await travelDiary.save()

    res.json(travelDiary)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 拒绝游记
exports.rejectTravelDiary = async (req, res) => {
  try {
    const { rejectionReason } = req.body

    const travelDiary = await TravelDiary.findById(req.params.id)

    if (!travelDiary) {
      return res.status(404).json({ message: '游记不存在' })
    }

    // 检查权限（只有审核人员或管理员可审核）
    if (req.user.role !== 'reviewer' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限进行此操作' })
    }

    // 更新游记状态为未通过
    travelDiary.status = 'rejected'
    travelDiary.rejectionReason = rejectionReason
    travelDiary.updatedAt = Date.now()

    await travelDiary.save()

    res.json(travelDiary)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
  }
}

// 删除游记（逻辑删除）
exports.deleteTravelDiary = async (req, res) => {
  try {
    const travelDiary = await TravelDiary.findById(req.params.id)

    if (!travelDiary) {
      return res.status(404).json({ message: '游记不存在' })
    }

    // 检查权限（只有管理员可删除）
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限进行此操作' })
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
