USE student_academic_management;

-- =========================================================
-- CRUD REFERENCE FOR THE CURRENT RUNNING APP
-- =========================================================
-- This file is aligned with:
--   1. backend/sql/create_tables.sql
--   2. the current backend controllers/models
--   3. the current frontend UI flows
--
-- Notes:
-- - admins and teachers store bcrypt hashes, not plain-text passwords.
-- - marks are saved with UPSERT logic because the UI "Save Marks" action
--   creates a row if it does not exist, or updates it if it already exists.
-- - deleting students or subjects cascades to marks.
-- - deleting teachers sets related marks.teacher_id and subjects.teacher_id to NULL.
-- - deleting departments is blocked while teachers or subjects still reference them.

SET @admin_hash = '$2b$10$replace_this_with_a_real_bcrypt_hash';
SET @teacher_hash = '$2b$10$replace_this_with_a_real_bcrypt_hash';


-- =========================================================
-- 1. DEPARTMENTS
-- Used from the Subject Management page
-- =========================================================

-- CREATE: add a new department
INSERT INTO departments (department_name)
VALUES ('ICT');

-- READ: list departments for the dropdown
SELECT department_id, department_name
FROM departments
ORDER BY department_name ASC;

-- READ: department details with usage counts
SELECT
  d.department_id,
  d.department_name,
  COUNT(DISTINCT t.teacher_id) AS teacher_count,
  COUNT(DISTINCT s.subject_id) AS subject_count
FROM departments d
LEFT JOIN teachers t ON t.department_id = d.department_id
LEFT JOIN subjects s ON s.department_id = d.department_id
GROUP BY d.department_id, d.department_name
ORDER BY d.department_name ASC;

-- READ by ID
SELECT department_id, department_name
FROM departments
WHERE department_id = 1;

-- UPDATE: rename a department
UPDATE departments
SET department_name = 'Computer Science'
WHERE department_id = 1;

-- DELETE PREVIEW: see whether the department is still in use
SELECT
  d.department_id,
  d.department_name,
  COUNT(DISTINCT t.teacher_id) AS teacher_count,
  COUNT(DISTINCT s.subject_id) AS subject_count
FROM departments d
LEFT JOIN teachers t ON t.department_id = d.department_id
LEFT JOIN subjects s ON s.department_id = d.department_id
WHERE d.department_id = 1
GROUP BY d.department_id, d.department_name;

-- DELETE: only delete a department when no teacher and no subject still use it
DELETE d
FROM departments d
WHERE d.department_id = 1
  AND NOT EXISTS (
    SELECT 1
    FROM teachers t
    WHERE t.department_id = d.department_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM subjects s
    WHERE s.department_id = d.department_id
  );


-- =========================================================
-- 2. ADMINS
-- System table, not managed from the main UI pages
-- =========================================================

-- CREATE: add another admin account
INSERT INTO admins (username, password_hash)
VALUES ('admin2', @admin_hash);

-- READ: login lookup by username
SELECT admin_id, username, password_hash
FROM admins
WHERE username = 'admin';

-- READ: list all admin usernames
SELECT admin_id, username, created_at
FROM admins
ORDER BY admin_id ASC;

-- UPDATE: rotate an admin password hash
UPDATE admins
SET password_hash = @admin_hash
WHERE username = 'admin2';

-- DELETE: remove an extra admin account if no longer needed
DELETE FROM admins
WHERE admin_id = 2
  AND username <> 'admin';


-- =========================================================
-- 3. STUDENTS
-- Used from Student Management, Marks, and Reports
-- =========================================================

-- CREATE: add a student exactly like the Add Student modal
INSERT INTO students (student_name, gender, grade, academic_year, semester)
VALUES ('Abel Tesfaye', 'Male', '9A', '2025/2026', '1');

-- READ: student table in the UI
SELECT student_id, student_name, gender, grade, academic_year, semester
FROM students
ORDER BY student_id DESC;

-- READ: one student by ID
SELECT student_id, student_name, gender, grade, academic_year, semester
FROM students
WHERE student_id = 1;

