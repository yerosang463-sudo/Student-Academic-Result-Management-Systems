-- Student Academic Record Management System (MySQL)
-- Normalized schema (>= 3NF) with PK/FK relationships.

CREATE DATABASE IF NOT EXISTS student_academic_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE student_academic_management;
-- Core lookup table (optional but recommended for 3NF)
CREATE TABLE IF NOT EXISTS departments (
  department_id INT NOT NULL AUTO_INCREMENT,
  department_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (department_id),
  UNIQUE KEY uq_departments_name (department_name)
) ENGINE=InnoDB;

-- Admins for session-based authentication
CREATE TABLE IF NOT EXISTS admins (
  admin_id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_id),
  UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  student_id INT NOT NULL AUTO_INCREMENT,
  student_name VARCHAR(150) NOT NULL,
  gender ENUM('Male','Female','Other') NOT NULL,
  grade VARCHAR(20) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id INT NOT NULL AUTO_INCREMENT,
  teacher_name VARCHAR(150) NOT NULL,
  username VARCHAR(50) NULL,
  password_hash VARCHAR(255) NULL,
  department_id INT NOT NULL,
  assigned_class VARCHAR(50) NULL,
  role ENUM('Homeroom Teacher','Subject Teacher') NOT NULL DEFAULT 'Subject Teacher',
  homeroom_class VARCHAR(50)
    GENERATED ALWAYS AS (
      CASE
        WHEN role = 'Homeroom Teacher' THEN assigned_class
        ELSE NULL
      END
    ) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (teacher_id),
  KEY idx_teachers_department (department_id),
  UNIQUE KEY uq_teachers_username (username),
  UNIQUE KEY uq_homeroom_class (homeroom_class),
  CONSTRAINT chk_teacher_homeroom_class
    CHECK (role <> 'Homeroom Teacher' OR assigned_class IS NOT NULL),
  CONSTRAINT fk_teachers_department
    FOREIGN KEY (department_id)
    REFERENCES departments (department_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subjects (
  subject_id INT NOT NULL AUTO_INCREMENT,
  subject_name VARCHAR(150) NOT NULL,
  department_id INT NOT NULL,
  teacher_id INT NULL,
  total_mark INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (subject_id),
  UNIQUE KEY uq_subjects_name (subject_name),
  KEY idx_subjects_department (department_id),
  KEY idx_subjects_teacher (teacher_id),
  CONSTRAINT chk_subject_total_mark CHECK (total_mark = 100),
  CONSTRAINT fk_subjects_department
    FOREIGN KEY (department_id)
    REFERENCES departments (department_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_subjects_teacher
    FOREIGN KEY (teacher_id)
    REFERENCES teachers (teacher_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS marks (
  mark_id INT NOT NULL AUTO_INCREMENT,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT NULL,
  mark INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (mark_id),
  UNIQUE KEY uq_marks_student_subject (student_id, subject_id),
  KEY idx_marks_student (student_id),
  KEY idx_marks_subject (subject_id),
  KEY idx_marks_teacher (teacher_id),
  CONSTRAINT fk_marks_student
    FOREIGN KEY (student_id)
    REFERENCES students (student_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_marks_subject
    FOREIGN KEY (subject_id)
    REFERENCES subjects (subject_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_marks_teacher
    FOREIGN KEY (teacher_id)
    REFERENCES teachers (teacher_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT chk_mark_range CHECK (mark >= 0 AND mark <= 100)
) ENGINE=InnoDB;
