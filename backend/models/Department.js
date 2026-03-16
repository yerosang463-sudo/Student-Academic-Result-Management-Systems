const pool = require('../config/db');

async function list() {
  const [rows] = await pool.execute(
    `SELECT department_id, department_name
     FROM departments
     ORDER BY department_name ASC`
  );
  return rows;
}

async function getById(departmentId) {
  const [rows] = await pool.execute(
    `SELECT department_id, department_name
     FROM departments
     WHERE department_id = ?`,
    [departmentId]
  );
  return rows[0] ?? null;
}

async function create({ department_name }) {
  const [result] = await pool.execute(
    `INSERT INTO departments (department_name)
     VALUES (?)`,
    [department_name]
  );
  return result.insertId;
}

async function update(departmentId, { department_name }) {
  const [result] = await pool.execute(
    `UPDATE departments
     SET department_name = ?
     WHERE department_id = ?`,
    [department_name, departmentId]
  );
  return result.affectedRows;
}

async function remove(departmentId) {
  const [result] = await pool.execute(`DELETE FROM departments WHERE department_id = ?`, [
    departmentId
  ]);
  return result.affectedRows;
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove
};