-- READ: filter students by grade
SELECT student_id, student_name, gender, grade, academic_year, semester
FROM students
WHERE grade = '9A'
ORDER BY student_id DESC;

-- READ: filter students by academic year
SELECT student_id, student_name, gender, grade, academic_year, semester
FROM students
WHERE academic_year = '2025/2026'
ORDER BY student_id DESC;

-- READ: filter students by semester
SELECT student_id, student_name, gender, grade, academic_year, semester
FROM students
WHERE semester = '1'
ORDER BY student_id DESC;

-- READ: filter students by grade + academic year + semester
SELECT student_id, student_name, gender, grade, academic_year, semester
FROM students
WHERE grade = '9A'
  AND academic_year = '2025/2026'
  AND semester = '1'
ORDER BY student_id DESC;

-- READ: fetch several students by ID list (used by bulk mark logic)
SELECT student_id, student_name, gender, grade, academic_year, semester
FROM students
WHERE student_id IN (1, 2, 3);

-- READ: class roster style view used before marks/report processing
SELECT student_id, student_name, gender, grade, academic_year, semester
FROM students
WHERE grade = '9A'
  AND semester = '1'
ORDER BY student_name ASC;

-- UPDATE: full edit from the Student Management modal
UPDATE students
SET student_name = 'Abel T.',
    gender = 'Male',
    grade = '9A',
    academic_year = '2025/2026',
    semester = '2'
WHERE student_id = 1;

-- UPDATE: promote a student to the next academic year/class
UPDATE students
SET grade = '10A',
    academic_year = '2026/2027',
    semester = '1'
WHERE student_id = 1;

-- UPDATE: move all students in one class/semester to a new semester
UPDATE students
SET semester = '2'
WHERE grade = '9A'
  AND academic_year = '2025/2026'
  AND semester = '1';

-- DELETE PREVIEW: see how many marks will be removed with the student
SELECT
  s.student_id,
  s.student_name,
  COUNT(m.mark_id) AS marks_to_be_deleted
FROM students s
LEFT JOIN marks m ON m.student_id = s.student_id
WHERE s.student_id = 1
GROUP BY s.student_id, s.student_name;

-- DELETE: remove a student; related marks are deleted automatically
DELETE FROM students
WHERE student_id = 1;


-- =========================================================
-- 4. TEACHERS
-- Used from Teacher Management, Subject assignment, Login, Reports
-- =========================================================

-- CREATE: add a subject teacher
INSERT INTO teachers (
  teacher_name,
  department_id,
  assigned_class,
  role,
  username,
  password_hash
)
VALUES (
  'Mr. Bekele',
  (SELECT department_id FROM departments WHERE department_name = 'Maths' LIMIT 1),
  NULL,
  'Subject Teacher',
  'bekele',
  @teacher_hash
);

-- CREATE: add a homeroom teacher for a class
INSERT INTO teachers (
  teacher_name,
  department_id,
  assigned_class,
  role,
  username,
  password_hash
)
VALUES (
  'Ms. Hana',
  (SELECT department_id FROM departments WHERE department_name = 'English' LIMIT 1),
  '9B',
  'Homeroom Teacher',
  'hana',
  @teacher_hash
);

-- READ: teacher table in the UI
SELECT
  t.teacher_id,
  t.teacher_name,
  t.department_id,
  d.department_name,
  t.assigned_class,
  t.role,
  t.username
FROM teachers t
LEFT JOIN departments d ON d.department_id = t.department_id
ORDER BY t.teacher_id DESC;

-- READ by ID
SELECT teacher_id, teacher_name, department_id, assigned_class, role, username
FROM teachers
WHERE teacher_id = 1;

-- READ: teacher login lookup
SELECT teacher_id, teacher_name, department_id, assigned_class, role, username, password_hash
FROM teachers
WHERE username = 'genet';

-- READ: subject-teacher dropdown for a selected department
SELECT teacher_id, teacher_name, department_id, role
FROM teachers
WHERE department_id = (SELECT department_id FROM departments WHERE department_name = 'Maths' LIMIT 1)
  AND role = 'Subject Teacher'
ORDER BY teacher_name ASC;

