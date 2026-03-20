const Student = require('../models/Student');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isAllowedGender(value) {
  return ['Male', 'Female', 'Other'].includes(value);
}

function parsePositiveInt(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

async function getAllStudents(req, res, next) {
  try {
    const grade = isNonEmptyString(req.query?.grade) ? req.query.grade.trim() : null;
    const academicYear = isNonEmptyString(req.query?.academic_year)
      ? req.query.academic_year.trim()
      : null;
    const semester = isNonEmptyString(req.query?.semester) ? req.query.semester.trim() : null;

    const students = await Student.list({
      grade,
      academic_year: academicYear,
      semester
    });
    return res.json(students);
  } catch (err) {
    return next(err);
  }
}

async function getStudentById(req, res, next) {
  try {
    const studentId = parsePositiveInt(req.params.id);
    if (!studentId) return res.status(400).json({ error: 'Invalid student id' });

    const student = await Student.getById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    return res.json(student);
  } catch (err) {
    return next(err);
  }
}

async function createStudent(req, res, next) {
  try {
    const { student_name, gender, grade, academic_year, semester } = req.body ?? {};
    if (!isNonEmptyString(student_name)) {
      return res.status(400).json({ error: 'Student_Name is required' });
    }
    if (!isAllowedGender(gender)) {
      return res.status(400).json({ error: 'Gender must be Male, Female, or Other' });
    }
    if (!isNonEmptyString(grade)) {
      return res.status(400).json({ error: 'Grade is required' });
    }
    if (!isNonEmptyString(academic_year)) {
      return res.status(400).json({ error: 'Academic_Year is required' });
    }
    if (!isNonEmptyString(semester)) {
      return res.status(400).json({ error: 'Semester is required' });
    }

    const studentId = await Student.create({
      student_name: student_name.trim(),
      gender,
      grade: grade.trim(),
      academic_year: academic_year.trim(),
      semester: semester.trim()
    });

    const student = await Student.getById(studentId);
    return res.status(201).json(student);
  } catch (err) {
    return next(err);
  }
}

async function updateStudent(req, res, next) {
  try {
    const studentId = parsePositiveInt(req.params.id);
    if (!studentId) return res.status(400).json({ error: 'Invalid student id' });

    const { student_name, gender, grade, academic_year, semester } = req.body ?? {};
    if (!isNonEmptyString(student_name)) {
      return res.status(400).json({ error: 'Student_Name is required' });
    }
    if (!isAllowedGender(gender)) {
      return res.status(400).json({ error: 'Gender must be Male, Female, or Other' });
    }
    if (!isNonEmptyString(grade)) {
      return res.status(400).json({ error: 'Grade is required' });
    }
    if (!isNonEmptyString(academic_year)) {
      return res.status(400).json({ error: 'Academic_Year is required' });
    }
    if (!isNonEmptyString(semester)) {
      return res.status(400).json({ error: 'Semester is required' });
    }

    const affected = await Student.update(studentId, {
      student_name: student_name.trim(),
      gender,
      grade: grade.trim(),
      academic_year: academic_year.trim(),
      semester: semester.trim()
    });

    if (!affected) return res.status(404).json({ error: 'Student not found' });

    const student = await Student.getById(studentId);
    return res.json(student);
  } catch (err) {
    return next(err);
  }
}

async function deleteStudent(req, res, next) {
  try {
    const studentId = parsePositiveInt(req.params.id);
    if (!studentId) return res.status(400).json({ error: 'Invalid student id' });

    const affected = await Student.remove(studentId);
    if (!affected) return res.status(404).json({ error: 'Student not found' });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
};
