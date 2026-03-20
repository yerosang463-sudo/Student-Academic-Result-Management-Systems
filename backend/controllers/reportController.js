const pool = require('../config/db');
const { isStudentEligibleForSubject } = require('../utils/yearUtils');

function parsePositiveInt(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

function computeStatus({ total, totalOutOf, hasMissing, passPercent }) {
  if (hasMissing) return 'FAIL';
  if (!Number.isFinite(totalOutOf) || totalOutOf <= 0) return 'FAIL';
  const threshold = (totalOutOf * passPercent) / 100;
  return total >= threshold ? 'PASS' : 'FAIL';
}

function applyDenseRank(reports) {
  const sorted = [...reports].sort((a, b) => b.total - a.total);
  let rank = 0;
  let lastTotal = null;
  for (const report of sorted) {
    if (lastTotal === null || report.total !== lastTotal) {
      rank += 1;
      lastTotal = report.total;
    }
    report.rank = rank;
  }
  return sorted;
}

async function buildReports({ classFilter = null } = {}) {
  const [subjects] = await pool.execute(
    `SELECT subject_id, subject_name, total_mark, start_year
     FROM subjects
     ORDER BY subject_id ASC`
  );

  const studentWhere = classFilter ? 'WHERE grade = ?' : '';
  const studentParams = classFilter ? [classFilter] : [];
  const [students] = await pool.execute(
    `SELECT student_id, student_name, gender, grade, academic_year, semester
     FROM students
     ${studentWhere}
     ORDER BY student_id ASC`,
    studentParams
  );
  const [marks] = await pool.execute(`SELECT student_id, subject_id, mark FROM marks`);
  const [homerooms] = await pool.execute(
    `SELECT teacher_id, teacher_name, assigned_class
     FROM teachers
     WHERE role = 'Homeroom Teacher'`
  );

  const subjectsById = new Map(subjects.map((s) => [s.subject_id, s]));
  const studentMarks = new Map(); // student_id -> Map(subject_id -> mark)
  for (const m of marks) {
    if (!studentMarks.has(m.student_id)) {
      studentMarks.set(m.student_id, new Map());
    }
    studentMarks.get(m.student_id).set(m.subject_id, m.mark);
  }

  const passPercent = 50;
  const homeroomByClass = new Map(
    homerooms
      .filter((t) => t.assigned_class)
      .map((t) => [String(t.assigned_class).trim(), t])
  );

  const reports = students.map((st) => {
    const marksMap = studentMarks.get(st.student_id) ?? new Map();
    const subjectMarks = subjects.map((sub) => {
      const isEligible = isStudentEligibleForSubject(st.academic_year, sub.start_year);
      if (!isEligible) {
        return {
          subject_id: sub.subject_id,
          subject_name: sub.subject_name,
          total_mark: sub.total_mark,
          start_year: sub.start_year ?? null,
          is_eligible: false,
          mark: null
        };
      }

      const mark = marksMap.has(sub.subject_id) ? marksMap.get(sub.subject_id) : null;
      return {
        subject_id: sub.subject_id,
        subject_name: sub.subject_name,
        total_mark: sub.total_mark,
        start_year: sub.start_year ?? null,
        is_eligible: true,
        mark
      };
    });

    const eligibleSubjects = subjectMarks.filter((item) => item.is_eligible);
    const totalOutOf = eligibleSubjects.reduce((sum, item) => sum + Number(item.total_mark || 0), 0);
    const total = eligibleSubjects.reduce((sum, item) => sum + (item.mark ?? 0), 0);
    const average = eligibleSubjects.length > 0 ? total / eligibleSubjects.length : 0;
    const hasMissing = eligibleSubjects.some(
      (item) => item.mark === null || item.mark === undefined
    );
    const status = computeStatus({ total, totalOutOf, hasMissing, passPercent });
    const classKey = st.grade ? String(st.grade).trim() : '';
    const homeroomTeacher = classKey ? homeroomByClass.get(classKey) ?? null : null;

    return {
      student: st,
      subjectMarks,
      total,
      total_out_of: totalOutOf,
      average: Number(average.toFixed(2)),
      status,
      homeroom_teacher: homeroomTeacher
    };
  });

  const ranked = applyDenseRank(reports);
  return { subjects: [...subjectsById.values()], reports: ranked };
}

async function getReports(req, res, next) {
  try {
    const user = req.session?.user ?? null;
    const classFilter =
      user?.role === 'Homeroom Teacher' ? (user.assigned_class ?? null) : null;

    if (user?.role === 'Homeroom Teacher' && !classFilter) {
      const [subjects] = await pool.execute(
        `SELECT subject_id, subject_name, total_mark, start_year
         FROM subjects
         ORDER BY subject_id ASC`
      );
      return res.json({ subjects, reports: [] });
    }

    const data = await buildReports({ classFilter });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function getReportByStudent(req, res, next) {
  try {
    const studentId = parsePositiveInt(req.params.studentId);
    if (!studentId) return res.status(400).json({ error: 'Invalid student id' });

    const user = req.session?.user ?? null;
    const classFilter =
      user?.role === 'Homeroom Teacher' ? (user.assigned_class ?? null) : null;

    if (user?.role === 'Homeroom Teacher' && !classFilter) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const data = await buildReports({ classFilter });
    const report = data.reports.find((r) => r.student.student_id === studentId);
    if (!report) return res.status(404).json({ error: 'Student not found' });

    return res.json(report);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getReports,
  getReportByStudent
};
