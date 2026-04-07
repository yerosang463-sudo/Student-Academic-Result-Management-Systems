-- Other MySQL logic extracted from backend JavaScript code.
-- This file contains auth, validation, report, bootstrap, and helper queries
-- that are not plain CRUD page operations.
-- Prepared statement placeholders (?) are preserved exactly as used by mysql2.

-- =========================================================
-- AUTH BOOTSTRAP
-- Source: backend/controllers/authController.js
-- =========================================================

-- Ensure admins table exists
CREATE TABLE IF NOT EXISTS admins (
  admin_id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_id),
  UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB;

-- Check whether any admin already exists
SELECT COUNT(*) AS cnt
FROM admins;

-- Insert default admin if admins table is empty
INSERT INTO admins (username, password_hash)
VALUES (?, ?);

-- Add sample teacher usernames and passwords when missing
UPDATE teachers
SET username = ?, password_hash = COALESCE(password_hash, ?)
WHERE teacher_name = ? AND (username IS NULL OR username = '');

-- =========================================================
-- AUTH LOOKUPS
-- Source: backend/controllers/authController.js
-- =========================================================

-- Find admin by username during login
SELECT admin_id, username, password_hash
FROM admins
WHERE username = ?;

-- Find teacher by username during login
SELECT teacher_id, teacher_name, role, username, password_hash, assigned_class, department_id
FROM teachers
WHERE username = ?;

-- =========================================================
-- SUPPORTING MODEL QUERIES
-- Sources: backend/models/Student.js, Teacher.js, Subject.js
-- =========================================================

-- Get multiple students by IDs
-- The IN placeholder list (?, ?, ...) is generated from the number of student IDs passed in.
SELECT student_id, student_name, gender, grade, academic_year, semester
FROM students
WHERE student_id IN (?, ?, ...);

-- Find teacher by username
SELECT teacher_id, teacher_name, department_id, assigned_class, role, username, password_hash
FROM teachers
WHERE username = ?;

-- Check whether another homeroom teacher already owns the same class
SELECT teacher_id, teacher_name, assigned_class
FROM teachers
WHERE role = 'Homeroom Teacher'
  AND assigned_class = ?;

-- When editing an existing teacher, this extra condition is appended:
-- AND teacher_id <> ?

-- Get multiple subjects by IDs
-- The IN placeholder list (?, ?, ...) is generated from the number of subject IDs passed in.
SELECT subject_id, subject_name, total_mark, department_id, teacher_id, start_year
FROM subjects
WHERE subject_id IN (?, ?, ...);

-- Verify that a subject belongs to a teacher
SELECT subject_id
FROM subjects
WHERE subject_id = ? AND teacher_id = ?;

-- =========================================================
-- REPORT QUERIES
-- Source: backend/controllers/reportController.js
-- =========================================================

-- Load all subjects for report building
SELECT subject_id, subject_name, total_mark, start_year
FROM subjects
ORDER BY subject_id ASC;

-- Load students for report building
-- If a homeroom teacher has a class filter, WHERE grade = ? is added.
SELECT student_id, student_name, gender, grade, academic_year, semester
FROM students
-- WHERE grade = ?
ORDER BY student_id ASC;

-- Load all marks for report building
SELECT student_id, subject_id, mark
FROM marks;

-- Load homeroom teachers for report building
SELECT teacher_id, teacher_name, assigned_class
FROM teachers
WHERE role = 'Homeroom Teacher';

-- Special case in reports endpoint:
-- when the logged-in homeroom teacher has no assigned class,
-- subjects are still loaded and an empty reports array is returned.
SELECT subject_id, subject_name, total_mark, start_year
FROM subjects
ORDER BY subject_id ASC;
