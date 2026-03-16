import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Alert from '../components/Alert.jsx';
import Modal from '../components/Modal.jsx';
import { useApi } from '../hooks/useApi.js';

const EMPTY_SUBJECT = {
  subject_id: null,
  subject_name: '',
  department_id: '',
  teacher_id: ''
};

const EMPTY_DEPARTMENT = {
  department_id: null,
  department_name: ''
};

export default function Subjects() {
  const api = useApi();

  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deptName, setDeptName] = useState('');

  const [pageAlert, setPageAlert] = useState(null);
  const [deptAlert, setDeptAlert] = useState(null);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptModalAlert, setDeptModalAlert] = useState(null);
  const [deptForm, setDeptForm] = useState(EMPTY_DEPARTMENT);
  const deptModalTitle = deptForm.department_id ? 'Edit Department' : 'Add Department';

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAlert, setModalAlert] = useState(null);
  const [subjectForm, setSubjectForm] = useState(EMPTY_SUBJECT);
  const modalTitle = subjectForm.subject_id ? 'Edit Subject' : 'Add Subject';

  const canSave = useMemo(() => {
    return subjectForm.subject_name.trim().length > 0 && subjectForm.department_id !== '';
  }, [subjectForm]);

  const canSaveDepartment = useMemo(() => {
    return deptForm.department_name.trim().length > 0;
  }, [deptForm]);

  const selectedDepartmentId = subjectForm.department_id
    ? Number(subjectForm.department_id)
    : null;
  const eligibleTeachers = useMemo(() => {
    if (!selectedDepartmentId) return [];
    return teachers.filter((t) => Number(t.department_id) === selectedDepartmentId);
  }, [selectedDepartmentId, teachers]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setPageAlert(null);
    setDeptAlert(null);
    try {
      const [depts, teach, subs] = await Promise.all([
        api('/departments'),
        api('/teachers'),
        api('/subjects')
      ]);
      setDepartments(Array.isArray(depts) ? depts : []);
      setTeachers(Array.isArray(teach) ? teach : []);
      setSubjects(Array.isArray(subs) ? subs : []);
    } catch (err) {
      setPageAlert({ type: 'danger', message: err?.message || 'Failed to load subjects' });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function openCreate() {
    setModalAlert(null);
    setSubjectForm(EMPTY_SUBJECT);
    setModalOpen(true);
  }

  function openEdit(subject) {
    setModalAlert(null);
    setSubjectForm({
      subject_id: subject.subject_id,
      subject_name: subject.subject_name ?? '',
      department_id: subject.department_id ?? '',
      teacher_id: subject.teacher_id ?? ''
    });
    setModalOpen(true);
  }

  async function onDeleteSubject(subjectId) {
    const ok = window.confirm('Delete this subject? Marks for this subject will also be deleted.');
    if (!ok) return;

    setPageAlert(null);
    try {
      await api(`/subjects/${subjectId}`, { method: 'DELETE' });
      await loadAll();
      setPageAlert({ type: 'success', message: 'Subject deleted.' });
    } catch (err) {
      setPageAlert({ type: 'danger', message: err?.message || 'Delete failed' });
    }
  }

  async function onSaveSubject() {
    setModalAlert(null);

    const payload = {
      subject_name: subjectForm.subject_name,
      department_id: subjectForm.department_id || null,
      teacher_id: subjectForm.teacher_id || null,
      total_mark: 100
    };

    try {
      if (subjectForm.subject_id) {
        await api(`/subjects/${subjectForm.subject_id}`, { method: 'PUT', body: payload });
        setPageAlert({ type: 'success', message: 'Subject updated.' });
      } else {
        await api('/subjects', { method: 'POST', body: payload });
        setPageAlert({ type: 'success', message: 'Subject created.' });
      }

      setModalOpen(false);
      setSubjectForm(EMPTY_SUBJECT);
      await loadAll();
    } catch (err) {
      setModalAlert({ type: 'danger', message: err?.message || 'Save failed' });
    }
  }

  async function onAddDepartment(e) {
    e.preventDefault();
    setDeptAlert(null);
    try {
      await api('/departments', { method: 'POST', body: { department_name: deptName } });
      setDeptName('');
      await loadAll();
      setDeptAlert({ type: 'success', message: 'Department added.' });
    } catch (err) {
      setDeptAlert({ type: 'danger', message: err?.message || 'Failed to add department' });
    }
  }

  function openEditDepartment(dept) {
    setDeptModalAlert(null);
    setDeptForm({
      department_id: dept.department_id,
      department_name: dept.department_name ?? ''
    });
    setDeptModalOpen(true);
  }

  async function onSaveDepartment() {
    setDeptModalAlert(null);
    if (!canSaveDepartment) {
      setDeptModalAlert({ type: 'warning', message: 'Department name is required.' });
      return;
    }

    try {
      if (deptForm.department_id) {
        await api(`/departments/${deptForm.department_id}`, {
          method: 'PUT',
          body: { department_name: deptForm.department_name }
        });
        setDeptAlert({ type: 'success', message: 'Department updated.' });
      } else {
        await api('/departments', { method: 'POST', body: { department_name: deptForm.department_name } });
        setDeptAlert({ type: 'success', message: 'Department added.' });
      }

      setDeptModalOpen(false);
      setDeptForm(EMPTY_DEPARTMENT);
      await loadAll();
    } catch (err) {
      setDeptModalAlert({ type: 'danger', message: err?.message || 'Save failed' });
    }
  }

  async function onDeleteDepartment(deptId) {
    const ok = window.confirm('Delete this department? Related subjects and teachers may block deletion.');
    if (!ok) return;

    setDeptAlert(null);
    try {
      await api(`/departments/${deptId}`, { method: 'DELETE' });
      await loadAll();
      setDeptAlert({ type: 'success', message: 'Department deleted.' });
    } catch (err) {
      setDeptAlert({ type: 'danger', message: err?.message || 'Delete failed' });
    }
  }

  return (
    <main className="container py-4">
      <div className="mb-3">
        <h1 className="h4 mb-1">Subject Management</h1>
        <div className="text-muted small">Manage departments and subjects (total mark = 100)</div>
      </div>

      <Alert alert={pageAlert} onClose={() => setPageAlert(null)} />

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h2 className="h6 mb-0">Departments</h2>
              </div>

              <Alert alert={deptAlert} onClose={() => setDeptAlert(null)} />

              <form className="d-flex gap-2 mb-3" onSubmit={onAddDepartment}>
                <input
                  className="form-control"
                  placeholder="New department name"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                />
                <button className="btn btn-outline-primary" type="submit">
                  Add
                </button>
              </form>

              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th style={{ width: 150 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-3">
                          Loading...
                        </td>
                      </tr>
                    ) : departments.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-3">
                          No departments yet.
                        </td>
                      </tr>
                    ) : (
                      departments.map((d) => (
                        <tr key={d.department_id}>
                          <td>{d.department_id}</td>
                          <td>{d.department_name}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                type="button"
                                onClick={() => openEditDepartment(d)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                type="button"
                                onClick={() => onDeleteDepartment(d.department_id)}
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
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h2 className="h6 mb-0">Subjects</h2>
            <button className="btn btn-primary btn-sm" type="button" onClick={openCreate}>
              Add Subject
            </button>
          </div>

          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 80 }}>ID</th>
                    <th>Subject</th>
                    <th style={{ width: 160 }}>Department</th>
                    <th style={{ width: 180 }}>Teacher</th>
                    <th style={{ width: 120 }}>Total Mark</th>
                    <th style={{ width: 160 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        Loading...
                      </td>
                    </tr>
                  ) : subjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No subjects found.
                      </td>
                    </tr>
                  ) : (
                    subjects.map((s) => (
                      <tr key={s.subject_id}>
                        <td>{s.subject_id}</td>
                        <td>{s.subject_name}</td>
                        <td>{s.department_name ?? ''}</td>
                        <td>{s.teacher_name ?? ''}</td>
                        <td>{s.total_mark}</td>
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
                              onClick={() => onDeleteSubject(s.subject_id)}
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
        </div>
      </div>

      <Modal
        open={deptModalOpen}
        title={deptModalTitle}
        onClose={() => setDeptModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setDeptModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSaveDepartment}
              disabled={!canSaveDepartment}
            >
              Save
            </button>
          </>
        }
      >
        <Alert alert={deptModalAlert} onClose={() => setDeptModalAlert(null)} />

        <div className="mb-0">
          <label className="form-label" htmlFor="departmentName">
            Department Name
          </label>
          <input
            className="form-control"
            id="departmentName"
            required
            value={deptForm.department_name}
            onChange={(e) => setDeptForm((v) => ({ ...v, department_name: e.target.value }))}
          />
        </div>
      </Modal>

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
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSaveSubject}
              disabled={!canSave}
            >
              Save
            </button>
          </>
        }
      >
        <Alert alert={modalAlert} onClose={() => setModalAlert(null)} />

        <div className="mb-3">
          <label className="form-label" htmlFor="subjectName">
            Subject Name
          </label>
          <input
            className="form-control"
            id="subjectName"
            required
            value={subjectForm.subject_name}
            onChange={(e) => setSubjectForm((v) => ({ ...v, subject_name: e.target.value }))}
          />
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="subjectDepartment">
            Department
          </label>
          <select
            className="form-select"
            id="subjectDepartment"
            required
            value={subjectForm.department_id}
            onChange={(e) =>
              setSubjectForm((v) => ({
                ...v,
                department_id: e.target.value,
                teacher_id: ''
              }))
            }
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.department_id} value={d.department_id}>
                {d.department_name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="subjectTeacher">
            Teacher
          </label>
          <select
            className="form-select"
            id="subjectTeacher"
            value={subjectForm.teacher_id}
            onChange={(e) => setSubjectForm((v) => ({ ...v, teacher_id: e.target.value }))}
            disabled={!selectedDepartmentId}
          >
            <option value="">{selectedDepartmentId ? '(Unassigned)' : 'Select department first'}</option>
            {eligibleTeachers.map((t) => (
              <option key={t.teacher_id} value={t.teacher_id}>
                {t.teacher_name}
              </option>
            ))}
          </select>
          <div className="form-text">Teachers are filtered by the selected department.</div>
        </div>

        <div className="mb-0">
          <label className="form-label" htmlFor="subjectTotalMark">
            Total Mark
          </label>
          <input className="form-control" id="subjectTotalMark" value="100" readOnly />
        </div>
      </Modal>
    </main>
  );
}
