const pool = require('../config/db');

async function list({ teacher_id = null } = {}) {
  const where = [];
  const params = [];

  if (teacher_id) {
    where.push('s.teacher_id = ?');
    params.push(teacher_id);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT
        s.subject_id,
        s.subject_name,
        s.total_mark,
        s.department_id,
        d.department_name,
        s.teacher_id,
        t.teacher_name,
        s.start_year
     FROM subjects s
     LEFT JOIN departments d ON d.department_id = s.department_id
     LEFT JOIN teachers t ON t.teacher_id = s.teacher_id
     ${whereSql}
     ORDER BY s.subject_id DESC`,
    params
  );
  return rows;
}

async function getById(subjectId) {
  const [rows] = await pool.execute(
    `SELECT subject_id, subject_name, total_mark, department_id, teacher_id, start_year
     FROM subjects
     WHERE subject_id = ?`,
    [subjectId]
  );
  return rows[0] ?? null;
}

async function listByIds(subjectIds) {
  if (!Array.isArray(subjectIds) || subjectIds.length === 0) return [];

  const placeholders = subjectIds.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT subject_id, subject_name, total_mark, department_id, teacher_id, start_year
     FROM subjects
     WHERE subject_id IN (${placeholders})`,
    subjectIds
  );
  return rows;
}

async function isAssignedToTeacher(subjectId, teacherId) {
  const [rows] = await pool.execute(
    `SELECT subject_id
     FROM subjects
     WHERE subject_id = ? AND teacher_id = ?`,
    [subjectId, teacherId]
  );
  return rows.length > 0;
}

async function create(subject) {
  const [result] = await pool.execute(
    `INSERT INTO subjects (subject_name, department_id, teacher_id, start_year, total_mark)
     VALUES (?, ?, ?, ?, ?)`,
    [
      subject.subject_name,
      subject.department_id ?? null,
      subject.teacher_id ?? null,
      subject.start_year ?? null,
      subject.total_mark ?? 100
    ]
  );
  return result.insertId;
}

async function update(subjectId, subject) {
  const [result] = await pool.execute(
    `UPDATE subjects
     SET subject_name = ?, department_id = ?, teacher_id = ?, start_year = ?, total_mark = ?
     WHERE subject_id = ?`,
    [
      subject.subject_name,
      subject.department_id ?? null,
      subject.teacher_id ?? null,
      subject.start_year ?? null,
      subject.total_mark ?? 100,
      subjectId
    ]
  );
  return result.affectedRows;
}

async function remove(subjectId) {
  const [result] = await pool.execute(`DELETE FROM subjects WHERE subject_id = ?`, [
    subjectId
  ]);
  return result.affectedRows;
}

module.exports = {
  list,
  getById,
  listByIds,
  isAssignedToTeacher,
  create,
  update,
  remove
};
