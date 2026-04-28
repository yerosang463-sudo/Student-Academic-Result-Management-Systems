const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const SAMPLE_TEACHERS = [
  { teacher_name: 'Mr. Genet', username: 'genet' },
  { teacher_name: 'Ms. Alemu', username: 'alemu' },
  { teacher_name: 'Mr. Tola', username: 'tola' },
  { teacher_name: 'Ms. OLyad', username: 'olyad' },
  { teacher_name: 'Mr. Alemayehu', username: 'alemayehu' },
  { teacher_name: 'Addisu', username: 'addisu' }
];

async function addSampleTeachers() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_academic_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Adding sample teachers...');
    const passwordHash = await bcrypt.hash('teacher123', 10);

    for (const teacher of SAMPLE_TEACHERS) {
      // Check if teacher exists
      const [existing] = await pool.execute(
        'SELECT teacher_id FROM teachers WHERE teacher_name = ?',
        [teacher.teacher_name]
      );

      if (existing.length === 0) {
        // Insert new teacher
        await pool.execute(
          `INSERT INTO teachers (teacher_name, username, password_hash, department_id, role)
           VALUES (?, ?, ?, 1, 'Subject Teacher')`,
          [teacher.teacher_name, teacher.username, passwordHash]
        );
        console.log(`Created teacher: ${teacher.teacher_name} (${teacher.username})`);
      } else {
        // Update existing teacher
        await pool.execute(
          `UPDATE teachers 
           SET username = ?, password_hash = ? 
           WHERE teacher_name = ?`,
          [teacher.username, passwordHash, teacher.teacher_name]
        );
        console.log(`Updated teacher: ${teacher.teacher_name} (${teacher.username})`);
      }
    }

    console.log('Sample teachers added successfully!');
    console.log('Login credentials:');
    SAMPLE_TEACHERS.forEach(t => {
      console.log(`  ${t.username} / teacher123`);
    });
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addSampleTeachers();
