const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const { normalizeSubjectStartYear } = require('../utils/yearUtils');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseNullablePositiveInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

function parsePositiveInt(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

async function getAllSubjects(req, res, next) {
  try {
    const user = req.session?.user ?? null;
    const teacherId =
      user && user.role === 'Subject Teacher' && Number(user.teacher_id) > 0
        ? Number(user.teacher_id)
        : null;
    const subjects = await Subject.list({ teacher_id: teacherId });
    return res.json(subjects);
  } catch (err) {
    return next(err);
  }
}

async function createSubject(req, res, next) {
  try {
    const { subject_name, department_id, teacher_id, total_mark, start_year } = req.body ?? {};

    if (!isNonEmptyString(subject_name)) {
      return res.status(400).json({ error: 'Subject_Name is required' });
    }

    const deptId = parsePositiveInt(department_id);
    if (!deptId) {
      return res.status(400).json({ error: 'Department is required' });
    }
    const teacherId = parseNullablePositiveInt(teacher_id);

    const markNum = total_mark === undefined || total_mark === '' ? 100 : Number(total_mark);
    if (!Number.isFinite(markNum) || markNum !== 100) {
      return res.status(400).json({ error: 'Total mark must be exactly 100' });
    }
    const normalizedStartYear = normalizeSubjectStartYear(start_year);
    if (!normalizedStartYear.ok) {
      return res
        .status(400)
        .json({ error: 'Start year must be a 4-digit year between 1900 and 2999' });
    }

    if (teacherId) {
      const teacher = await Teacher.getById(teacherId);
      if (!teacher) {
        return res.status(400).json({ error: 'Teacher not found' });
      }
      if (teacher.role !== 'Subject Teacher') {
        return res.status(400).json({
          error: 'Only Subject Teachers can be assigned to a subject'
        });
      }
      if (teacher.department_id !== deptId) {
        return res.status(400).json({
          error: 'Teacher must belong to the same department as the subject'
        });
      }
    }

    const subjectId = await Subject.create({
      subject_name: subject_name.trim(),
      department_id: deptId,
      teacher_id: teacherId,
      start_year: normalizedStartYear.value,
      total_mark: 100
    });

    const subject = await Subject.getById(subjectId);
    return res.status(201).json(subject);
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Subject name already exists' });
    }
    if (err?.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Department or Teacher does not exist' });
    }
    return next(err);
  }
}

async function updateSubject(req, res, next) {
  try {
    const subjectId = parsePositiveInt(req.params.id);
    if (!subjectId) return res.status(400).json({ error: 'Invalid subject id' });

    const { subject_name, department_id, teacher_id, total_mark, start_year } = req.body ?? {};

    if (!isNonEmptyString(subject_name)) {
      return res.status(400).json({ error: 'Subject_Name is required' });
    }

    const deptId = parsePositiveInt(department_id);
    if (!deptId) {
      return res.status(400).json({ error: 'Department is required' });
    }
    const teacherId = parseNullablePositiveInt(teacher_id);

    const markNum = total_mark === undefined || total_mark === '' ? 100 : Number(total_mark);
    if (!Number.isFinite(markNum) || markNum !== 100) {
      return res.status(400).json({ error: 'Total mark must be exactly 100' });
    }
    const normalizedStartYear = normalizeSubjectStartYear(start_year);
    if (!normalizedStartYear.ok) {
      return res
        .status(400)
        .json({ error: 'Start year must be a 4-digit year between 1900 and 2999' });
    }

    if (teacherId) {
      const teacher = await Teacher.getById(teacherId);
      if (!teacher) {
        return res.status(400).json({ error: 'Teacher not found' });
      }
      if (teacher.role !== 'Subject Teacher') {
        return res.status(400).json({
          error: 'Only Subject Teachers can be assigned to a subject'
        });
      }
      if (teacher.department_id !== deptId) {
        return res.status(400).json({
          error: 'Teacher must belong to the same department as the subject'
        });
      }
    }

    const affected = await Subject.update(subjectId, {
      subject_name: subject_name.trim(),
      department_id: deptId,
      teacher_id: teacherId,
      start_year: normalizedStartYear.value,
      total_mark: 100
    });

    if (!affected) return res.status(404).json({ error: 'Subject not found' });
    const subject = await Subject.getById(subjectId);
    return res.json(subject);
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Subject name already exists' });
    }
    if (err?.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Department or Teacher does not exist' });
    }
    return next(err);
  }
}

async function deleteSubject(req, res, next) {
  try {
    const subjectId = parsePositiveInt(req.params.id);
    if (!subjectId) return res.status(400).json({ error: 'Invalid subject id' });

    const affected = await Subject.remove(subjectId);
    if (!affected) return res.status(404).json({ error: 'Subject not found' });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject
};
