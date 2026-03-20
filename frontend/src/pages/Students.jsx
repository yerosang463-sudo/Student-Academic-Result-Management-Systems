import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Alert from '../components/Alert.jsx';
import Modal from '../components/Modal.jsx';
import { useApi } from '../hooks/useApi.js';

const EMPTY_FORM = {
  student_id: null,
  student_name: '',
  gender: '',
  grade: '',
  academic_year: '',
  semester: ''
};

export default function Students() {
  const api = useApi();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageAlert, setPageAlert] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAlert, setModalAlert] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const modalTitle = form.student_id ? 'Edit Student' : 'Add Student';

  const canSave = useMemo(() => {
    return (
      form.student_name.trim().length > 0 &&
      ['Male', 'Female', 'Other'].includes(form.gender) &&
      form.grade.trim().length > 0 &&
      form.academic_year.trim().length > 0 &&
      form.semester.trim().length > 0
    );
  }, [form]);

  const load = useCallback(async () => {
    setLoading(true);
    setPageAlert(null);
    try {
      const data = await api('/students');
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      setPageAlert({ type: 'danger', message: err?.message || 'Failed to load students' });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setModalAlert(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(student) {
    setModalAlert(null);
    setForm({
      student_id: student.student_id,
      student_name: student.student_name ?? '',
      gender: student.gender ?? '',
      grade: student.grade ?? '',
      academic_year: student.academic_year ?? '',
      semester: student.semester ?? ''
    });
    setModalOpen(true);
  }

  async function onDelete(studentId) {
    const ok = window.confirm('Delete this student? Marks will also be deleted.');
    if (!ok) return;

    setPageAlert(null);
    try {
      await api(`/students/${studentId}`, { method: 'DELETE' });
      await load();
      setPageAlert({ type: 'success', message: 'Student deleted.' });
    } catch (err) {
      setPageAlert({ type: 'danger', message: err?.message || 'Delete failed' });
    }
  }

  async function onSave() {
    setModalAlert(null);

    const payload = {
      student_name: form.student_name,
      gender: form.gender,
      grade: form.grade,
      academic_year: form.academic_year,
      semester: form.semester
    };

    try {
      if (form.student_id) {
        await api(`/students/${form.student_id}`, { method: 'PUT', body: payload });
        setPageAlert({ type: 'success', message: 'Student updated.' });
      } else {
        await api('/students', { method: 'POST', body: payload });
        setPageAlert({ type: 'success', message: 'Student created.' });
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setModalAlert({ type: 'danger', message: err?.message || 'Save failed' });
    }
  }

  return (
    <main className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h4 mb-1">Student Management</h1>
          <div className="text-muted small">Register and manage student records</div>
        </div>
        <button className="btn btn-primary" type="button" onClick={openCreate}>
          Add Student
        </button>
      </div>

      <Alert alert={pageAlert} onClose={() => setPageAlert(null)} />

      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-striped mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 140 }}>ID</th>
                <th>Name</th>
                <th style={{ width: 120 }}>Gender</th>
                <th style={{ width: 120 }}>Grade</th>
                <th style={{ width: 140 }}>Academic Year</th>
                <th style={{ width: 120 }}>Semester</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    Loading...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.student_id}>
                    <td>{s.student_id}</td>
                    <td>{s.student_name}</td>
                    <td>{s.gender}</td>
                    <td>{s.grade}</td>
                    <td>{s.academic_year}</td>
                    <td>{s.semester}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          type="button"
                          onClick={() => openEdit(s)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          type="button"
                          onClick={() => onDelete(s.student_id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={!canSave}>
              Save
            </button>
          </>
        }
      >
        <Alert alert={modalAlert} onClose={() => setModalAlert(null)} />

        <div className="mb-3">
          <label className="form-label" htmlFor="studentName">
            Student Name
          </label>
          <input
            className="form-control"
            id="studentName"
            required
            value={form.student_name}
            onChange={(e) => setForm((v) => ({ ...v, student_name: e.target.value }))}
          />
        </div>

        <div className="mb-3">
          <div className="form-text">
            Student ID is generated automatically by the system.
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="studentGender">
            Gender
          </label>
          <select
            className="form-select"
            id="studentGender"
            required
            value={form.gender}
            onChange={(e) => setForm((v) => ({ ...v, gender: e.target.value }))}
          >
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="studentGrade">
            Grade
          </label>
          <input
            className="form-control"
            id="studentGrade"
            required
            placeholder="e.g., Grade 10"
            value={form.grade}
            onChange={(e) => setForm((v) => ({ ...v, grade: e.target.value }))}
          />
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="academicYear">
            Academic Year
          </label>
          <input
            className="form-control"
            id="academicYear"
            required
            placeholder="e.g., 2025/2026"
            value={form.academic_year}
            onChange={(e) => setForm((v) => ({ ...v, academic_year: e.target.value }))}
          />
        </div>

        <div className="mb-0">
          <label className="form-label" htmlFor="semester">
            Semester
          </label>
          <input
            className="form-control"
            id="semester"
            required
            placeholder="e.g., 1"
            value={form.semester}
            onChange={(e) => setForm((v) => ({ ...v, semester: e.target.value }))}
          />
        </div>
      </Modal>
    </main>
  );
}
