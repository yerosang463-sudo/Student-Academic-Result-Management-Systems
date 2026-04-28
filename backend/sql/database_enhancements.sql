-- ============================================================
-- DATABASE ENHANCEMENTS FOR STUDENT ACADEMIC RECORD MANAGEMENT
-- ADVANCED FEATURES WITH STRICT NUMERIC MARK-BASED SYSTEM
-- MySQL Compatible Script
-- ============================================================
-- This script adds advanced database features to the existing
-- Student Academic Record Management System while maintaining
-- a strict numeric mark-based system (0-100 marks only).
-- 
-- IMPORTANT: No grade letter conversions (A, B, C, D, F)
-- All calculations use numeric values only
-- ============================================================

-- Use the correct database name
USE student_academic_management_v2;

-- ============================================================
-- SECTION 1: ENHANCED VIEWS (MARK-ONLY)
-- ============================================================

-- View 1: Student Subject Marks View (Mark-Only)
DROP VIEW IF EXISTS vw_student_subject_marks;
CREATE VIEW vw_student_subject_marks AS
SELECT 
    s.student_id,
    s.student_name,
    sub.subject_name,
    m.mark,
    sub.total_mark AS total_mark,
    ROUND((m.mark / sub.total_mark) * 100, 2) AS percentage
FROM marks m
JOIN students s ON m.student_id = s.student_id
JOIN subjects sub ON m.subject_id = sub.subject_id;

-- View 2: Student Summary View (Mark-Only with Dynamic Rank)
DROP VIEW IF EXISTS vw_student_summary;
CREATE VIEW vw_student_summary AS
SELECT 
    s.student_id,
    s.student_name,
    COUNT(m.subject_id) AS total_subjects,
    SUM(m.mark) AS total_marks,
    ROUND(AVG(m.mark), 2) AS average_mark,
    ROW_NUMBER() OVER (ORDER BY SUM(m.mark) DESC) AS rank,
    CASE 
        WHEN AVG(m.mark) >= 50 THEN 'PASS'
        ELSE 'FAIL'
    END AS status
FROM students s
LEFT JOIN marks m ON s.student_id = m.student_id
GROUP BY s.student_id, s.student_name;

-- View 3: Class Performance Summary View
DROP VIEW IF EXISTS vw_class_performance;
CREATE VIEW vw_class_performance AS
SELECT 
    c.class_id,
    c.class_name,
    COUNT(DISTINCT s.student_id) AS student_count,
    COUNT(m.mark_id) AS mark_count,
    ROUND(AVG(m.mark), 2) AS class_average,
    MAX(m.mark) AS highest_mark,
    MIN(m.mark) AS lowest_mark
FROM classes c
LEFT JOIN students s ON s.class_id = c.class_id
LEFT JOIN marks m ON s.student_id = m.student_id
GROUP BY c.class_id, c.class_name;

-- View 4: Teacher Subject Assignment View
DROP VIEW IF EXISTS vw_teacher_subject_assignment;
CREATE VIEW vw_teacher_subject_assignment AS
SELECT 
    t.teacher_id,
    t.teacher_name,
    d.department_name AS subject_department,
    sub.subject_name,
    sub.subject_id,
    COUNT(DISTINCT m.student_id) AS students_graded,
    ROUND(AVG(m.mark), 2) AS average_mark_given
FROM teachers t
JOIN departments d ON t.department_id = d.department_id
LEFT JOIN subjects sub ON t.teacher_id = sub.teacher_id
LEFT JOIN marks m ON t.teacher_id = m.teacher_id AND sub.subject_id = m.subject_id
GROUP BY t.teacher_id, t.teacher_name, d.department_name, sub.subject_name, sub.subject_id;