-- READ: check homeroom conflict before creating/updating a homeroom teacher
SELECT teacher_id, teacher_name, assigned_class
FROM teachers
WHERE role = 'Homeroom Teacher'
  AND assigned_class = '9B';

-- READ: same homeroom conflict check while editing an existing teacher
SELECT teacher_id, teacher_name, assigned_class
FROM teachers
WHERE role = 'Homeroom Teacher'
  AND assigned_class = '9B'
  AND teacher_id <> 5;

-- UPDATE: full edit while keeping the current password if no new hash is supplied
SET @new_teacher_hash = NULL;

UPDATE teachers
SET teacher_name = 'Mr. Bekele T.',
    department_id = (SELECT department_id FROM departments WHERE department_name = 'Maths' LIMIT 1),
    assigned_class = NULL,
    role = 'Subject Teacher',
    username = 'bekelet',
    password_hash = COALESCE(@new_teacher_hash, password_hash)
WHERE teacher_id = 1;

-- UPDATE: convert a subject teacher into a homeroom teacher only if the class is free
UPDATE teachers t
LEFT JOIN teachers conflict
  ON conflict.role = 'Homeroom Teacher'
 AND conflict.assigned_class = '10A'
 AND conflict.teacher_id <> t.teacher_id
SET t.role = 'Homeroom Teacher',
    t.assigned_class = '10A'
WHERE t.teacher_id = 1
  AND conflict.teacher_id IS NULL;

-- UPDATE: convert a homeroom teacher back to a subject teacher
UPDATE teachers
SET role = 'Subject Teacher',
    assigned_class = NULL
WHERE teacher_id = 1;

-- UPDATE: rotate a teacher password hash
UPDATE teachers
SET password_hash = @teacher_hash
WHERE username = 'bekelet';

-- DELETE PREVIEW: see which subjects and marks will become unassigned
SELECT
  t.teacher_id,
  t.teacher_name,
  COUNT(DISTINCT s.subject_id) AS subjects_that_will_be_unassigned,
  COUNT(DISTINCT m.mark_id) AS marks_that_will_lose_teacher_reference
FROM teachers t
LEFT JOIN subjects s ON s.teacher_id = t.teacher_id
LEFT JOIN marks m ON m.teacher_id = t.teacher_id
WHERE t.teacher_id = 1
GROUP BY t.teacher_id, t.teacher_name;

-- DELETE: remove a teacher account
-- Result:
--   subjects.teacher_id -> NULL
--   marks.teacher_id    -> NULL
DELETE FROM teachers
WHERE teacher_id = 1;


-- =========================================================
-- 5. SUBJECTS
-- Used from Subject Management, Marks, Reports
-- =========================================================

-- CREATE: add a subject without assigning a teacher yet
INSERT INTO subjects (subject_name, department_id, teacher_id, start_year, total_mark)
VALUES (
  'Civics',
  (SELECT department_id FROM departments WHERE department_name = 'English' LIMIT 1),
  NULL,
  NULL,
  100
);

-- CREATE: add a subject and assign a subject teacher from the same department
INSERT INTO subjects (subject_name, department_id, teacher_id, start_year, total_mark)
SELECT
  'Advanced Mathematics',
  d.department_id,
  t.teacher_id,
  2024,
  100
FROM departments d
JOIN teachers t ON t.department_id = d.department_id
WHERE d.department_name = 'Maths'
  AND t.username = 'genet'
  AND t.role = 'Subject Teacher'
LIMIT 1;

-- READ: subject table in the UI
SELECT
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
ORDER BY s.subject_id DESC;

-- READ by ID
SELECT subject_id, subject_name, total_mark, department_id, teacher_id, start_year
FROM subjects
WHERE subject_id = 1;

-- READ: all subjects assigned to one subject teacher
SELECT
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
WHERE s.teacher_id = 1
ORDER BY s.subject_id DESC;

-- READ: get several subjects by ID list (used by admin bulk mark logic)
SELECT subject_id, subject_name, total_mark, department_id, teacher_id, start_year
FROM subjects
WHERE subject_id IN (1, 2, 3);

