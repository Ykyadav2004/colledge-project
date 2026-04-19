const Course = require('../models/Course');

exports.createCourse = async (req, res) => {
  try {
    const { name, code, description, credits } = req.body;

    const existingCourse = await Course.findOne({ code: code.toUpperCase() });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course with this code already exists'
      });
    }

    const course = await Course.create({
      name,
      code: code.toUpperCase(),
      description,
      credits: credits || 3,
      teacher: req.user.id
    });

    res.status(201).json({
      success: true,
      course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCourses = async (req, res) => {
  try {
    let courses;

    if (req.user.role === 'teacher') {
      courses = await Course.find({ teacher: req.user.id }).populate('students', 'firstName lastName rollNumber');
    } else {
      courses = await Course.find({ students: req.user.id })
        .populate('teacher', 'firstName lastName')
        .populate('students', 'firstName lastName rollNumber');
    }

    res.json({
      success: true,
      courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacher', 'firstName lastName email')
      .populate('students', 'firstName lastName rollNumber email');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.enrollStudent = async (req, res) => {
  try {
    const { studentId } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.teacher.toString() !== req.user.id && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to enroll students'
      });
    }

    if (!course.students.includes(studentId)) {
      course.students.push(studentId);
      await course.save();
    }

    res.json({
      success: true,
      message: 'Student enrolled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { name, description, credits } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    if (name) course.name = name;
    if (description) course.description = description;
    if (credits) course.credits = credits;

    await course.save();

    res.json({
      success: true,
      course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};