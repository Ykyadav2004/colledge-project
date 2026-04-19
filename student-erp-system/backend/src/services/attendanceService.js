const { v4: uuidv4 } = require('uuid');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceLog = require('../models/AttendanceLog');
const { isWithinRadius, haversineDistance, isSuspiciousMovement } = require('../utils/geolocation');

const MAX_WARNINGS = parseInt(process.env.MAX_WARNINGS) || 3;
const LOCATION_UPDATE_INTERVAL = parseInt(process.env.LOCATION_UPDATE_INTERVAL) || 5;

class AttendanceService {
  async generateCode(teacherId, courseId, teacherLocation, radiusMeters = 30) {
    const code = uuidv4().split('-')[0].toUpperCase();
    const expiryMinutes = parseInt(process.env.ATTENDANCE_CODE_EXPIRY_MINUTES) || 5;
    const minDuration = parseInt(process.env.ATTENDANCE_MIN_DURATION_MINUTES) || 20;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    const session = await AttendanceSession.create({
      course: courseId,
      teacher: teacherId,
      code,
      date: new Date(),
      teacherLocation: {
        latitude: teacherLocation.latitude,
        longitude: teacherLocation.longitude,
        address: teacherLocation.address
      },
      radiusMeters,
      expiresAt,
      minDurationMinutes: minDuration
    });

    return session;
  }

  async verifyCode(code, studentId) {
    const session = await AttendanceSession.findOne({
      code: code.toUpperCase(),
      isActive: true
    }).populate('course').populate('teacher', 'firstName lastName');

    if (!session) {
      return { success: false, message: 'Invalid attendance code' };
    }

    if (session.isExpired()) {
      return { success: false, message: 'Attendance code has expired' };
    }

    const existingRecord = session.attendanceRecords.find(
      record => record.student.toString() === studentId.toString()
    );

    if (existingRecord && existingRecord.status !== 'pending') {
      return { success: false, message: 'Attendance already marked for this code' };
    }

    return { success: true, session };
  }

  async checkInStudent(session, studentId, location) {
    const sessionDoc = await AttendanceSession.findById(session._id);

    const distance = haversineDistance(
      location.latitude,
      location.longitude,
      sessionDoc.teacherLocation.latitude,
      sessionDoc.teacherLocation.longitude
    );

    if (!isWithinRadius(
      location.latitude,
      location.longitude,
      sessionDoc.teacherLocation.latitude,
      sessionDoc.teacherLocation.longitude,
      sessionDoc.radiusMeters
    )) {
      return {
        success: false,
        message: `You are ${distance.meters}m away from the classroom. Please move within ${sessionDoc.radiusMeters}m of your teacher.`,
        distance: distance.meters
      };
    }

    const attendanceRecord = {
      student: studentId,
      status: 'present',
      checkInTime: new Date(),
      checkInLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        distance: distance.meters
      },
      warningCount: 0,
      warnings: [],
      locationHistory: [{
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: new Date()
      }]
    };

    sessionDoc.attendanceRecords.push(attendanceRecord);
    await sessionDoc.save();