-- READ: subjects that belong to one department
SELECT
  s.subject_id,
  s.subject_name,
  d.department_name,
  t.teacher_name,
  s.start_year,
  s.total_mark
FROM subjects s
LEFT JOIN departments d ON d.department_id = s.department_id
LEFT JOIN teachers t ON t.teacher_id = s.teacher_id
WHERE s.department_id = (SELECT department_id FROM departments WHERE department_name = 'Maths' LIMIT 1)
ORDER BY s.subject_name ASC;

-- READ: check whether a subject belongs to a teacher (used for subject-teacher authorization)
SELECT subject_id
FROM subjects
WHERE subject_id = 1
  AND teacher_id = 1;

-- READ: preview which students are eligible for a subject start year
SELECT
  st.student_id,
  st.student_name,
  st.academic_year,
  s.subject_name,
  s.start_year
FROM students st
CROSS JOIN subjects s
WHERE s.subject_id = 1
  AND (
    s.start_year IS NULL
    OR CAST(REGEXP_SUBSTR(st.academic_year, '[0-9]{4}') AS UNSIGNED) >= s.start_year
  )
ORDER BY st.student_name ASC;

-- UPDATE: full subject edit from the Subject Management modal
UPDATE subjects
SET subject_name = 'Advanced Maths',
    department_id = (SELECT department_id FROM departments WHERE department_name = 'Maths' LIMIT 1),
    teacher_id = NULL,
    start_year = 2024,
    total_mark = 100
WHERE subject_id = 1;

-- UPDATE: assign or reassign a subject teacher from the same department
UPDATE subjects s
JOIN teachers t ON t.teacher_id = 1
SET s.teacher_id = t.teacher_id
WHERE s.subject_id = 1
  AND t.role = 'Subject Teacher'
  AND t.department_id = s.department_id;

-- UPDATE: unassign a teacher from a subject
UPDATE subjects
SET teacher_id = NULL
WHERE subject_id = 1;

-- UPDATE: set or change the start year rule
UPDATE subjects
SET start_year = 2025
WHERE subject_id = 1;

-- DELETE PREVIEW: see how many marks will be removed with the subject
SELECT
  s.subject_id,
  s.subject_name,
  COUNT(m.mark_id) AS marks_to_be_deleted
FROM subjects s
LEFT JOIN marks m ON m.subject_id = s.subject_id
WHERE s.subject_id = 1
GROUP BY s.subject_id, s.subject_name;

-- DELETE: remove a subject; related marks are deleted automatically
DELETE FROM subjects
WHERE subject_id = 1;


-- =========================================================
-- 6. MARKS
-- Used from the Mark Entry page and report generation
-- =========================================================

-- READ: joined mark list with student / subject / teacher names
SELECT
  m.mark_id,
  m.student_id,
  st.student_name,
  m.subject_id,
  sb.subject_name,
  m.teacher_id,
  t.teacher_name,
  m.mark
FROM marks m
JOIN students st ON st.student_id = m.student_id
JOIN subjects sb ON sb.subject_id = m.subject_id
LEFT JOIN teachers t ON t.teacher_id = m.teacher_id
ORDER BY m.mark_id DESC;

-- READ: marks for one student
SELECT
  m.mark_id,
  m.student_id,
  st.student_name,
  m.subject_id,
  sb.subject_name,
  m.teacher_id,
  t.teacher_name,
  m.mark
FROM marks m
JOIN students st ON st.student_id = m.student_id
JOIN subjects sb ON sb.subject_id = m.subject_id
LEFT JOIN teachers t ON t.teacher_id = m.teacher_id
WHERE m.student_id = 1
ORDER BY sb.subject_name ASC;

-- READ: marks for one subject (used by the Mark Entry page)
SELECT
  m.mark_id,
  m.student_id,
  st.student_name,
  m.subject_id,
  sb.subject_name,
  m.teacher_id,
  t.teacher_name,
  m.mark
FROM marks m
JOIN students st ON st.student_id = m.student_id
JOIN subjects sb ON sb.subject_id = m.subject_id
LEFT JOIN teachers t ON t.teacher_id = m.teacher_id
WHERE m.subject_id = 1
ORDER BY m.mark_id DESC;

