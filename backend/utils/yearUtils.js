function parseYearValue(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) return null;
    return value;
  }

  const text = String(value).trim();
  if (!text) return null;

  const match = text.match(/\d{4}/);
  if (!match) return null;

  const year = Number(match[0]);
  if (!Number.isInteger(year)) return null;
  return year;
}

function normalizeSubjectStartYear(value) {
  if (value === null || value === undefined || value === '') {
    return { ok: true, value: null };
  }

  const year = parseYearValue(value);
  if (!year || year < 1900 || year > 2999) {
    return { ok: false, value: null };
  }

  return { ok: true, value: year };
}

function isStudentEligibleForSubject(studentAcademicYear, subjectStartYear) {
  if (subjectStartYear === null || subjectStartYear === undefined) return true;
  const studentYear = parseYearValue(studentAcademicYear);
  if (!studentYear) return false;
  return studentYear >= Number(subjectStartYear);
}

module.exports = {
  parseYearValue,
  normalizeSubjectStartYear,
  isStudentEligibleForSubject
};