    return {
      success: true,
      message: 'Attendance marked successfully',
      session: sessionDoc,
      record: attendanceRecord,
      distance: distance.meters
    };
  }

  async updateStudentLocation(sessionId, studentId, location) {
    const session = await AttendanceSession.findById(sessionId);

    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    if (session.isExpired()) {
      return { success: false, message: 'Session has expired' };
    }

    const recordIndex = session.attendanceRecords.findIndex(
      record => record.student.toString() === studentId.toString()
    );

    if (recordIndex === -1) {
      return { success: false, message: 'Attendance record not found' };
    }

    const record = session.attendanceRecords[recordIndex];

    if (record.status !== 'present') {
      return { success: false, message: 'Attendance already invalid or cancelled' };
    }

    const lastLocation = record.lastLocation;
    const now = new Date();

    if (lastLocation && isSuspiciousMovement(
      lastLocation.latitude,
      lastLocation.longitude,
      lastLocation.timestamp.getTime(),
      location.latitude,
      location.longitude,
      now.getTime(),
      50
    )) {
      record.warningCount += 1;
      record.warnings.push({
        timestamp: now,
        distance: null,
        message: 'Suspicious movement detected - possible teleportation'
      });

      if (record.warningCount >= MAX_WARNINGS) {
        record.status = 'invalid';
        record.isValid = false;
        record.invalidationReason = 'Excessive suspicious movements detected';
        record.invalidationTime = now;

        await this.saveAttendanceLog(session, record);
      }

      await session.save();
      return {
        success: false,
        message: 'Suspicious movement detected',
        warningCount: record.warningCount,
        maxWarnings: MAX_WARNINGS
      };
    }

    const distance = haversineDistance(
      location.latitude,
      location.longitude,
      session.teacherLocation.latitude,
      session.teacherLocation.longitude
    );

    const isInZone = distance.meters <= session.radiusMeters;

    if (!isInZone) {
      record.warningCount += 1;
      record.warnings.push({
        timestamp: now,
        distance: distance.meters,
        message: `Moved outside allowed zone: ${distance.meters}m from teacher`
      });

      if (record.warningCount >= MAX_WARNINGS) {
        record.status = 'invalid';
        record.isValid = false;
        record.invalidationReason = 'Exceeded maximum warnings - left allowed zone';
        record.invalidationTime = now;

        await this.saveAttendanceLog(session, record);
      }

      await session.save();

      return {
        success: false,
        warning: true,
        message: `Warning ${record.warningCount}/${MAX_WARNINGS}: You have left the allowed zone! Return immediately.`,
        distance: distance.meters,
        warningCount: record.warningCount,
        maxWarnings: MAX_WARNINGS
      };
    }

    record.locationHistory.push({
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: now
    });

    record.lastLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: now
    };

    const checkInTime = record.checkInTime;
    const timeInZoneMinutes = (now - checkInTime) / (1000 * 60);

    if (timeInZoneMinutes >= session.minDurationMinutes && record.isValid === null) {
      record.isValid = true;
      record.status = 'present';

      await this.saveAttendanceLog(session, record);
    }

    await session.save();

    return {
      success: true,
      message: 'Location updated',
      distance: distance.meters,
      timeInZoneMinutes: Math.round(timeInZoneMinutes),
      requiredMinutes: session.minDurationMinutes,
      warningCount: record.warningCount,
      isValid: record.isValid
    };
  }

  async saveAttendanceLog(session, record) {
    let maxDistance = 0;
    let totalDistance = 0;
    let locationCount = 0;

    if (record.locationHistory && record.locationHistory.length > 0) {
      for (const loc of record.locationHistory) {
        const dist = haversineDistance(
          loc.latitude,
          loc.longitude,
          session.teacherLocation.latitude,
          session.teacherLocation.longitude
        );
        if (dist.meters > maxDistance) {
          maxDistance = dist.meters;
        }
        totalDistance += dist.meters;
        locationCount++;
      }
    }

    await AttendanceLog.create({
      student: record.student,
      course: session.course,
      session: session._id,
      status: record.status,
      checkInTime: record.checkInTime,
      checkOutTime: record.invalidationTime || new Date(),
      totalTimeInZone: record.locationHistory ? record.locationHistory.length : 0,
      averageDistance: locationCount > 0 ? totalDistance / locationCount : 0,
      maxDistance,
      warningCount: record.warningCount,
      finalStatus: record.isValid === true ? 'marked' : 'rejected'
    });
  }

  async getSessionDetails(sessionId, userId) {
    const session = await AttendanceSession.findById(sessionId)
      .populate('course', 'name code')
      .populate('teacher', 'firstName lastName');

    if (!session) {
      return null;
    }

    const record = session.attendanceRecords.find(
      r => r.student.toString() === userId.toString()
    );

    return {
      session,
      record
    };
  }

  async getActiveSessions() {
    return await AttendanceSession.find({
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
      .populate('course', 'name code')
      .populate('teacher', 'firstName lastName')
      .sort({ createdAt: -1 });
  }

  async getStudentAttendanceHistory(studentId, courseId = null) {
    const query = { student: studentId };
    if (courseId) {
      query.course = courseId;
    }

    return await AttendanceLog.find(query)
      .populate('course', 'name code')
      .populate('session', 'date code')
      .sort({ createdAt: -1 })
      .limit(50);
  }
}

module.exports = new AttendanceService();