-- READ: marks entered by one teacher
SELECT
  m.mark_id,
  m.student_id,
  st.student_name,
  m.subject_id,
  sb.subject_name,
  m.teacher_id,
  t.teacher_name,
  m.mark
FROM marks m
JOIN students st ON st.student_id = m.student_id
JOIN subjects sb ON sb.subject_id = m.subject_id
LEFT JOIN teachers t ON t.teacher_id = m.teacher_id
WHERE m.teacher_id = 1
ORDER BY m.mark_id DESC;

-- READ: check whether a subject teacher is allowed to save marks for a subject
SELECT subject_id
FROM subjects
WHERE subject_id = 1
  AND teacher_id = 1;

-- READ: check whether a student is eligible for a subject before saving the mark
SELECT
  st.student_id,
  st.student_name,
  st.academic_year,
  sb.subject_id,
  sb.subject_name,
  sb.start_year
FROM students st
JOIN subjects sb ON sb.subject_id = 1
WHERE st.student_id = 1
  AND (
    sb.start_year IS NULL
    OR CAST(REGEXP_SUBSTR(st.academic_year, '[0-9]{4}') AS UNSIGNED) >= sb.start_year
  );

-- CREATE/UPDATE: save one mark exactly like POST /api/marks
INSERT INTO marks (student_id, subject_id, teacher_id, mark)
VALUES (1, 1, 1, 88)
ON DUPLICATE KEY UPDATE
  mark = VALUES(mark),
  teacher_id = VALUES(teacher_id),
  updated_at = CURRENT_TIMESTAMP;

-- CREATE/UPDATE: admin save for one mark without teacher ownership
INSERT INTO marks (student_id, subject_id, teacher_id, mark)
VALUES (2, 1, NULL, 74)
ON DUPLICATE KEY UPDATE
  mark = VALUES(mark),
  teacher_id = VALUES(teacher_id),
  updated_at = CURRENT_TIMESTAMP;

-- CREATE/UPDATE: bulk save by subject (used by the Mark Entry page)
START TRANSACTION;

INSERT INTO marks (student_id, subject_id, teacher_id, mark)
VALUES (1, 1, 1, 85)
ON DUPLICATE KEY UPDATE
  mark = VALUES(mark),
  teacher_id = VALUES(teacher_id),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO marks (student_id, subject_id, teacher_id, mark)
VALUES (2, 1, 1, 91)
ON DUPLICATE KEY UPDATE
  mark = VALUES(mark),
  teacher_id = VALUES(teacher_id),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO marks (student_id, subject_id, teacher_id, mark)
VALUES (3, 1, 1, 67)
ON DUPLICATE KEY UPDATE
  mark = VALUES(mark),
  teacher_id = VALUES(teacher_id),
  updated_at = CURRENT_TIMESTAMP;

COMMIT;

-- CREATE/UPDATE: bulk save by student (admin-side backend logic)
START TRANSACTION;

INSERT INTO marks (student_id, subject_id, teacher_id, mark)
VALUES (1, 1, NULL, 80)
ON DUPLICATE KEY UPDATE
  mark = VALUES(mark),
  teacher_id = VALUES(teacher_id),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO marks (student_id, subject_id, teacher_id, mark)
VALUES (1, 2, NULL, 72)
ON DUPLICATE KEY UPDATE
  mark = VALUES(mark),
  teacher_id = VALUES(teacher_id),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO marks (student_id, subject_id, teacher_id, mark)
VALUES (1, 3, NULL, 90)
ON DUPLICATE KEY UPDATE
  mark = VALUES(mark),
  teacher_id = VALUES(teacher_id),
  updated_at = CURRENT_TIMESTAMP;

COMMIT;

-- READ AFTER SAVE: return the saved mark row
SELECT mark_id, student_id, subject_id, teacher_id, mark
FROM marks
WHERE student_id = 1
  AND subject_id = 1;

