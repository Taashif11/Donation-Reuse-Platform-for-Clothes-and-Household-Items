// Tiny CSV writer used by the Phase 11 admin exports.
// Deliberately dependency free: a CSV file is just comma separated text with
// quotes around any value that itself contains a comma, quote or line break.

function escapeCell(value) {
  if (value === null || value === undefined) return ''

  const text = value instanceof Date ? value.toISOString() : String(value)

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

// headers: array of column titles, rows: array of arrays (same length).
function toCsv(headers, rows) {
  const lines = [headers.map(escapeCell).join(',')]

  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','))
  }

  return `${lines.join('\r\n')}\r\n`
}

// Sends the CSV as a browser download with the standard attachment headers.
function sendCsv(res, filename, headers, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  return res.status(200).send(toCsv(headers, rows))
}

module.exports = { toCsv, sendCsv };
