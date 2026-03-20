const pool = require('../config/db');

async function list({ grade = null, academic_year = null, semester = null } = {}) {
  const where = [];
  const params = [];

  if (grade) {
    where.push('grade = ?');
    params.push(grade);
  }
  if (academic_year) {
    where.push('academic_year = ?');
    params.push(academic_year);
  }
  if (semester) {
    where.push('semester = ?');
    params.push(semester);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT student_id, student_name, gender, grade, academic_year, semester
     FROM students
     ${whereSql}
     ORDER BY student_id DESC`,
    params
  );
  return rows;
}

async function getById(studentId) {
  const [rows] = await pool.execute(
    `SELECT student_id, student_name, gender, grade, academic_year, semester
     FROM students
     WHERE student_id = ?`,
    [studentId]
  );
  return rows[0] ?? null;
}

async function getByIds(studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) return [];

  const placeholders = studentIds.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT student_id, student_name, gender, grade, academic_year, semester
     FROM students
     WHERE student_id IN (${placeholders})`,
    studentIds
  );
  return rows;
}

async function create(student) {
  const [result] = await pool.execute(
    `INSERT INTO students (student_name, gender, grade, academic_year, semester)
     VALUES (?, ?, ?, ?, ?)`,
    [
      student.student_name,
      student.gender,
      student.grade,
      student.academic_year,
      student.semester
    ]
  );
  return result.insertId;
}

async function update(studentId, student) {
  const [result] = await pool.execute(
    `UPDATE students
     SET student_name = ?, gender = ?, grade = ?, academic_year = ?, semester = ?
     WHERE student_id = ?`,
    [
      student.student_name,
      student.gender,
      student.grade,
      student.academic_year,
      student.semester,
      studentId
    ]
  );
  return result.affectedRows;
}

async function remove(studentId) {
  const [result] = await pool.execute(`DELETE FROM students WHERE student_id = ?`, [
    studentId
  ]);
  return result.affectedRows;
}

module.exports = {
  list,
  getById,
  getByIds,
  create,
  update,
  remove
};