-- View 5: Department Performance Summary
DROP VIEW IF EXISTS vw_department_performance;
CREATE VIEW vw_department_performance AS
SELECT 
    d.department_id,
    d.department_name,
    COUNT(DISTINCT t.teacher_id) AS teacher_count,
    COUNT(DISTINCT sub.subject_id) AS subject_count,
    COUNT(DISTINCT s.student_id) AS student_count,
    COUNT(m.mark_id) AS total_marks_recorded,
    ROUND(AVG(m.mark), 2) AS department_average,
    MAX(m.mark) AS highest_mark,
    MIN(m.mark) AS lowest_mark
FROM departments d
LEFT JOIN teachers t ON d.department_id = t.department_id
LEFT JOIN subjects sub ON d.department_id = sub.department_id
LEFT JOIN marks m ON sub.subject_id = m.subject_id
LEFT JOIN students s ON m.student_id = s.student_id
GROUP BY d.department_id, d.department_name;

-- ============================================================
-- SECTION 2: ADVANCED FUNCTIONS (NUMERIC CALCULATIONS ONLY)
-- ============================================================

-- Function 1: Calculate Total Marks for a Student
DROP FUNCTION IF EXISTS fn_calculate_total;
DELIMITER //
CREATE FUNCTION fn_calculate_total(p_student_id INT) RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total INT;
    
    SELECT SUM(mark) INTO v_total
    FROM marks
    WHERE student_id = p_student_id;
    
    RETURN IFNULL(v_total, 0);
END //
DELIMITER ;

-- Function 2: Calculate Average Mark for a Student
DROP FUNCTION IF EXISTS fn_calculate_average;
DELIMITER //
CREATE FUNCTION fn_calculate_average(p_student_id INT) RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_average DECIMAL(5,2);
    
    SELECT ROUND(AVG(mark), 2) INTO v_average
    FROM marks
    WHERE student_id = p_student_id;
    
    RETURN IFNULL(v_average, 0.00);
END //
DELIMITER ;

-- Function 3: Get Student Status (PASS/FAIL based on 50 threshold)
DROP FUNCTION IF EXISTS fn_get_status;
DELIMITER //
CREATE FUNCTION fn_get_status(p_student_id INT) RETURNS VARCHAR(10)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_average DECIMAL(5,2);
    DECLARE v_status VARCHAR(10);
    
    SELECT ROUND(AVG(mark), 2) INTO v_average
    FROM marks
    WHERE student_id = p_student_id;
    
    IF v_average IS NULL THEN
        SET v_status = 'NO MARKS';
    ELSEIF v_average >= 50 THEN
        SET v_status = 'PASS';
    ELSE
        SET v_status = 'FAIL';
    END IF;
    
    RETURN v_status;
END //
DELIMITER ;

-- Function 4: Get Subject Average Mark
DROP FUNCTION IF EXISTS fn_get_subject_average;
DELIMITER //
CREATE FUNCTION fn_get_subject_average(p_subject_id INT) RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_average DECIMAL(5,2);
    
    SELECT ROUND(AVG(mark), 2) INTO v_average
    FROM marks
    WHERE subject_id = p_subject_id;
    
    RETURN IFNULL(v_average, 0.00);
END //
DELIMITER ;

-- Function 5: Get Class Average Mark
DROP FUNCTION IF EXISTS fn_get_class_average;
DELIMITER //
CREATE FUNCTION fn_get_class_average(p_class_id INT) RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_class_avg DECIMAL(5,2);
    
    SELECT ROUND(AVG(m.mark), 2) INTO v_class_avg
    FROM marks m
    JOIN students s ON m.student_id = s.student_id
    WHERE s.class_id = p_class_id;
    
    RETURN IFNULL(v_class_avg, 0.00);
END //
DELIMITER ;

-- ============================================================
-- SECTION 3: ADVANCED STORED PROCEDURES WITH VALIDATION
-- ============================================================

