USE student_academic_management;

-- Departments (subject-based, scalable)
INSERT INTO departments (department_name) VALUES
  ('Maths'),
  ('English'),
  ('Biology'),
  ('Chemistry'),
  ('Physics')
ON DUPLICATE KEY UPDATE
  department_name = VALUES(department_name);

-- Default subjects (scalable: you can add more subjects later)
INSERT INTO subjects (subject_name, department_id, total_mark) VALUES
  ('Maths', (SELECT department_id FROM departments WHERE department_name = 'Maths' LIMIT 1), 100),
  ('English', (SELECT department_id FROM departments WHERE department_name = 'English' LIMIT 1), 100),
  ('Biology', (SELECT department_id FROM departments WHERE department_name = 'Biology' LIMIT 1), 100),
  ('Chemistry', (SELECT department_id FROM departments WHERE department_name = 'Chemistry' LIMIT 1), 100),
  ('Physics', (SELECT department_id FROM departments WHERE department_name = 'Physics' LIMIT 1), 100)
ON DUPLICATE KEY UPDATE
  subject_name = VALUES(subject_name),
  department_id = VALUES(department_id),
  total_mark = VALUES(total_mark);

-- Default teachers (subject-based departments)
INSERT INTO teachers (teacher_name, department_id, assigned_class, role)
SELECT 'Mr. Genet',
       (SELECT department_id FROM departments WHERE department_name = 'Maths' LIMIT 1),
       NULL,
       'Subject Teacher'
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE teacher_name = 'Mr. Genet');

INSERT INTO teachers (teacher_name, department_id, assigned_class, role)
SELECT 'Ms. Alemu',
       (SELECT department_id FROM departments WHERE department_name = 'English' LIMIT 1),
       NULL,
       'Subject Teacher'
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE teacher_name = 'Ms. Alemu');

INSERT INTO teachers (teacher_name, department_id, assigned_class, role)
SELECT 'Mr. Tola',
       (SELECT department_id FROM departments WHERE department_name = 'Biology' LIMIT 1),
       NULL,
       'Subject Teacher'
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE teacher_name = 'Mr. Tola');

INSERT INTO teachers (teacher_name, department_id, assigned_class, role)
SELECT 'Ms. OLyad',
       (SELECT department_id FROM departments WHERE department_name = 'Chemistry' LIMIT 1),
       NULL,
       'Subject Teacher'
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE teacher_name = 'Ms. OLyad');

INSERT INTO teachers (teacher_name, department_id, assigned_class, role)
SELECT 'Mr. Alemayehu',
       (SELECT department_id FROM departments WHERE department_name = 'Physics' LIMIT 1),
       NULL,
       'Subject Teacher'
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE teacher_name = 'Mr. Alemayehu');

-- One homeroom teacher per class (example class: 9A)
INSERT INTO teachers (teacher_name, department_id, assigned_class, role)
SELECT 'Addisu',
       (SELECT department_id FROM departments WHERE department_name = 'Maths' LIMIT 1),
       '9A',
       'Homeroom Teacher'
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE role = 'Homeroom Teacher' AND assigned_class = '9A');

-- Assign subject teachers to subjects (department must match)
UPDATE subjects
SET teacher_id = (SELECT teacher_id FROM teachers WHERE teacher_name = 'Mr. Genet' LIMIT 1)
WHERE subject_name = 'Maths';

UPDATE subjects
SET teacher_id = (SELECT teacher_id FROM teachers WHERE teacher_name = 'Ms. Alemu' LIMIT 1)
WHERE subject_name = 'English';

UPDATE subjects
SET teacher_id = (SELECT teacher_id FROM teachers WHERE teacher_name = 'Mr. Tola' LIMIT 1)
WHERE subject_name = 'Biology';

UPDATE subjects
SET teacher_id = (SELECT teacher_id FROM teachers WHERE teacher_name = 'Ms. OLyad' LIMIT 1)
WHERE subject_name = 'Chemistry';

UPDATE subjects
SET teacher_id = (SELECT teacher_id FROM teachers WHERE teacher_name = 'Mr. Alemayehu' LIMIT 1)
WHERE subject_name = 'Physics';

-- Admin user is created automatically by the backend on first start if none exists:
--   username: admin
--   password: admin123
