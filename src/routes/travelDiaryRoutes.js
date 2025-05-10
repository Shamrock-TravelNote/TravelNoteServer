const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const travelDiaryController = require('../controllers/travelDiaryController')

// 发布新游记
router.post('/', authMiddleware.auth, travelDiaryController.createTravelDiary)

// 获取游记列表
router.get('/', travelDiaryController.getTravelDiaries)

// 获取我的游记列表
router.get('/users/:userId/traveldiaries', authMiddleware.auth, travelDiaryController.getMyTravelDiaries)

// 获取游记详情
router.get('/:id', authMiddleware.auth, travelDiaryController.getTravelDiaryById)

// 编辑游记
router.put('/:id', authMiddleware.auth, travelDiaryController.updateTravelDiary)

// 删除游记
router.delete('/:id', authMiddleware.auth, travelDiaryController.deleteTravelDiary)

// 点赞游记
router.post('/:id/like', authMiddleware.auth, travelDiaryController.toggleLike)

// 检查是否已点赞
router.get('/:id/like', authMiddleware.auth, travelDiaryController.checkLikeStatus)

module.exports = router
