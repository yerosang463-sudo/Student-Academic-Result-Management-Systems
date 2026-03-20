import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Alert from '../components/Alert.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../auth/AuthProvider.jsx';

function computeStatus(value) {
  if (value === '') return { text: '-', cls: 'text-muted fw-semibold' };
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    return { text: 'Invalid', cls: 'text-warning fw-semibold' };
  }
  if (num >= 50) return { text: 'PASS', cls: 'text-success fw-semibold' };
  return { text: 'FAIL', cls: 'text-danger fw-semibold' };
}

function sortText(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export default function Marks() {
  const api = useApi();
  const { user } = useAuth();

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const [marksByStudent, setMarksByStudent] = useState({});

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState(null);

  const classOptions = useMemo(() => {
    const set = new Set();
    students.forEach((student) => {
      const grade = String(student.grade ?? '').trim();
      if (grade) set.add(grade);
    });
    return Array.from(set).sort(sortText);
  }, [students]);

  const semesterOptions = useMemo(() => {
    const set = new Set();
    students.forEach((student) => {
      const semester = String(student.semester ?? '').trim();
      if (semester) set.add(semester);
    });
    return Array.from(set).sort(sortText);
  }, [students]);

  const subjectOptions = useMemo(() => {
    return subjects
      .map((subject) => ({
        id: String(subject.subject_id),
        name: subject.subject_name
      }))
      .sort((a, b) => sortText(a.name, b.name));
  }, [subjects]);

  useEffect(() => {
    if (classOptions.length === 0) {
      setSelectedClass('');
      return;
    }
    setSelectedClass((prev) => (prev && classOptions.includes(prev) ? prev : classOptions[0]));
  }, [classOptions]);

  useEffect(() => {
    if (semesterOptions.length === 0) {
      setSelectedSemester('');
      return;
    }
    setSelectedSemester((prev) =>
      prev && semesterOptions.includes(prev) ? prev : semesterOptions[0]
    );
  }, [semesterOptions]);

  useEffect(() => {
    if (subjectOptions.length === 0) {
      setSelectedSubjectId('');
      return;
    }
    setSelectedSubjectId((prev) => {
      if (!prev) return subjectOptions[0].id;
      const exists = subjectOptions.some((opt) => opt.id === prev);
      return exists ? prev : subjectOptions[0].id;
    });
  }, [subjectOptions]);

  const filteredStudents = useMemo(() => {
    if (!selectedClass || !selectedSemester) return [];
    return students.filter((student) => {
      const grade = String(student.grade ?? '').trim();
      const semester = String(student.semester ?? '').trim();
      return grade === selectedClass && semester === selectedSemester;
    });
  }, [students, selectedClass, selectedSemester]);

  const selectedSubjectName = useMemo(() => {
    return subjects.find((subject) => String(subject.subject_id) === selectedSubjectId)
      ?.subject_name;
  }, [subjects, selectedSubjectId]);

  const canInteract = useMemo(() => {
    return !!selectedSubjectId && !!selectedClass && !!selectedSemester && !busy;
  }, [busy, selectedClass, selectedSemester, selectedSubjectId]);

  const canRefresh = useMemo(() => !loading && !busy, [loading, busy]);

  const noSubjectsAssigned =
    !loading && subjectOptions.length === 0 && user?.role === 'Subject Teacher';

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setAlert(null);
    try {
      const [st, sb] = await Promise.all([api('/students'), api('/subjects')]);
      setStudents(Array.isArray(st) ? st : []);
      setSubjects(Array.isArray(sb) ? sb : []);
    } catch (err) {
      setAlert({ type: 'danger', message: err?.message || 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadMarks = useCallback(
    async (subjectId) => {
      if (!subjectId) {
        setMarksByStudent({});
        return;
      }
      const data = await api(`/marks?subject_id=${encodeURIComponent(subjectId)}`);
      const map = {};
      for (const item of Array.isArray(data) ? data : []) {
        map[item.student_id] = String(item.mark);
      }
      setMarksByStudent(map);
    },
    [api]
  );

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!selectedSubjectId) {
      setMarksByStudent({});
      return;
    }

    loadMarks(selectedSubjectId).catch((err) => {
      setAlert({ type: 'danger', message: err?.message || 'Failed to load marks' });
    });
  }, [selectedSubjectId, loadMarks]);

  const onSave = useCallback(async () => {
    setAlert(null);

    if (!selectedSubjectId) {
      setAlert({ type: 'warning', message: 'Select a subject before saving.' });
      return;
    }

    if (!selectedClass || !selectedSemester) {
      setAlert({ type: 'warning', message: 'Select a class and semester.' });
      return;
    }

    if (filteredStudents.length === 0) {
      setAlert({ type: 'warning', message: 'No students found for this class and semester.' });
      return;
    }

    const payloadMarks = [];
    for (const student of filteredStudents) {
      const raw = marksByStudent[student.student_id] ?? '';
      if (raw === '') {
        setAlert({ type: 'warning', message: 'Enter marks for all students before saving.' });
        return;
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        setAlert({ type: 'warning', message: 'Marks must be between 0 and 100.' });
        return;
      }
      payloadMarks.push({ student_id: student.student_id, mark: Math.trunc(value) });
    }

    setBusy(true);
    try {
      await api('/marks/bulk', {
        method: 'POST',
        body: { subject_id: Number(selectedSubjectId), marks: payloadMarks }
      });
      await loadMarks(selectedSubjectId);
      setAlert({ type: 'success', message: 'Marks saved.' });
    } catch (err) {
      setAlert({ type: 'danger', message: err?.message || 'Save failed' });
    } finally {
      setBusy(false);
    }
  }, [api, filteredStudents, loadMarks, marksByStudent, selectedClass, selectedSemester, selectedSubjectId]);

  const onReload = useCallback(async () => {
    setAlert(null);
    setBusy(true);
    try {
      await loadInitial();
      if (selectedSubjectId) {
        await loadMarks(selectedSubjectId);
      }
      setAlert({ type: 'success', message: 'Data refreshed.' });
    } catch (err) {
      setAlert({ type: 'danger', message: err?.message || 'Failed to refresh data' });
    } finally {
      setBusy(false);
    }
  }, [loadInitial, loadMarks, selectedSubjectId]);

  return (
    <main className="container py-4">
      <div className="mb-3">
        <h1 className="h4 mb-1">Mark Entry</h1>
        <div className="text-muted small">
          Select class, subject, and semester, then enter marks for each student.
        </div>
        {user?.teacher_name ? (
          <div className="text-muted small">Teacher: {user.teacher_name}</div>
        ) : null}
      </div>

      {noSubjectsAssigned ? (
        <div className="alert alert-warning" role="alert">
          No subjects are assigned to your account yet. Ask the admin to assign a subject in
          the Subject Management page.
        </div>
      ) : null}

      <div className="row g-3 align-items-end mb-3">
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="markClassSelect">
            Class
          </label>
          <select
            className="form-select"
            id="markClassSelect"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={loading || busy}
          >
            <option value="">Select class...</option>
            {classOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="markSubjectSelect">
            Subject
          </label>
          <select
            className="form-select"
            id="markSubjectSelect"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            disabled={loading || busy}
          >
            <option value="">Select subject...</option>
            {subjectOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="markSemesterSelect">
            Semester
          </label>
          <select
            className="form-select"
            id="markSemesterSelect"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            disabled={loading || busy}
          >
            <option value="">Select semester...</option>
            {semesterOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 d-flex gap-2">
          <button className="btn btn-primary" type="button" onClick={onSave} disabled={!canInteract}>
            Save Marks
          </button>
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={onReload}
            disabled={!canRefresh}
          >
            Refresh Data
          </button>
        </div>
      </div>

      <Alert alert={alert} onClose={() => setAlert(null)} />

      <div className="card shadow-sm">
        <div className="card-header bg-white d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="fw-semibold">
            {selectedSubjectName ? `Subject: ${selectedSubjectName}` : 'Subject: -'}
          </div>
          <div className="text-muted small">
            {selectedClass && selectedSemester
              ? `Class ${selectedClass} | Semester ${selectedSemester}`
              : 'Select class and semester'}
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-striped mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 110 }}>Student ID</th>
                <th>Student Name</th>
                <th style={{ width: 160 }}>Mark</th>
                <th style={{ width: 120 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    Loading...
                  </td>
                </tr>
              ) : !selectedSubjectId ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    Select a subject to begin.
                  </td>
                </tr>
              ) : !selectedClass || !selectedSemester ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    Select a class and semester to view students.
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    No students found for this class and semester.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const value = marksByStudent[student.student_id] ?? '';
                  const status = computeStatus(value);
                  return (
                    <tr key={student.student_id}>
                      <td>{student.student_id}</td>
                      <td>{student.student_name}</td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm mark-input"
                          min="0"
                          max="100"
                          step="1"
                          value={value}
                          placeholder="0-100"
                          required
                          disabled={!canInteract}
                          onChange={(e) =>
                            setMarksByStudent((prev) => ({
                              ...prev,
                              [student.student_id]: e.target.value
                            }))
                          }
                        />
                      </td>
                      <td className={status.cls}>{status.text}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
