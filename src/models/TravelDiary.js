const mongoose = require('mongoose')

const travelDiarySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  images: {
    type: [String],
    default: [],
    required: function () {
      return this.mediaType === 'image'
    },
  },
  video: {
    type: String,
    default: null,
  },
  cover: {
    type: String,
    default: null,
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true,
  },
  detailType: {
    type: String,
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  publishTime: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  likes: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  views: {
    type: Number,
    default: 0,
  },
})

module.exports = mongoose.model('TravelDiary', travelDiarySchema)
