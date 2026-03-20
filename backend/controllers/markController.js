const Mark = require('../models/Mark');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const { isStudentEligibleForSubject } = require('../utils/yearUtils');

function parsePositiveInt(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

function parseNullablePositiveInt(value) {
  if (value === null || value === undefined || value === '') return null;
  return parsePositiveInt(value);
}

function parseMark(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const intValue = Math.trunc(num);
  if (intValue < 0 || intValue > 100) return null;
  return intValue;
}

function getSessionUser(req) {
  return req.session?.user ?? null;
}

function isSubjectTeacher(user) {
  return user?.role === 'Subject Teacher';
}

async function getAllMarks(req, res, next) {
  try {
    const user = getSessionUser(req);
    const studentId = parseNullablePositiveInt(req.query.student_id);
    const subjectId = parseNullablePositiveInt(req.query.subject_id);

    if (isSubjectTeacher(user)) {
      if (!subjectId) {
        return res.status(400).json({ error: 'Subject_ID is required' });
      }
      const assigned = await Subject.isAssignedToTeacher(subjectId, user.teacher_id);
      if (!assigned) {
        return res.status(403).json({ error: 'Not allowed to access this subject' });
      }
    }

    const marks = await Mark.list({ student_id: studentId, subject_id: subjectId });
    return res.json(marks);
  } catch (err) {
    return next(err);
  }
}

async function upsertMark(req, res, next) {
  try {
    const user = getSessionUser(req);
    const studentId = parsePositiveInt(req.body?.student_id);
    const subjectId = parsePositiveInt(req.body?.subject_id);
    const markValue = parseMark(req.body?.mark);

    if (!studentId) return res.status(400).json({ error: 'Valid Student_ID is required' });
    if (!subjectId) return res.status(400).json({ error: 'Valid Subject_ID is required' });
    if (markValue === null) {
      return res.status(400).json({ error: 'Mark must be an integer between 0 and 100' });
    }

    if (isSubjectTeacher(user)) {
      const assigned = await Subject.isAssignedToTeacher(subjectId, user.teacher_id);
      if (!assigned) {
        return res.status(403).json({ error: 'Not allowed to record marks for this subject' });
      }
    }
    const [student, subject] = await Promise.all([
      Student.getById(studentId),
      Subject.getById(subjectId)
    ]);
    if (!student || !subject) {
      return res.status(400).json({ error: 'Student or Subject does not exist' });
    }
    if (!isStudentEligibleForSubject(student.academic_year, subject.start_year)) {
      return res.status(400).json({
        error: `This subject is only for students registered in ${subject.start_year} and above`
      });
    }

    const teacherId = isSubjectTeacher(user) ? user.teacher_id : null;

    const saved = await Mark.upsert({
      student_id: studentId,
      subject_id: subjectId,
      teacher_id: teacherId,
      mark: markValue
    });

    return res.status(201).json(saved);
  } catch (err) {
    if (err?.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Student or Subject does not exist' });
    }
    if (err?.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
      return res.status(400).json({ error: 'Mark must be between 0 and 100' });
    }
    return next(err);
  }
}

async function bulkUpsertMarks(req, res, next) {
  try {
    const user = getSessionUser(req);
    const studentId = parsePositiveInt(req.body?.student_id);
    const subjectId = parsePositiveInt(req.body?.subject_id);
    const marks = Array.isArray(req.body?.marks) ? req.body.marks : null;

    if (!marks || marks.length === 0) {
      return res.status(400).json({ error: 'marks[] is required' });
    }

    const normalized = [];

    if (subjectId && !studentId) {
      if (isSubjectTeacher(user)) {
        const assigned = await Subject.isAssignedToTeacher(subjectId, user.teacher_id);
        if (!assigned) {
          return res.status(403).json({ error: 'Not allowed to record marks for this subject' });
        }
      }
      const subject = await Subject.getById(subjectId);
      if (!subject) {
        return res.status(400).json({ error: 'Student or Subject does not exist' });
      }

      const uniqueStudentIds = new Set();
      for (const item of marks) {
        const sId = parsePositiveInt(item?.student_id);
        const markValue = parseMark(item?.mark);

        if (!sId) {
          return res.status(400).json({ error: 'Each mark must include a valid Student_ID' });
        }
        if (markValue === null) {
          return res
            .status(400)
            .json({ error: 'Each mark must be an integer between 0 and 100' });
        }

        uniqueStudentIds.add(sId);
        normalized.push({ student_id: sId, mark: markValue });
      }
      if (subject.start_year !== null && subject.start_year !== undefined) {
        const students = await Student.getByIds([...uniqueStudentIds]);
        if (students.length !== uniqueStudentIds.size) {
          return res.status(400).json({ error: 'Student or Subject does not exist' });
        }
        const blocked = students.filter(
          (student) => !isStudentEligibleForSubject(student.academic_year, subject.start_year)
        );
        if (blocked.length > 0) {
          return res.status(400).json({
            error: `This subject is only for students registered in ${subject.start_year} and above`
          });
        }
      }

      const teacherId = isSubjectTeacher(user) ? user.teacher_id : null;
      const saved = await Mark.bulkUpsertBySubject({
        subject_id: subjectId,
        teacher_id: teacherId,
        marks: normalized
      });
      return res.status(200).json(saved);
    }

    if (studentId && !subjectId) {
      if (isSubjectTeacher(user)) {
        return res.status(403).json({ error: 'Not allowed to bulk-save by student' });
      }
      const student = await Student.getById(studentId);
      if (!student) {
        return res.status(400).json({ error: 'Student or Subject does not exist' });
      }

      const uniqueSubjectIds = new Set();

      for (const item of marks) {
        const subjectIdItem = parsePositiveInt(item?.subject_id);
        const markValue = parseMark(item?.mark);

        if (!subjectIdItem) {
          return res.status(400).json({ error: 'Each mark must include a valid Subject_ID' });
        }
        if (markValue === null) {
          return res
            .status(400)
            .json({ error: 'Each mark must be an integer between 0 and 100' });
        }

        uniqueSubjectIds.add(subjectIdItem);
        normalized.push({ subject_id: subjectIdItem, mark: markValue });
      }

      const subjects = await Subject.listByIds([...uniqueSubjectIds]);
      if (subjects.length !== uniqueSubjectIds.size) {
        return res.status(400).json({ error: 'Student or Subject does not exist' });
      }

      const blocked = subjects.filter(
        (subject) => !isStudentEligibleForSubject(student.academic_year, subject.start_year)
      );
      if (blocked.length > 0) {
        const firstSubject = blocked[0];
        return res.status(400).json({
          error: `Subject "${firstSubject.subject_name}" is only for students registered in ${firstSubject.start_year} and above`
        });
      }

      const saved = await Mark.bulkUpsert({ student_id: studentId, marks: normalized });
      return res.status(200).json(saved);
    }

    return res.status(400).json({
      error: 'Provide either subject_id (for class entry) or student_id (for per-student entry)'
    });
  } catch (err) {
    if (err?.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Student or Subject does not exist' });
    }
    if (err?.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
      return res.status(400).json({ error: 'Mark must be between 0 and 100' });
    }
    return next(err);
  }
}

async function updateMark(req, res, next) {
  try {
    const markId = parsePositiveInt(req.params.id);
    if (!markId) return res.status(400).json({ error: 'Invalid mark id' });

    const markValue = parseMark(req.body?.mark);
    if (markValue === null) {
      return res.status(400).json({ error: 'Mark must be an integer between 0 and 100' });
    }

    const affected = await Mark.update(markId, markValue);
    if (!affected) return res.status(404).json({ error: 'Mark not found' });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function deleteMark(req, res, next) {
  try {
    const markId = parsePositiveInt(req.params.id);
    if (!markId) return res.status(400).json({ error: 'Invalid mark id' });

    const affected = await Mark.remove(markId);
    if (!affected) return res.status(404).json({ error: 'Mark not found' });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAllMarks,
  upsertMark,
  bulkUpsertMarks,
  updateMark,
  deleteMark
};
