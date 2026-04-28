-- ============================================================
-- CURRENT DATABASE STATE CHECK
-- Run this before applying enhancements
-- ============================================================

SELECT 'CURRENT DATABASE STATE CHECK' AS title;
SELECT '========================================' AS separator;

-- 1. Check current database
SELECT DATABASE() AS current_database;

-- 2. Check existing tables
SELECT 'EXISTING TABLES:' AS section;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = DATABASE()
ORDER BY table_name;

-- 3. Check students table structure
SELECT 'STUDENTS TABLE STRUCTURE:' AS section;
DESCRIBE students;

-- 4. Check subjects table structure  
SELECT 'SUBJECTS TABLE STRUCTURE:' AS section;
DESCRIBE subjects;

-- 5. Check teachers table structure
SELECT 'TEACHERS TABLE STRUCTURE:' AS section;
DESCRIBE teachers;

-- 6. Check marks table structure
SELECT 'MARKS TABLE STRUCTURE:' AS section;
DESCRIBE marks;

-- 7. Check existing views
SELECT 'EXISTING VIEWS:' AS section;
SELECT table_name AS view_name
FROM information_schema.views 
WHERE table_schema = DATABASE()
ORDER BY table_name;

-- 8. Check existing functions
SELECT 'EXISTING FUNCTIONS:' AS section;
SELECT routine_name AS function_name
FROM information_schema.routines 
WHERE routine_schema = DATABASE() AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 9. Check existing procedures
SELECT 'EXISTING PROCEDURES:' AS section;
SELECT routine_name AS procedure_name
FROM information_schema.routines 
WHERE routine_schema = DATABASE() AND routine_type = 'PROCEDURE'
ORDER BY routine_name;

-- 10. Check existing triggers
SELECT 'EXISTING TRIGGERS:' AS section;
SELECT trigger_name, event_object_table AS table_name, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = DATABASE()
ORDER BY trigger_name;

-- 11. Check existing indexes
SELECT 'KEY INDEXES:' AS section;
SELECT 
  table_name,
  index_name,
  GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns,
  index_type,
  non_unique
FROM information_schema.statistics 
WHERE table_schema = DATABASE()
  AND table_name IN ('students', 'subjects', 'teachers', 'marks', 'departments', 'classes')
GROUP BY table_name, index_name, index_type, non_unique
ORDER BY table_name, index_name;

-- 12. Check for grade letter conversions
SELECT 'CHECK FOR GRADE LETTER CONVERSIONS:' AS section;
SELECT 
  'Views' AS object_type,
  table_name AS object_name,
  view_definition AS definition
FROM information_schema.views 
WHERE table_schema = DATABASE()
  AND (view_definition LIKE '%A%' 
    OR view_definition LIKE '%B%' 
    OR view_definition LIKE '%C%' 
    OR view_definition LIKE '%D%' 
    OR view_definition LIKE '%F%'
    OR view_definition LIKE '%GPA%'
    OR view_definition LIKE '%grade_letter%')
UNION ALL
SELECT 
  'Functions' AS object_type,
  routine_name AS object_name,
  routine_definition AS definition
FROM information_schema.routines 
WHERE routine_schema = DATABASE() 
  AND routine_type = 'FUNCTION'
  AND (routine_definition LIKE '%A%' 
    OR routine_definition LIKE '%B%' 
    OR routine_definition LIKE '%C%' 
    OR routine_definition LIKE '%D%' 
    OR routine_definition LIKE '%F%'
    OR routine_definition LIKE '%GPA%'
    OR routine_definition LIKE '%grade_letter%')
UNION ALL
SELECT 
  'Procedures' AS object_type,
  routine_name AS object_name,
  routine_definition AS definition
FROM information_schema.routines 
WHERE routine_schema = DATABASE() 
  AND routine_type = 'PROCEDURE'
  AND (routine_definition LIKE '%A%' 
    OR routine_definition LIKE '%B%' 
    OR routine_definition LIKE '%C%' 
    OR routine_definition LIKE '%D%' 
    OR routine_definition LIKE '%F%'
    OR routine_definition LIKE '%GPA%'
    OR routine_definition LIKE '%grade_letter%');

-- 13. Summary
SELECT 'DATABASE STATE SUMMARY:' AS section;
SELECT 
  CONCAT('Tables: ', COUNT(*)) AS summary
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
  CONCAT('Views: ', COUNT(*)) AS summary
FROM information_schema.views 
WHERE table_schema = DATABASE()
UNION ALL
SELECT 
  CONCAT('Functions: ', COUNT(*)) AS summary
FROM information_schema.routines 
WHERE routine_schema = DATABASE() AND routine_type = 'FUNCTION'
UNION ALL
SELECT 
  CONCAT('Procedures: ', COUNT(*)) AS summary
FROM information_schema.routines 
WHERE routine_schema = DATABASE() AND routine_type = 'PROCEDURE'
UNION ALL
SELECT 
  CONCAT('Triggers: ', COUNT(*)) AS summary
FROM information_schema.triggers 
WHERE trigger_schema = DATABASE()
UNION ALL
SELECT 
  CONCAT('Grade letter conversions found: ', COUNT(*)) AS summary
FROM (
  SELECT 1 FROM information_schema.views 
  WHERE table_schema = DATABASE()
    AND (view_definition LIKE '%A%' 
      OR view_definition LIKE '%B%' 
      OR view_definition LIKE '%C%' 
      OR view_definition LIKE '%D%' 
      OR view_definition LIKE '%F%'
      OR view_definition LIKE '%GPA%'
      OR view_definition LIKE '%grade_letter%')
  UNION ALL
  SELECT 1 FROM information_schema.routines 
  WHERE routine_schema = DATABASE() 
    AND (routine_definition LIKE '%A%' 
      OR routine_definition LIKE '%B%' 
      OR routine_definition LIKE '%C%' 
      OR routine_definition LIKE '%D%' 
      OR routine_definition LIKE '%F%'
      OR routine_definition LIKE '%GPA%'
      OR routine_definition LIKE '%grade_letter%')
) AS grade_checks;