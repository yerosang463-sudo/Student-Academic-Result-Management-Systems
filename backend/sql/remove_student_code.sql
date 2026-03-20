USE student_academic_management;

-- Drop the legacy student_code field and its unique index if they exist.
SET @drop_index_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'students'
        AND index_name = 'uq_students_code'
    ),
    'ALTER TABLE students DROP INDEX uq_students_code',
    'SELECT 1'
  )
);
PREPARE drop_index_stmt FROM @drop_index_sql;
EXECUTE drop_index_stmt;
DEALLOCATE PREPARE drop_index_stmt;

SET @drop_column_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'students'
        AND column_name = 'student_code'
    ),
    'ALTER TABLE students DROP COLUMN student_code',
    'SELECT 1'
  )
);
PREPARE drop_column_stmt FROM @drop_column_sql;
EXECUTE drop_column_stmt;
DEALLOCATE PREPARE drop_column_stmt;
