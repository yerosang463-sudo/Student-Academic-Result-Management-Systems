-- Migration: add subject start_year cutoff (NULL = available for all years)
-- Run once on existing databases.

USE student_academic_management;

SET @add_start_year_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'subjects'
        AND column_name = 'start_year'
    ),
    'SELECT 1',
    'ALTER TABLE subjects ADD COLUMN start_year INT NULL AFTER teacher_id'
  )
);
PREPARE add_start_year_stmt FROM @add_start_year_sql;
EXECUTE add_start_year_stmt;
DEALLOCATE PREPARE add_start_year_stmt;

SET @add_check_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
        AND table_name = 'subjects'
        AND constraint_name = 'chk_subject_start_year'
        AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE subjects ADD CONSTRAINT chk_subject_start_year CHECK (start_year IS NULL OR (start_year >= 1900 AND start_year <= 2999))'
  )
);
PREPARE add_check_stmt FROM @add_check_sql;
EXECUTE add_check_stmt;
DEALLOCATE PREPARE add_check_stmt;