-- Procedure 1: Add Student with Comprehensive Validation
DROP PROCEDURE IF EXISTS sp_add_student;
DELIMITER //
CREATE PROCEDURE sp_add_student(
    IN p_student_name VARCHAR(150),
    IN p_gender ENUM('Male','Female','Other'),
    IN p_grade VARCHAR(20),
    IN p_class_id INT,
    IN p_academic_year VARCHAR(20),
    IN p_semester VARCHAR(20),
    OUT p_student_id INT,
    OUT p_result_code INT,
    OUT p_result_message VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_class_exists INT;
    
    -- Validation: Check if class exists
    IF p_class_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_class_exists
        FROM classes
        WHERE class_id = p_class_id;
        
        IF v_class_exists = 0 THEN
            SET p_result_code = -1;
            SET p_result_message = 'Error: Class ID does not exist';
            SET p_student_id = NULL;
            LEAVE proc_label;
        END IF;
    END IF;
    
    -- Validation: Check required fields
    IF p_student_name IS NULL OR p_student_name = '' THEN
        SET p_result_code = -2;
        SET p_result_message = 'Error: Student name is required';
        SET p_student_id = NULL;
        LEAVE proc_label;
    END IF;
    
    IF p_grade IS NULL OR p_grade = '' THEN
        SET p_result_code = -3;
        SET p_result_message = 'Error: Grade is required';
        SET p_student_id = NULL;
        LEAVE proc_label;
    END IF;
    
    -- Insert student
    INSERT INTO students (student_name, gender, grade, class_id, academic_year, semester)
    VALUES (p_student_name, p_gender, p_grade, p_class_id, p_academic_year, p_semester);
    
    SET p_student_id = LAST_INSERT_ID();
    SET p_result_code = 0;
    SET p_result_message = CONCAT('Student added successfully. ID: ', p_student_id);
END //
DELIMITER ;

-- Procedure 2: Insert Mark with Advanced Validation
DROP PROCEDURE IF EXISTS sp_insert_mark;
DELIMITER //
CREATE PROCEDURE sp_insert_mark(
    IN p_student_id INT,
    IN p_subject_id INT,
    IN p_mark INT,
    OUT p_result_code INT,
    OUT p_result_message VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_student_exists INT;
    DECLARE v_subject_exists INT;
    DECLARE v_mark_exists INT;
    DECLARE v_subject_total_mark INT;
    
    -- Validation: Check if student exists
    SELECT COUNT(*) INTO v_student_exists
    FROM students
    WHERE student_id = p_student_id;
    
    IF v_student_exists = 0 THEN
        SET p_result_code = -1;
        SET p_result_message = 'Error: Student ID does not exist';
        LEAVE proc_label;
    END IF;
    
    -- Validation: Check if subject exists
    SELECT COUNT(*) INTO v_subject_exists
    FROM subjects
    WHERE subject_id = p_subject_id;
    
    IF v_subject_exists = 0 THEN
        SET p_result_code = -2;
        SET p_result_message = 'Error: Subject ID does not exist';
        LEAVE proc_label;
    END IF;
    
    -- Validation: Check mark range (0-100)
    IF p_mark < 0 OR p_mark > 100 THEN
        SET p_result_code = -3;
        SET p_result_message = 'Error: Mark must be between 0 and 100';
        LEAVE proc_label;
    END IF;
    
    -- Check if mark already exists
    SELECT COUNT(*) INTO v_mark_exists
    FROM marks
    WHERE student_id = p_student_id AND subject_id = p_subject_id;
    
    IF v_mark_exists > 0 THEN
        SET p_result_code = -4;
        SET p_result_message = 'Error: Mark already exists for this student and subject';
        LEAVE proc_label;
    END IF;
    
    -- Get subject total mark for validation
    SELECT total_mark INTO v_subject_total_mark
    FROM subjects
    WHERE subject_id = p_subject_id;
    
    -- Additional validation: Mark cannot exceed subject total mark
    IF p_mark > v_subject_total_mark THEN
        SET p_result_code = -5;
        SET p_result_message = CONCAT('Error: Mark cannot exceed subject total mark of ', v_subject_total_mark);
        LEAVE proc_label;
    END IF;
    
    -- Insert mark
    INSERT INTO marks (student_id, subject_id, mark)
    VALUES (p_student_id, p_subject_id, p_mark);
    
    SET p_result_code = 0;
    SET p_result_message = 'Mark inserted successfully';
END //
DELIMITER ;

-- Procedure 3: Update Mark with Advanced Validation
DROP PROCEDURE IF EXISTS sp_update_mark;
DELIMITER //
CREATE PROCEDURE sp_update_mark(
    IN p_student_id INT,
    IN p_subject_id INT,
    IN p_mark INT,
    OUT p_result_code INT,
    OUT p_result_message VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_mark_exists INT;
    DECLARE v_subject_total_mark INT;
    
    -- Validation: Check mark range (0-100)
    IF p_mark < 0 OR p_mark > 100 THEN
        SET p_result_code = -1;
        SET p_result_message = 'Error: Mark must be between 0 and 100';
        LEAVE proc_label;
    END IF;
    
    -- Check if mark exists
    SELECT COUNT(*) INTO v_mark_exists
    FROM marks
    WHERE student_id = p_student_id AND subject_id = p_subject_id;
    
    IF v_mark_exists = 0 THEN
        SET p_result_code = -2;
        SET p_result_message = 'Error: Mark does not exist for this student and subject';
        LEAVE proc_label;
    END IF;
    
    -- Get subject total mark for validation
    SELECT total_mark INTO v_subject_total_mark
    FROM subjects
    WHERE subject_id = p_subject_id;
    
    -- Additional validation: Mark cannot exceed subject total mark
    IF p_mark > v_subject_total_mark THEN
        SET p_result_code = -3;
        SET p_result_message = CONCAT('Error: Mark cannot exceed subject total mark of ', v_subject_total_mark);
        LEAVE proc_label;
    END IF;
    
    -- Update mark
    UPDATE marks
    SET mark = p_mark
    WHERE student_id = p_student_id AND subject_id = p_subject_id;
    
    SET p_result_code = 0;
    SET p_result_message = 'Mark updated successfully';
END //
DELIMITER ;

-- Procedure 4: Get Student Comprehensive Report
DROP PROCEDURE IF EXISTS sp_get_student_report;
DELIMITER //
CREATE PROCEDURE sp_get_student_report(
    IN p_student_id INT
)
BEGIN
    SELECT 
        s.student_id,
        s.student_name,
        s.gender,
        c.class_name,
        s.academic_year,
        s.semester,
        fn_calculate_total(s.student_id) AS total_marks,
        fn_calculate_average(s.student_id) AS average_mark,
        fn_get_status(s.student_id) AS status,
        COUNT(m.subject_id) AS subject_count,
        MAX(m.mark) AS highest_mark,
        MIN(m.mark) AS lowest_mark,
        (SELECT COUNT(*) FROM marks m2 WHERE m2.student_id = s.student_id AND m2.mark >= 50) AS passed_subjects,
        (SELECT COUNT(*) FROM marks m3 WHERE m3.student_id = s.student_id AND m3.mark < 50) AS failed_subjects
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.class_id
    LEFT JOIN marks m ON s.student_id = m.student_id
    WHERE s.student_id = p_student_id
    GROUP BY s.student_id, s.student_name, s.gender, c.class_name, s.academic_year, s.semester;
END //
DELIMITER ;

-- ============================================================
-- SECTION 4: ADVANCED TRIGGERS FOR DATA INTEGRITY
-- ============================================================

-- Create audit log table for triggers
CREATE TABLE IF NOT EXISTS audit_log (
    log_id INT NOT NULL AUTO_INCREMENT,
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    record_id INT NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    changed_by VARCHAR(50) NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id),
    KEY idx_audit_table (table_name),
    KEY idx_audit_operation (operation),
    KEY idx_audit_date (changed_at)
) ENGINE=InnoDB;

-- Trigger 1: Prevent Invalid Mark Insertions (0-100 range)
DROP TRIGGER IF EXISTS trg_mark_insert_validation;
DELIMITER //
CREATE TRIGGER trg_mark_insert_validation
BEFORE INSERT ON marks
FOR EACH ROW
BEGIN
    IF NEW.mark < 0 OR NEW.mark > 100 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Mark must be between 0 and 100';
    END IF;
END //
DELIMITER ;

-- Trigger 2: Prevent Invalid Mark Updates (0-100 range)
DROP TRIGGER IF EXISTS trg_mark_update_validation;
DELIMITER //
CREATE TRIGGER trg_mark_update_validation
BEFORE UPDATE ON marks
FOR EACH ROW
BEGIN
    IF NEW.mark < 0 OR NEW.mark > 100 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Mark must be between 0 and 100';
    END IF;
END //
DELIMITER ;

-- Trigger 3: Auto-update Last Modified Timestamp on Mark Changes
DROP TRIGGER IF EXISTS trg_mark_update_timestamp;
DELIMITER //
CREATE TRIGGER trg_mark_update_timestamp
BEFORE UPDATE ON marks
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- Trigger 4: Log Mark Changes to Audit Table
DROP TRIGGER IF EXISTS trg_mark_audit_log;
DELIMITER //
CREATE TRIGGER trg_mark_audit_log
AFTER INSERT ON marks
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, operation, record_id, new_values)
    VALUES ('marks', 'INSERT', NEW.mark_id, JSON_OBJECT(
        'student_id', NEW.student_id,
        'subject_id', NEW.subject_id,
        'mark', NEW.mark,
        'teacher_id', NEW.teacher_id
    ));
END //
DELIMITER ;

DROP TRIGGER IF EXISTS trg_mark_audit_log_update;
DELIMITER //
CREATE TRIGGER trg_mark_audit_log_update
AFTER UPDATE ON marks
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values)
    VALUES ('marks', 'UPDATE', NEW.mark_id, 
        JSON_OBJECT(
            'student_id', OLD.student_id,
            'subject_id', OLD.subject_id,
            'mark', OLD.mark,
            'teacher_id', OLD.teacher_id
        ),
        JSON_OBJECT(
            'student_id', NEW.student_id,
            'subject_id', NEW.subject_id,
            'mark', NEW.mark,
            'teacher_id', NEW.teacher_id
        )
    );
