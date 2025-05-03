const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const adminController = require('../controllers/adminController')

// 获取审核列表
router.get('/traveldiaries', authMiddleware.auth, authMiddleware.authorizeRole('reviewer', 'admin'), adminController.getTravelDiariesForReview)

// 审核通过游记
router.put('/traveldiaries/:id/approve', authMiddleware.auth, authMiddleware.authorizeRole('reviewer', 'admin'), adminController.approveTravelDiary)

// 拒绝游记
router.put('/traveldiaries/:id/reject', authMiddleware.auth, authMiddleware.authorizeRole('reviewer', 'admin'), adminController.rejectTravelDiary)

// 删除游记（逻辑删除）
router.delete('/traveldiaries/:id', authMiddleware.auth, authMiddleware.authorizeRole('admin'), adminController.deleteTravelDiary)

module.exports = router
