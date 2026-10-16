import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import adminService from '../../services/adminService'
import { getApiErrorMessage } from '../../utils/validation'
import { DONATION_STATUSES } from '../../utils/constants'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import Pagination from '../../components/Pagination'

const PAGE_SIZE = 10

// Only ever send the filter fields the API documents - empty inputs are left
// out completely so they read as "no filter" on the server.
function buildParams(filters, { page, limit } = {}) {
  const params = {}
  if (filters.startDate) params.startDate = filters.startDate
  if (filters.endDate) params.endDate = filters.endDate
  if (filters.status) params.status = filters.status
  if (page) params.page = page
  if (limit) params.limit = limit
  return params
}

// Saves the CSV returned by an export endpoint as a download.
function saveCsv(response, fallbackName) {
  const disposition = response.headers['content-disposition'] || ''
  const match = /filename="([^"]+)"/.exec(disposition)

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = match ? match[1] : fallbackName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Phase 11: donation / collection / complaint reports + CSV exports.
export default function AdminReports() {
  const [draft, setDraft] = useState({ startDate: '', endDate: '', status: '' })
  const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '' })
  const [page, setPage] = useState(1)

  const [overview, setOverview] = useState(null)
  const [donationReport, setDonationReport] = useState(null)
  const [collectionReport, setCollectionReport] = useState(null)
  const [complaintReport, setComplaintReport] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState('')

  // Loads all four reports in parallel (initial load and "Apply filters").
  function loadReports(currentFilters) {
    setLoading(true)
    setError('')

    const range = buildParams(currentFilters)
    const donationParams = { ...range, page: 1, limit: PAGE_SIZE }

    Promise.all([
      adminService.getReportOverview(),
      adminService.getDonationsReport(donationParams),
      adminService.getCollectionsReport(range),
      adminService.getComplaintsReport(range),
    ])
      .then(([overviewRes, donationRes, collectionRes, complaintRes]) => {
        setOverview(overviewRes.data)
        setDonationReport(donationRes.data)
        setCollectionReport(collectionRes.data)
        setComplaintReport(complaintRes.data)
        setPage(1)
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to load the reports.')))
      .finally(() => setLoading(false))
  }

  // Pagination only needs the donation rows again.
  function loadDonationPage(currentFilters, nextPage) {
    setLoading(true)
    setError('')

    adminService
      .getDonationsReport({
        ...buildParams(currentFilters),
        page: nextPage,
        limit: PAGE_SIZE,
      })
      .then((res) => {
        setDonationReport(res.data)
        setPage(nextPage)
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to load the donation report.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadReports({ startDate: '', endDate: '', status: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleApply(event) {
    event.preventDefault()
    setFilters(draft)
    loadReports(draft)
  }

  function handleReset() {
    const empty = { startDate: '', endDate: '', status: '' }
    setDraft(empty)
    setFilters(empty)
    loadReports(empty)
  }

  function handleExport(kind) {
    setExporting(kind)
    setError('')

    const params = buildParams(filters)
    const request =
      kind === 'donations'
        ? adminService.exportDonationsCsv(params)
        : kind === 'collections'
          ? adminService.exportCollectionsCsv(params)
          : adminService.exportComplaintsCsv(params)

    request
      .then((res) => saveCsv(res, `${kind}-report.csv`))
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to export the report.')))
      .finally(() => setExporting(''))
  }

  if (loading) return <LoadingSpinner label="Loading the reports..." />

  const donations = donationReport?.summary
  const collections = collectionReport?.summary
  const complaints = complaintReport?.summary
  const orgs = overview?.organizations
  const users = overview?.users
  const donationRows = donationReport?.donations || []
  const hasFilters = Boolean(filters.startDate || filters.endDate || filters.status)

  const cards = [
    {
      label: 'Donation overview',
      className: 'text-success',
      lines: [
        ['Donations', donations?.total ?? 0],
        ['Items donated', donations?.totalItems ?? 0],
        ['Distributed', donations?.byStatus?.DISTRIBUTED ?? 0],
      ],
    },
    {
      label: 'Collection overview',
      className: 'text-primary',
      lines: [
        ['Collections', collections?.total ?? 0],
        ['Completed', collections?.completed ?? 0],
        ['Awaiting pickup', collections?.pending ?? 0],
      ],
    },
    {
      label: 'Complaint overview',
      className: 'text-warning',
      lines: [
        ['Complaints', complaints?.total ?? 0],
        ['Open', complaints?.open ?? 0],
        ['Resolved', complaints?.resolved ?? 0],
      ],
    },
    {
      label: 'Organization & user summary',
      className: 'text-info',
      lines: [
        ['Organizations', orgs?.total ?? 0],
        ['Approved / pending', `${orgs?.approved ?? 0} / ${orgs?.pending ?? 0}`],
        ['Users (active)', `${users?.total ?? 0} (${users?.active ?? 0})`],
      ],
    },
  ]

  const exportButtons = [
    { kind: 'donations', label: 'Export Donations CSV' },
    { kind: 'collections', label: 'Export Collections CSV' },
    { kind: 'complaints', label: 'Export Complaints CSV' },
  ]

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Reports &amp; exports</h1>
          <p className="text-muted small mb-0">
            Donation, collection and complaint activity with CSV downloads.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/admin" className="btn btn-outline-secondary">
            Back to dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* ---------- Filters ---------- */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6 text-uppercase text-muted mb-3">Filters</h2>
          <form onSubmit={handleApply} className="row g-2 align-items-end">
            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="report-start" className="form-label small text-muted">
                Start date
              </label>
              <input
                id="report-start"
                type="date"
                className="form-control form-control-sm"
                value={draft.startDate}
                onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="report-end" className="form-label small text-muted">
                End date
              </label>
              <input
                id="report-end"
                type="date"
                className="form-control form-control-sm"
                value={draft.endDate}
                onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="report-status" className="form-label small text-muted">
                Donation status
              </label>
              <select
                id="report-status"
                className="form-select form-select-sm"
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              >
                <option value="">All statuses</option>
                {DONATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-3 d-flex flex-wrap gap-2">
              <button type="submit" className="btn btn-success btn-sm">
                Apply filters
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={handleReset}
                disabled={!hasFilters}
              >
                Reset
              </button>
            </div>
          </form>
          <p className="small text-muted mb-0 mt-2">
            Date range applies to donations, collections and complaints. The status filter applies
            to donations. The organization and user summary is always all-time.
          </p>
        </div>
      </div>

      {/* ---------- Overview cards ---------- */}
      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-12 col-md-6 col-xl-3" key={card.label}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h6 text-uppercase text-muted mb-3">{card.label}</h2>
                <ul className="list-unstyled mb-0">
                  {card.lines.map(([label, value]) => (
                    <li
                      className="d-flex justify-content-between align-items-center py-1"
                      key={label}
                    >
                      <span className="small text-muted">{label}</span>
                      <span className={`fw-bold ${card.className}`}>{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4 mb-4">
        {/* ---------- Donations by status ---------- */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-uppercase text-muted mb-3">Donations by status</h2>
              <ul className="list-group list-group-flush">
                {DONATION_STATUSES.map((status) => (
                  <li
                    className="list-group-item d-flex justify-content-between align-items-center px-0"
                    key={status}
                  >
                    <StatusBadge status={status} />
                    <span className="fw-semibold">
                      {donations?.byStatus?.[status] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ---------- Activity over time ---------- */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-uppercase text-muted mb-3">Activity over time</h2>
              <div className="row g-3">
                {[
                  { title: 'Collections per month', rows: collectionReport?.activity || [] },
                  { title: 'Complaints per month', rows: complaintReport?.activity || [] },
                ].map((section) => (
                  <div className="col-12 col-md-6" key={section.title}>
                    <h3 className="small text-muted">{section.title}</h3>
                    {section.rows.length === 0 ? (
                      <p className="small text-muted mb-0">No activity in this range.</p>
                    ) : (
                      <ul className="list-group list-group-flush">
                        {section.rows.map((row) => (
                          <li
                            className="list-group-item d-flex justify-content-between align-items-center px-0"
                            key={row.period}
                          >
                            <span className="small">{row.period}</span>
                            <span className="fw-semibold">{row.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Donation rows ---------- */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3">
            <h2 className="h6 text-uppercase text-muted mb-0">Donation report</h2>
            <span className="small text-muted">
              {donations?.total ?? 0} donation{(donations?.total ?? 0) === 1 ? '' : 's'} in range
            </span>
          </div>

          {donationRows.length === 0 ? (
            <p className="text-muted small mb-0">No donations match the current filters.</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Created</th>
                      <th scope="col">Donor</th>
                      <th scope="col">Organization</th>
                      <th scope="col">Status</th>
                      <th scope="col">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donationRows.map((donation) => (
                      <tr key={donation._id}>
                        <td>{new Date(donation.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div>{donation.donor?.name || '-'}</div>
                          <div className="small text-muted">{donation.donor?.email || '-'}</div>
                        </td>
                        <td>{donation.organization?.organizationName || '-'}</td>
                        <td>
                          <StatusBadge status={donation.status} />
                        </td>
                        <td>{donation.items?.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                pagination={{
                  page,
                  totalPages: donationReport?.pagination?.totalPages ?? 1,
                  total: donationReport?.pagination?.total ?? 0,
                }}
                onPageChange={(nextPage) => loadDonationPage(filters, nextPage)}
              />
            </>
          )}
        </div>
      </div>

      {/* ---------- Exports ---------- */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h2 className="h6 text-uppercase text-muted mb-3">CSV exports</h2>
          <p className="small text-muted mb-3">
            Downloads every matching row as a CSV file. The current date filters are applied to all
            three exports; the donation status filter applies to the donations export.
          </p>
          <div className="d-flex flex-wrap gap-2">
            {exportButtons.map((button) => (
              <button
                key={button.kind}
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => handleExport(button.kind)}
                disabled={exporting === button.kind}
              >
                {exporting === button.kind ? 'Preparing...' : button.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
