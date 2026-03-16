import React from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = user?.teacher_name ?? user?.username ?? '';
  const role = user?.role ?? 'Admin';

  if (role === 'Subject Teacher') {
    return (
      <main className="container py-4 dashboard-shell">
        <div className="d-flex align-items-center justify-content-between mb-3 dashboard-head">
          <div>
            <h1 className="h4 mb-1">Teacher Dashboard</h1>
            <div className="text-muted small">Enter marks for your subject</div>
          </div>
          <div className="text-muted small" id="adminLabel">
            {displayName ? `Logged in as: ${displayName}` : ''}
          </div>
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-6 col-lg-4">
            <Link className="card-link" to="/marks">
              <div className="card shadow-sm h-100 feature-tile">
                <div className="card-body">
                  <div className="h5 mb-1">Enter Marks</div>
                  <div className="text-muted">Select class, semester, and record marks</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (role === 'Homeroom Teacher') {
    return (
      <main className="container py-4 dashboard-shell">
        <div className="d-flex align-items-center justify-content-between mb-3 dashboard-head">
          <div>
            <h1 className="h4 mb-1">Homeroom Dashboard</h1>
            <div className="text-muted small">
              Compile results and generate student reports
              {user?.assigned_class ? ` | Class: ${user.assigned_class}` : ''}
            </div>
          </div>
          <div className="text-muted small" id="adminLabel">
            {displayName ? `Logged in as: ${displayName}` : ''}
          </div>
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-6 col-lg-4">
            <Link className="card-link" to="/reports?view=marks">
              <div className="card shadow-sm h-100 feature-tile">
                <div className="card-body">
                  <div className="h5 mb-1">View Student Marks</div>
                  <div className="text-muted">See subject marks for each student</div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col-12 col-md-6 col-lg-4">
            <Link className="card-link" to="/reports?view=class">
              <div className="card shadow-sm h-100 feature-tile">
                <div className="card-body">
                  <div className="h5 mb-1">Generate Class Report</div>
                  <div className="text-muted">View totals, averages, and rankings</div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col-12 col-md-6 col-lg-4">
            <Link className="card-link" to="/reports?view=student">
              <div className="card shadow-sm h-100 feature-tile">
                <div className="card-body">
                  <div className="h5 mb-1">Generate Individual Report</div>
                  <div className="text-muted">Open a student result sheet</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container py-4 dashboard-shell">
      <div className="d-flex align-items-center justify-content-between mb-3 dashboard-head">
        <div>
          <h1 className="h4 mb-1">Dashboard</h1>
          <div className="text-muted small">Manage students, subjects, teachers, and homeroom</div>
        </div>
        <div className="text-muted small" id="adminLabel">
          {displayName ? `Logged in as: ${displayName}` : ''}
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-6 col-lg-4">
          <Link className="card-link" to="/students">
            <div className="card shadow-sm h-100 feature-tile">
              <div className="card-body">
                <div className="h5 mb-1">Students</div>
                <div className="text-muted">Register, update and delete student records</div>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <Link className="card-link" to="/subjects">
            <div className="card shadow-sm h-100 feature-tile">
              <div className="card-body">
                <div className="h5 mb-1">Subjects</div>
                <div className="text-muted">Manage subjects and departments</div>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <Link className="card-link" to="/teachers">
            <div className="card shadow-sm h-100 feature-tile">
              <div className="card-body">
                <div className="h5 mb-1">Teachers</div>
                <div className="text-muted">Register teachers and assign roles/classes</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
