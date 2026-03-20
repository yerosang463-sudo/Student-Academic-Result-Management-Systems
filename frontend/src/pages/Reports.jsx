import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import Alert from '../components/Alert.jsx';
import { useApi } from '../hooks/useApi.js';

function applyDenseRank(items) {
  const sorted = [...items].sort((a, b) => b.total - a.total);
  let rank = 0;
  let lastTotal = null;
  return sorted.map((report) => {
    if (lastTotal === null || report.total !== lastTotal) {
      rank += 1;
      lastTotal = report.total;
    }
    return { ...report, rank };
  });
}

function classKeyFor(student) {
  const grade = student?.grade ?? '';
  const year = student?.academic_year ?? '';
  const semester = student?.semester ?? '';
  return `${grade}||${year}||${semester}`;
}

export default function Reports() {
  const api = useApi();
  const location = useLocation();

  const activeView = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (view === 'marks' || view === 'class' || view === 'student') return view;
    return 'class';
  }, [location.search]);

  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [reports, setReports] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedClassKey, setSelectedClassKey] = useState('');

  const classOptions = useMemo(() => {
    const map = new Map();
    for (const report of reports) {
      const student = report.student ?? {};
      const key = classKeyFor(student);
      if (!map.has(key)) {
        map.set(key, {
          key,
          grade: student.grade ?? '',
          academic_year: student.academic_year ?? '',
          semester: student.semester ?? ''
        });
      }
    }
    return Array.from(map.values());
  }, [reports]);

  const showRoster = activeView === 'marks' || activeView === 'class';
  const showStudentPanel = activeView === 'student';

  useEffect(() => {
    if (classOptions.length === 0) {
      setSelectedClassKey('');
      return;
    }

    setSelectedClassKey((prev) => {
      if (!prev) return classOptions[0].key;
      const exists = classOptions.some((opt) => opt.key === prev);
      return exists ? prev : classOptions[0].key;
    });
  }, [classOptions]);

  const filteredReports = useMemo(() => {
    if (!selectedClassKey) return reports;
    return reports.filter((r) => classKeyFor(r.student) === selectedClassKey);
  }, [reports, selectedClassKey]);

  const rankedReports = useMemo(() => applyDenseRank(filteredReports), [filteredReports]);

  const tableReports = useMemo(() => {
    if (activeView === 'class') return rankedReports;
    const byName = [...filteredReports];
    byName.sort((a, b) => {
      const nameA = (a.student?.student_name ?? '').toLowerCase();
      const nameB = (b.student?.student_name ?? '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    return byName;
  }, [activeView, filteredReports, rankedReports]);

  const classSummary = useMemo(() => {
    const totalStudents = rankedReports.length;
    const passCount = rankedReports.filter((r) => r.status === 'PASS').length;
    const failCount = totalStudents - passCount;
    const average =
      totalStudents > 0
        ? (rankedReports.reduce((sum, r) => sum + (r.average ?? 0), 0) / totalStudents).toFixed(2)
        : '0.00';
    return { totalStudents, passCount, failCount, average };
  }, [rankedReports]);

  useEffect(() => {
    if (!selectedStudentId) return;
    const id = Number(selectedStudentId);
    if (!rankedReports.some((r) => r.student?.student_id === id)) {
      setSelectedStudentId('');
    }
  }, [rankedReports, selectedStudentId]);

  useEffect(() => {
    if (activeView !== 'student') return;
    if (selectedStudentId) return;
    if (rankedReports.length > 0) {
      setSelectedStudentId(String(rankedReports[0].student.student_id));
    }
  }, [activeView, rankedReports, selectedStudentId]);

  const selectedReport = useMemo(() => {
    const id = selectedStudentId ? Number(selectedStudentId) : null;
    if (!id) return null;
    return rankedReports.find((r) => r.student?.student_id === id) ?? null;
  }, [rankedReports, selectedStudentId]);

  const classMeta = useMemo(() => {
    if (!selectedClassKey) return null;
    const option = classOptions.find((opt) => opt.key === selectedClassKey) ?? null;
    const homeroomName = rankedReports[0]?.homeroom_teacher?.teacher_name ?? '';
    return {
      ...option,
      homeroom_teacher: homeroomName
    };
  }, [classOptions, rankedReports, selectedClassKey]);

  const viewTitle =
    activeView === 'marks'
      ? 'View Student Marks'
      : activeView === 'class'
        ? 'Class Report'
        : 'Individual Report';
  const viewSubtitle =
    activeView === 'marks'
      ? 'Browse subject marks for each student'
      : activeView === 'class'
        ? 'Totals, averages, ranks and PASS/FAIL'
        : 'Generate a single student result sheet';
  const rosterTitle = activeView === 'marks' ? 'Student Marks' : 'Class Report';

  const rosterExtraCols = activeView === 'class' ? 4 : 0;
  const rosterColSpan = 3 + subjects.length + rosterExtraCols;

  const showPrint = activeView === 'class' || activeView === 'student';
  const canPrint =
    activeView === 'class' ? rankedReports.length > 0 : Boolean(selectedReport);
  const printLabel = activeView === 'class' ? 'Print Class Report' : 'Print Student Report';

  const load = useCallback(async () => {
    setLoading(true);
    setAlert(null);
    try {
      const data = await api('/reports');
      const nextReports = Array.isArray(data?.reports) ? data.reports : [];
      const nextSubjects = Array.isArray(data?.subjects) ? data.subjects : [];
      setReports(nextReports);
      setSubjects(nextSubjects);

      setSelectedStudentId((prev) => {
        if (!prev) return '';
        if (nextReports.length === 0) return '';
        const exists = nextReports.some((r) => r.student?.student_id === Number(prev));
        return exists ? prev : '';
      });
      return true;
    } catch (err) {
      setAlert({ type: 'danger', message: err?.message || 'Failed to load reports' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    const ok = await load();
    if (ok) setAlert({ type: 'success', message: 'Reports refreshed.' });
  }, [load]);

  function onPrint() {
    window.print();
  }

  return (
    <main className="container py-4 report-shell">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h4 mb-1">{viewTitle}</h1>
          <div className="text-muted small">{viewSubtitle}</div>
        </div>
        {showPrint ? (
          <button
            className="btn btn-outline-secondary btn-sm"
            type="button"
            onClick={onPrint}
            disabled={!canPrint}
          >
            {printLabel}
          </button>
        ) : null}
      </div>

      <Alert alert={alert} onClose={() => setAlert(null)} />

      <div className="row g-3">
        {showRoster ? (
          <div className="col-12">
            <div className="card shadow-sm roster-card" id="classRoster">
            <div className="roster-banner">
              <div className="roster-title">{rosterTitle}</div>
              <div className="roster-meta">
                Grade: {classMeta?.grade || '-'} | Homeroom Teacher:{' '}
                {classMeta?.homeroom_teacher || 'Not assigned'} | Academic Year:{' '}
                {classMeta?.academic_year || '-'} | Semester: {classMeta?.semester || '-'}
              </div>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-center justify-content-between mb-2 gap-2">
                <div className="small text-muted">
                  {activeView === 'marks' ? 'Student marks' : 'Class ranking'}
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <select
                    className="form-select form-select-sm"
                    style={{ minWidth: 220 }}
                    value={selectedClassKey}
                    onChange={(e) => setSelectedClassKey(e.target.value)}
                    disabled={loading || classOptions.length === 0}
                  >
                    {classOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.grade || 'Grade'} | {opt.academic_year || 'Year'} | {opt.semester || 'Sem'}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-outline-primary btn-sm"
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                  >
                    Refresh
                  </button>
                </div>
              </div>
              {activeView === 'class' ? (
                <div className="d-flex flex-wrap gap-3 small text-muted mb-2">
                  <span>Students: {classSummary.totalStudents}</span>
                  <span>Pass: {classSummary.passCount}</span>
                  <span>Fail: {classSummary.failCount}</span>
                  <span>Class Avg: {classSummary.average}</span>
                </div>
              ) : null}
              <div className="table-responsive">
                <table className="table table-sm table-striped mb-0 roster-table">
                  <thead className="table-light">
                    <tr>
                      <th>Student Name</th>
                      <th style={{ width: 90 }}>Gender</th>
                      <th style={{ width: 110 }}>ID</th>
                      {subjects.map((sub) => (
                        <th key={sub.subject_id} style={{ width: 90 }}>
                          {sub.subject_name}
                        </th>
                      ))}
                      {activeView === 'class' ? (
                        <>
                          <th style={{ width: 90 }}>Total</th>
                          <th style={{ width: 90 }}>Avg</th>
                          <th style={{ width: 80 }}>Rank</th>
                          <th style={{ width: 110 }}>Status</th>
                        </>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={rosterColSpan} className="text-center text-muted py-3">
                          Loading...
                        </td>
                      </tr>
                    ) : tableReports.length === 0 ? (
                      <tr>
                        <td colSpan={rosterColSpan} className="text-center text-muted py-3">
                          No students found.
                        </td>
                      </tr>
                    ) : (
                      tableReports.map((r) => {
                        const marksBySubject = new Map(
                          (r.subjectMarks ?? []).map((m) => [m.subject_id, m.mark])
                        );
                        return (
                          <tr
                            key={r.student.student_id}
                            className="report-row-select"
                            onClick={() => setSelectedStudentId(String(r.student.student_id))}
                          >
                            <td className="fw-semibold">{r.student.student_name}</td>
                            <td>{r.student.gender}</td>
                            <td>{r.student.student_id}</td>
                            {subjects.map((sub) => {
                              const mark = marksBySubject.get(sub.subject_id);
                              const missing = mark === null || mark === undefined || mark === '';
                              const markText = missing ? '-' : String(mark);
                              const markClass = missing
                                ? 'mark-missing'
                                : mark >= 50
                                  ? 'mark-pass'
                                  : 'mark-fail';
                              return (
                                <td key={`${r.student.student_id}-${sub.subject_id}`} className={markClass}>
                                  {markText}
                                </td>
                              );
                            })}
                            {activeView === 'class' ? (
                              <>
                                <td className="fw-semibold">{r.total}</td>
                                <td>{r.average}</td>
                                <td className="fw-semibold">{r.rank}</td>
                                <td>
                                  <span
                                    className={`status-pill ${
                                      r.status === 'PASS' ? 'status-pass' : 'status-fail'
                                    }`}
                                  >
                                    {r.status}
                                  </span>
                                </td>
                              </>
                            ) : null}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </div>
        ) : null}

        {showStudentPanel ? (
          <div className="col-12">
            <div className="card shadow-sm result-card" id="studentResult">
            <div className="card-body">
              <h2 className="h6 mb-3">Student Result Sheet</h2>
              <div className="small text-muted mb-3">
                Class: {classMeta?.grade || '-'} | Homeroom Teacher:{' '}
                {classMeta?.homeroom_teacher || 'Not assigned'} | Academic Year:{' '}
                {classMeta?.academic_year || '-'} | Semester: {classMeta?.semester || '-'}
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="reportStudentSelect">
                  Select Student
                </label>
                <select
                  className="form-select"
                  id="reportStudentSelect"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={loading || rankedReports.length === 0}
                >
                  <option value="">Select...</option>
                  {rankedReports.map((r) => (
                    <option key={r.student.student_id} value={r.student.student_id}>
                      {r.student.student_name} (ID: {r.student.student_id})
                    </option>
                  ))}
                </select>
              </div>

              {selectedReport ? (
                <div id="sheetArea">
                  <div className="small text-muted mb-2" id="sheetHeader">
                    Student: {selectedReport.student.student_name} | ID:{' '}
                    {selectedReport.student.student_id} | Grade:{' '}
                    {selectedReport.student.grade} | Homeroom Teacher:{' '}
                    {selectedReport.homeroom_teacher?.teacher_name ?? 'Not assigned'} | Year:{' '}
                    {selectedReport.student.academic_year} | Semester: {selectedReport.student.semester}
                  </div>

                  <div className="table-responsive">
                    <table className="table table-sm mb-2">
                      <thead className="table-light">
                        <tr>
                          <th>Subject</th>
                          <th style={{ width: 90 }}>Mark</th>
                          <th style={{ width: 90 }}>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedReport.subjectMarks ?? []).map((m) => {
                          const mark = m.mark ?? null;
                          const markText = mark === null ? '-' : String(mark);
                          const result = mark === null ? '-' : mark >= 50 ? 'PASS' : 'FAIL';
                          const cls =
                            result === 'PASS'
                              ? 'text-success'
                              : result === 'FAIL'
                                ? 'text-danger'
                                : 'text-muted';

                          return (
                            <tr key={m.subject_id}>
                              <td>{m.subject_name}</td>
                              <td className="fw-semibold">{markText}</td>
                              <td className={`${cls} fw-semibold`}>{result}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="table-light">
                        <tr>
                          <th>Total</th>
                          <th colSpan={2}>
                            {selectedReport.total} / {selectedReport.total_out_of}
                          </th>
                        </tr>
                        <tr>
                          <th>Average</th>
                          <th colSpan={2}>{selectedReport.average}</th>
                        </tr>
                        <tr>
                          <th>Rank</th>
                          <th colSpan={2}>{selectedReport.rank}</th>
                        </tr>
                        <tr>
                          <th>Status</th>
                          <th
                            colSpan={2}
                            id="sheetStatusCell"
                            className={
                              selectedReport.status === 'PASS'
                                ? 'text-success fw-semibold'
                                : 'text-danger fw-semibold'
                            }
                          >
                            {selectedReport.status}
                          </th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div id="sheetPlaceholder" className="text-muted small">
                  Choose a student to view the report.
                </div>
              )}
            </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
