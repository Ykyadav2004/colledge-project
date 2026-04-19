const attendanceService = require('../services/attendanceService');

exports.generateCode = async (req, res) => {
  try {
    const { courseId, radiusMeters, teacherLocation } = req.body;

    if (!courseId || !teacherLocation || !teacherLocation.latitude || !teacherLocation.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide course ID and teacher location'
      });
    }

    const session = await attendanceService.generateCode(
      req.user.id,
      courseId,
      teacherLocation,
      radiusMeters || 30
    );

    res.status(201).json({
      success: true,
      session: {
        id: session._id,
        code: session.code,
        course: session.course,
        expiresAt: session.expiresAt,
        radiusMeters: session.radiusMeters,
        minDurationMinutes: session.minDurationMinutes,
        teacherLocation: session.teacherLocation
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.verifyCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide attendance code'
      });
    }

    const result = await attendanceService.verifyCode(code, req.user.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      session: {
        id: result.session._id,
        code: result.session.code,
        course: {
          name: result.session.course.name,
          code: result.session.course.code
        },
        teacher: result.session.teacher,
        radiusMeters: result.session.radiusMeters,
        expiresAt: result.session.expiresAt,
        minDurationMinutes: result.session.minDurationMinutes,
        teacherLocation: result.session.teacherLocation
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.checkIn = async (req, res) => {
  try {
    const { sessionId, location } = req.body;

    if (!sessionId || !location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide session ID and location'
      });
    }

    const session = await AttendanceSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const result = await attendanceService.checkInStudent(
      session,
      req.user.id,
      location
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        distance: result.distance
      });
    }

    res.json({
      success: true,
      message: result.message,
      session: {
        id: result.session._id,
        code: result.session.code,
        radiusMeters: result.session.radiusMeters,
        minDurationMinutes: result.session.minDurationMinutes
      },
      record: {
        checkInTime: result.record.checkInTime,
        distance: result.distance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const AttendanceSession = require('../models/AttendanceSession');

exports.updateLocation = async (req, res) => {
  try {
    const { sessionId, location } = req.body;

    if (!sessionId || !location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide session ID and location'
      });
    }

    const result = await attendanceService.updateStudentLocation(
      sessionId,
      req.user.id,
      location
    );

    if (!result.success) {
      if (result.warning) {
        return res.status(200).json({
          success: true,
          warning: true,
          message: result.message,
          distance: result.distance,
          warningCount: result.warningCount,
          maxWarnings: result.maxWarnings
        });
      }

      return res.status(400).json({
        success: false,
        message: result.message,
        warningCount: result.warningCount,
        maxWarnings: result.maxWarnings
      });
    }

    res.json({
      success: true,
      message: result.message,
      distance: result.distance,
      timeInZoneMinutes: result.timeInZoneMinutes,
      requiredMinutes: result.requiredMinutes,
      isValid: result.isValid
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await attendanceService.getSessionDetails(sessionId, req.user.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: {
        id: result.session._id,
        code: result.session.code,
        course: result.session.course,
        teacher: result.session.teacher,
        radiusMeters: result.session.radiusMeters,
        expiresAt: result.session.expiresAt,
        minDurationMinutes: result.session.minDurationMinutes,
        teacherLocation: result.session.teacherLocation
      },
      record: result.record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getActiveSessions = async (req, res) => {
  try {
    const sessions = await attendanceService.getActiveSessions();

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s._id,
        code: s.code,
        course: s.course,
        teacher: s.teacher,
        date: s.date,
        expiresAt: s.expiresAt,
        radiusMeters: s.radiusMeters,
        studentCount: s.attendanceRecords.length
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAttendanceHistory = async (req, res) => {
  try {
    const { courseId } = req.query;

    const history = await attendanceService.getStudentAttendanceHistory(
      req.user.id,
      courseId
    );

    res.json({
      success: true,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};