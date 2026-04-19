const mongoose = require('mongoose');

const attendanceLogSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceSession',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'invalid', 'cancelled'],
    required: true
  },
  checkInTime: Date,
  checkOutTime: Date,
  totalTimeInZone: Number,
  averageDistance: Number,
  maxDistance: Number,
  warningCount: Number,
  finalStatus: {
    type: String,
    enum: ['marked', 'rejected', 'cancelled'],
    default: 'marked'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

attendanceLogSchema.index({ student: 1, course: 1, createdAt: -1 });

module.exports = mongoose.model('AttendanceLog', attendanceLogSchema);