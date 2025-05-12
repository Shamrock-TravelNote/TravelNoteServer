const TravelDiary = require('../models/TravelDiary')
const mongoose = require('mongoose')

/**
 * 搜索并分页旅行日记，支持关键词优先级匹配。
 *
 * @param {string} keyword - 用于搜索的关键词。
 * @param {number} page - 当前页码 (从1开始)。
 * @param {number} limit - 每页的项目数。
 * @param {object} baseQuery - 基础查询条件 (例如, { status: 'approved', isDeleted: false })。
 * @returns {Promise<{data: Array<object>, total: number, page: number, limit: number}>}
 */
async function searchAndPaginateTravelDiaries(keyword, page, limit, baseQuery = {}) {
  const pageInt = parseInt(page, 10) || 1
  const limitInt = parseInt(limit, 10) || 10
  // 如果 keyword 是空字符串或仅包含空格，则将其视为null，不进行关键词搜索
  const trimmedKeyword = keyword && keyword.trim()
  const keywordRegex = trimmedKeyword ? new RegExp(trimmedKeyword, 'i') : null

  const pipeline = []

  // 阶段 1: 初始匹配 (合并基础查询)
  const initialMatchStage = { $match: { ...baseQuery } }
  pipeline.push(initialMatchStage)

  // 阶段 2: 关联作者详情
  pipeline.push({
    $lookup: {
      from: 'users', // User模型的集合名称
      localField: 'author',
      foreignField: '_id',
      as: 'authorDetailsObject',
    },
  })

  // 阶段 3: 展开 authorDetailsObject
  pipeline.push({
    $unwind: {
      path: '$authorDetailsObject',
      preserveNullAndEmptyArrays: true, // 以防作者关联损坏 (尽管schema中author是必须的)
    },
  })

  // 阶段 4: 添加用于匹配和评分的字段，并构造author字段
  // author字段将被 MapTravelDiaries 使用
  const fieldsToAdd = {
    author: '$authorDetailsObject', // 将author ID替换为完整的作者对象
  }

  if (keywordRegex) {
    Object.assign(fieldsToAdd, {
      titleMatch: { $regexMatch: { input: '$title', regex: keywordRegex } },
      contentMatch: { $regexMatch: { input: '$content', regex: keywordRegex } },
      // 确保authorDetailsObject存在才尝试访问其属性
      nicknameMatch: {
        $cond: {
          if: { $and: ['$authorDetailsObject', '$authorDetailsObject.nickname'] },
          then: { $regexMatch: { input: '$authorDetailsObject.nickname', regex: keywordRegex } },
          else: false,
        },
      },
      usernameMatch: {
        $cond: {
          if: { $and: ['$authorDetailsObject', '$authorDetailsObject.username'] },
          then: { $regexMatch: { input: '$authorDetailsObject.username', regex: keywordRegex } },
          else: false,
        },
      },
    })
  }
  pipeline.push({ $addFields: fieldsToAdd })

  // 阶段 5: 计算优先级分数 (仅当存在关键词时)
  if (keywordRegex) {
    pipeline.push({
      $addFields: {
        primaryScore: {
          $cond: { if: { $or: ['$titleMatch', '$contentMatch'] }, then: 2, else: 0 },
        },
        secondaryScore: {
          $cond: {
            if: {
              $and: [{ $eq: ['$titleMatch', false] }, { $eq: ['$contentMatch', false] }, { $or: ['$nicknameMatch', '$usernameMatch'] }],
            },
            then: 1,
            else: 0,
          },
        },
      },
    })

    // 阶段 6: 基于关键词匹配进行过滤
    pipeline.push({
      $match: {
        $or: [{ titleMatch: true }, { contentMatch: true }, { nicknameMatch: true }, { usernameMatch: true }],
      },
    })

    // 阶段 7: 排序 (如果关键词存在，则进行优先级排序)
    pipeline.push({
      $sort: {
        primaryScore: -1, // title/content 匹配优先
        secondaryScore: -1, // nickname/username 匹配次之
        publishTime: -1, // 最后按发布时间
      },
    })
  } else {
    // 阶段 7: 默认排序 (如果没有关键词)
    pipeline.push({
      $sort: {
        publishTime: -1,
      },
    })
  }

  // 阶段 8: Facet 用于分页和总数统计
  pipeline.push({
    $facet: {
      paginatedResults: [
        { $skip: (pageInt - 1) * limitInt },
        { $limit: limitInt },
        // 移除临时评分字段，清理发送到 MapTravelDiaries 的数据
        {
          $project: {
            titleMatch: 0,
            contentMatch: 0,
            nicknameMatch: 0,
            usernameMatch: 0,
            primaryScore: 0,
            secondaryScore: 0,
            authorDetailsObject: 0, // 清理临时的lookup字段
          },
        },
      ],
      totalCount: [{ $count: 'count' }],
    },
  })

  const results = await TravelDiary.aggregate(pipeline).exec()

  const data = results[0].paginatedResults
  const total = results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0

  return {
    data,
    total,
    page: pageInt,
    limit: limitInt,
  }
}

module.exports = {
  searchAndPaginateTravelDiaries,
}