END //
DELIMITER ;

DROP TRIGGER IF EXISTS trg_mark_audit_log_delete;
DELIMITER //
CREATE TRIGGER trg_mark_audit_log_delete
AFTER DELETE ON marks
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, operation, record_id, old_values)
    VALUES ('marks', 'DELETE', OLD.mark_id, JSON_OBJECT(
        'student_id', OLD.student_id,
        'subject_id', OLD.subject_id,
        'mark', OLD.mark,
        'teacher_id', OLD.teacher_id
    ));
END //
DELIMITER ;

-- Trigger 5: Enforce One Homeroom Teacher Per Class Constraint
DROP TRIGGER IF EXISTS trg_teacher_homeroom_constraint;
DELIMITER //
CREATE TRIGGER trg_teacher_homeroom_constraint
BEFORE UPDATE ON teachers
FOR EACH ROW
BEGIN
    DECLARE v_existing_homeroom_teacher INT;
    
    -- Check if this teacher is being assigned as homeroom teacher
    IF NEW.role = 'Homeroom Teacher' AND NEW.assigned_class_id IS NOT NULL THEN
        -- Check if another teacher is already homeroom for this class
        SELECT COUNT(*) INTO v_existing_homeroom_teacher
        FROM teachers
        WHERE role = 'Homeroom Teacher' 
          AND assigned_class_id = NEW.assigned_class_id
          AND teacher_id != NEW.teacher_id;
        
        IF v_existing_homeroom_teacher > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only one homeroom teacher allowed per class';
        END IF;
    END IF;