-- READ AFTER BULK SAVE BY STUDENT
SELECT mark_id, student_id, subject_id, teacher_id, mark
FROM marks
WHERE student_id = 1;

-- READ AFTER BULK SAVE BY SUBJECT
SELECT mark_id, student_id, subject_id, teacher_id, mark
FROM marks
WHERE subject_id = 1;

-- UPDATE: admin edits one mark by mark_id
UPDATE marks
SET mark = 95
WHERE mark_id = 1;

-- DELETE: remove one incorrect mark entry
DELETE FROM marks
WHERE mark_id = 1;

-- DELETE: remove all marks for one student and one subject if data must be reset
DELETE FROM marks
WHERE student_id = 1
  AND subject_id = 1;


-- =========================================================
-- 7. REPORTS
-- Read-only queries behind the Reports page
-- =========================================================

-- READ: subjects loaded for report building
SELECT subject_id, subject_name, total_mark, start_year
FROM subjects
ORDER BY subject_id ASC;

-- READ: all students for report building
SELECT student_id, student_name, gender, grade, academic_year, semester
FROM students
ORDER BY student_id ASC;

-- READ: students for one homeroom class
SELECT student_id, student_name, gender, grade, academic_year, semester
FROM students
WHERE grade = '9A'
ORDER BY student_id ASC;

-- READ: all marks for report building
SELECT student_id, subject_id, mark
FROM marks;

-- READ: homeroom teachers for class reports
SELECT teacher_id, teacher_name, assigned_class
FROM teachers
WHERE role = 'Homeroom Teacher';

-- READ: one class mark roster using joins
SELECT
  st.student_id,
  st.student_name,
  st.gender,
  st.grade,
  st.academic_year,
  st.semester,
  sb.subject_id,
  sb.subject_name,
  sb.total_mark,
  sb.start_year,
  m.mark,
  ht.teacher_name AS homeroom_teacher
FROM students st
LEFT JOIN marks m ON m.student_id = st.student_id
LEFT JOIN subjects sb ON sb.subject_id = m.subject_id
LEFT JOIN teachers ht
  ON ht.assigned_class = st.grade
 AND ht.role = 'Homeroom Teacher'
WHERE st.grade = '9A'
  AND st.academic_year = '2025/2026'
  AND st.semester = '1'
ORDER BY st.student_name ASC, sb.subject_name ASC;

-- READ: class summary with totals, averages, PASS/FAIL, and dense rank
-- Useful for SQL-side checking.
-- The real app still builds the final report matrix in backend JavaScript so it can
-- handle missing marks and subject start-year eligibility exactly like the UI.
WITH class_report AS (
  SELECT
    st.student_id,
    st.student_name,
    st.grade,
    st.academic_year,
    st.semester,
    SUM(m.mark) AS total,
    COUNT(m.mark_id) AS subject_count,
    ROUND(AVG(m.mark), 2) AS average
  FROM students st
  LEFT JOIN marks m ON m.student_id = st.student_id
  WHERE st.grade = '9A'
    AND st.academic_year = '2025/2026'
    AND st.semester = '1'
  GROUP BY
    st.student_id,
    st.student_name,
    st.grade,
    st.academic_year,
    st.semester
)
SELECT
  student_id,
  student_name,
  grade,
  academic_year,
  semester,
  total,
  subject_count,
  average,
  CASE
    WHEN average >= 50 THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  DENSE_RANK() OVER (ORDER BY total DESC) AS class_rank
FROM class_report
ORDER BY class_rank ASC, student_name ASC;

-- READ: one student result sheet
SELECT
  st.student_id,
  st.student_name,
  st.gender,
  st.grade,
  st.academic_year,
  st.semester,
  sb.subject_name,
  sb.total_mark,
  m.mark,
  CASE
    WHEN m.mark IS NULL THEN '-'
    WHEN m.mark >= 50 THEN 'PASS'
    ELSE 'FAIL'
  END AS subject_result
FROM students st
LEFT JOIN marks m ON m.student_id = st.student_id
LEFT JOIN subjects sb ON sb.subject_id = m.subject_id
WHERE st.student_id = 1
ORDER BY sb.subject_name ASC;
