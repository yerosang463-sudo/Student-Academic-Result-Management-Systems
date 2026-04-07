# Normalized V2 Schema

This schema is a database redesign for the project. It adds the missing `classes`
entity and moves term-specific data out of master tables.

The new SQL file is `backend/sql/create_tables_normalized_v2.sql`.

All entities in this version use numeric ID primary keys only. No extra
`student_code`, `class_code`, `employee_code`, or `subject_code` columns are used.

## Why a redesign was needed

The current app schema works, but it mixes long-lived master data with
semester-based academic activity:

- `students.grade`, `students.academic_year`, and `students.semester` are not
  permanent student attributes.
- `teachers.assigned_class` stores class as free text instead of a foreign key.
- `subjects.teacher_id` fixes a teacher on the subject itself, even though a
  subject can be taught by different teachers in different classes or terms.
- `marks` only allows one row per student and subject, so it cannot cleanly keep
  separate marks for multiple semesters or academic years.

## New core entities

- `classes`: the actual class/section entity such as `9A`.
- `academic_years`: school years such as `2025/2026`.
- `semesters`: terms that belong to an academic year.
- `student_enrollments`: where a student belongs for a specific semester.
- `homeroom_assignments`: which teacher is the homeroom teacher for a class in a semester.
- `subject_offerings`: which subject is offered to which class in which semester and by which teacher.

## Design effect

With this model:

- a student can move between classes over time without rewriting the student row
- one class can have a different homeroom teacher each semester or year
- the same subject can be offered to different classes in the same semester
- marks are stored in the exact class and semester context where they were earned

## Migration mapping from the current schema

- `students.grade` -> `classes(grade_level, section)` through `student_enrollments`
- `students.academic_year` -> `academic_years.year_label`
- `students.semester` -> `semesters.semester_no` or `semesters.semester_name`
- `teachers.assigned_class` -> `homeroom_assignments.class_id`
- `subjects.teacher_id` -> `subject_offerings.teacher_id`
- `marks(student_id, subject_id)` -> `marks(student_enrollment_id, subject_offering_id)`

## Important note

This v2 schema is intentionally separate from the current running app schema, so
you can review and migrate safely without breaking the existing backend code.