END //
DELIMITER ;

-- ============================================================
-- SECTION 5: PERFORMANCE INDEXES
-- ============================================================

-- Index 1: Composite index for student marks lookup
CREATE INDEX IF NOT EXISTS idx_marks_student_subject ON marks(student_id, subject_id);

-- Index 2: Composite index for student performance queries
CREATE INDEX IF NOT EXISTS idx_marks_student_mark ON marks(student_id, mark);

-- Index 3: Composite index for subject performance queries
CREATE INDEX IF NOT EXISTS idx_marks_subject_mark ON marks(subject_id, mark);

-- Index 4: Class performance queries
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);

-- Index 5: Student name search optimization
CREATE INDEX IF NOT EXISTS idx_students_name ON students(student_name);

-- Index 6: Subject name search optimization
CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(subject_name);

-- Index 7: Teacher name search optimization
CREATE INDEX IF NOT EXISTS idx_teachers_name ON teachers(teacher_name);

-- Index 8: Department name search optimization
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(department_name);

-- Index 9: Audit log date range queries
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(changed_at);

-- Index 10: Marks value range queries (for statistics)
CREATE INDEX IF NOT EXISTS idx_marks_value_range ON marks(mark);

-- ============================================================
-- SECTION 6: SUMMARY AND USAGE
-- ============================================================
/*
ADVANCED FEATURES IMPLEMENTED:

1. ENHANCED VIEWS (5):
   - vw_student_subject_marks: Student marks with percentage
   - vw_student_summary: Student summary with dynamic rank and PASS/FAIL status
   - vw_class_performance: Class-level performance statistics
   - vw_teacher_subject_assignment: Teacher workload and grading statistics
   - vw_department_performance: Department-level performance analysis

2. ADVANCED FUNCTIONS (5):
   - fn_calculate_total: Calculate total marks (numeric only)
   - fn_calculate_average: Calculate average mark (numeric only)
   - fn_get_status: Determine PASS/FAIL status based on 50 threshold
   - fn_get_subject_average: Calculate subject average (numeric only)
   - fn_get_class_average: Calculate class average (numeric only)

3. ADVANCED STORED PROCEDURES (4):
   - sp_add_student: Add student with comprehensive validation
   - sp_insert_mark: Insert mark with advanced validation (0-100 range, duplicate prevention)
   - sp_update_mark: Update mark with advanced validation (0-100 range)
   - sp_get_student_report: Get comprehensive student report with statistics

4. ADVANCED TRIGGERS (5):
   - trg_mark_insert_validation: Validate mark range on insert (0-100)
   - trg_mark_update_validation: Validate mark range on update (0-100)
   - trg_mark_update_timestamp: Auto-update last modified timestamp
   - trg_mark_audit_log: Comprehensive audit logging for all mark operations
   - trg_teacher_homeroom_constraint: Enforce one homeroom teacher per class

5. PERFORMANCE INDEXES (10):
   - Optimized indexes for student, subject, and mark queries
   - Composite indexes for common join patterns
   - Range query optimization for statistics
   - Search optimization for names and dates

6. AUDIT SYSTEM:
   - Comprehensive audit logging for all DML operations
   - JSON storage for old/new values
   - Timestamp tracking for all changes

KEY COMPLIANCE FEATURES:
- Strictly mark-based system (0-100 marks only)
- No grade letter conversions (A, B, C, D, F)
- No GPA calculations
- All calculations use numeric values only
- PASS/FAIL based on numeric threshold (50)
- Dynamic rank calculation using window functions

USAGE EXAMPLES:
-- Get student report
CALL sp_get_student_report(1);

-- Insert mark with validation
CALL sp_insert_mark(1, 1, 85, @code, @message);
SELECT @code, @message;

-- View student summary with rank
SELECT * FROM vw_student_summary ORDER BY rank;

-- View class performance
SELECT * FROM vw_class_performance WHERE class_id = 1;

-- Check department performance
SELECT * FROM vw_department_performance;

-- Use functions for calculations
SELECT fn_calculate_total(1) AS total_marks;
SELECT fn_calculate_average(1) AS average_mark;
SELECT fn_get_status(1) AS student_status;
*/
