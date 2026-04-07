-- Student Academic Record Management System (Normalized v2)
-- This is a redesigned schema that keeps class, semester, and assignment data
-- in dedicated tables. It creates a separate database so the current app schema
-- remains untouched until the application is migrated.

CREATE DATABASE IF NOT EXISTS student_academic_management_v2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE student_academic_management_v2;

CREATE TABLE IF NOT EXISTS departments (
  department_id INT NOT NULL AUTO_INCREMENT,
  department_name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (department_id),
  UNIQUE KEY uq_departments_name (department_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admins (
  admin_id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_id),
  UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS academic_years (
  academic_year_id INT NOT NULL AUTO_INCREMENT,
  year_label VARCHAR(20) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (academic_year_id),
  UNIQUE KEY uq_academic_years_label (year_label),
  CONSTRAINT chk_academic_year_dates
    CHECK (
      start_date IS NULL
      OR end_date IS NULL
      OR start_date < end_date
    )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS semesters (
  semester_id INT NOT NULL AUTO_INCREMENT,
  academic_year_id INT NOT NULL,
  semester_no TINYINT NOT NULL,
  semester_name VARCHAR(50) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (semester_id),
  UNIQUE KEY uq_semesters_year_no (academic_year_id, semester_no),
  CONSTRAINT chk_semesters_no CHECK (semester_no BETWEEN 1 AND 4),
  CONSTRAINT chk_semester_dates
    CHECK (
      start_date IS NULL
      OR end_date IS NULL
      OR start_date < end_date
    ),
  CONSTRAINT fk_semesters_academic_year
    FOREIGN KEY (academic_year_id)
    REFERENCES academic_years (academic_year_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS classes (
  class_id INT NOT NULL AUTO_INCREMENT,
  grade_level VARCHAR(20) NOT NULL,
  section VARCHAR(20) NOT NULL,
  capacity INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id),
  UNIQUE KEY uq_classes_grade_section (grade_level, section),
  CONSTRAINT chk_classes_capacity CHECK (capacity IS NULL OR capacity > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  student_id INT NOT NULL AUTO_INCREMENT,
  student_name VARCHAR(150) NOT NULL,
  gender ENUM('Male','Female','Other') NOT NULL,
  date_of_birth DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id INT NOT NULL AUTO_INCREMENT,
  teacher_name VARCHAR(150) NOT NULL,
  department_id INT NOT NULL,
  username VARCHAR(50) NULL,
  password_hash VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (teacher_id),
  UNIQUE KEY uq_teachers_username (username),
  KEY idx_teachers_department (department_id),
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
  start_year INT NULL,
  default_total_mark INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (subject_id),
  UNIQUE KEY uq_subjects_name (subject_name),
  KEY idx_subjects_department (department_id),
  CONSTRAINT chk_subjects_start_year
    CHECK (start_year IS NULL OR (start_year >= 1900 AND start_year <= 2999)),
  CONSTRAINT chk_subjects_default_total_mark
    CHECK (default_total_mark = 100),
  CONSTRAINT fk_subjects_department
    FOREIGN KEY (department_id)
    REFERENCES departments (department_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS homeroom_assignments (
  homeroom_assignment_id INT NOT NULL AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  class_id INT NOT NULL,
  semester_id INT NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (homeroom_assignment_id),
  UNIQUE KEY uq_homeroom_class_semester (class_id, semester_id),
  UNIQUE KEY uq_homeroom_teacher_semester (teacher_id, semester_id),
  KEY idx_homeroom_semester (semester_id),
  CONSTRAINT fk_homeroom_teacher
    FOREIGN KEY (teacher_id)
    REFERENCES teachers (teacher_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_homeroom_class
    FOREIGN KEY (class_id)
    REFERENCES classes (class_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_homeroom_semester
    FOREIGN KEY (semester_id)
    REFERENCES semesters (semester_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_enrollments (
  student_enrollment_id INT NOT NULL AUTO_INCREMENT,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  semester_id INT NOT NULL,
  roll_number INT NULL,
  enrollment_status ENUM('Active','Promoted','Transferred','Withdrawn','Completed')
    NOT NULL DEFAULT 'Active',
  enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_enrollment_id),
  UNIQUE KEY uq_student_semester (student_id, semester_id),
  UNIQUE KEY uq_student_enrollment_context (student_enrollment_id, class_id, semester_id),
  UNIQUE KEY uq_class_semester_roll_number (class_id, semester_id, roll_number),
  KEY idx_student_enrollments_class_semester (class_id, semester_id),
  CONSTRAINT chk_student_enrollment_roll_number
    CHECK (roll_number IS NULL OR roll_number > 0),
  CONSTRAINT fk_student_enrollments_student
    FOREIGN KEY (student_id)
    REFERENCES students (student_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_student_enrollments_class
    FOREIGN KEY (class_id)
    REFERENCES classes (class_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_student_enrollments_semester
    FOREIGN KEY (semester_id)
    REFERENCES semesters (semester_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subject_offerings (
  subject_offering_id INT NOT NULL AUTO_INCREMENT,
  subject_id INT NOT NULL,
  class_id INT NOT NULL,
  semester_id INT NOT NULL,
  teacher_id INT NULL,
  total_mark INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (subject_offering_id),
  UNIQUE KEY uq_subject_offering_class_subject_semester (class_id, subject_id, semester_id),
  UNIQUE KEY uq_subject_offering_context (subject_offering_id, class_id, semester_id),
  KEY idx_subject_offerings_subject (subject_id),
  KEY idx_subject_offerings_teacher (teacher_id),
  KEY idx_subject_offerings_semester (semester_id),
  CONSTRAINT chk_subject_offerings_total_mark CHECK (total_mark = 100),
  CONSTRAINT fk_subject_offerings_subject
    FOREIGN KEY (subject_id)
    REFERENCES subjects (subject_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_subject_offerings_class
    FOREIGN KEY (class_id)
    REFERENCES classes (class_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_subject_offerings_semester
    FOREIGN KEY (semester_id)
    REFERENCES semesters (semester_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_subject_offerings_teacher
    FOREIGN KEY (teacher_id)
    REFERENCES teachers (teacher_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS marks (
  mark_id INT NOT NULL AUTO_INCREMENT,
  student_enrollment_id INT NOT NULL,
  subject_offering_id INT NOT NULL,
  class_id INT NOT NULL,
  semester_id INT NOT NULL,
  entered_by_teacher_id INT NULL,
  mark INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (mark_id),
  UNIQUE KEY uq_marks_enrollment_offering (student_enrollment_id, subject_offering_id),
  KEY idx_marks_enrollment_context (student_enrollment_id, class_id, semester_id),
  KEY idx_marks_offering_context (subject_offering_id, class_id, semester_id),
  KEY idx_marks_context (class_id, semester_id),
  KEY idx_marks_entered_by_teacher (entered_by_teacher_id),
  CONSTRAINT chk_marks_range CHECK (mark >= 0 AND mark <= 100),
  CONSTRAINT fk_marks_enrollment_context
    FOREIGN KEY (student_enrollment_id, class_id, semester_id)
    REFERENCES student_enrollments (student_enrollment_id, class_id, semester_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_marks_offering_context
    FOREIGN KEY (subject_offering_id, class_id, semester_id)
    REFERENCES subject_offerings (subject_offering_id, class_id, semester_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_marks_entered_by_teacher
    FOREIGN KEY (entered_by_teacher_id)
    REFERENCES teachers (teacher_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;
