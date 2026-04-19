const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  accuracy: {
    type: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const attendanceRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'present', 'invalid', 'cancelled'],
    default: 'pending'
  },
  checkInTime: {
    type: Date
  },
  checkInLocation: {
    latitude: Number,
    longitude: Number,
    distanceFromTeacher: Number
  },
  warningCount: {
    type: Number,
    default: 0
  },
  warnings: [{
    timestamp: Date,
    distance: Number,
    message: String
  }],
  locationHistory: [locationSchema],
  lastLocation: locationSchema,
  isValid: {
    type: Boolean,
    default: null
  },
  invalidationReason: {
    type: String
  },
  invalidationTime: Date
});

const attendanceSessionSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true
  },
  teacherLocation: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: String
  },
  radiusMeters: {
    type: Number,
    default: parseInt(process.env.DEFAULT_RADIUS_METERS) || 30
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  minDurationMinutes: {
    type: Number,
    default: parseInt(process.env.ATTENDANCE_MIN_DURATION_MINUTES) || 20
  },
  attendanceRecords: [attendanceRecordSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

attendanceSessionSchema.index({ code: 1 });
attendanceSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

attendanceSessionSchema.methods.isValid = function() {
  return this.isActive && new Date() < this.expiresAt;
};

attendanceSessionSchema.methods.isExpired = function() {
  return new Date() >= this.expiresAt;
};

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);