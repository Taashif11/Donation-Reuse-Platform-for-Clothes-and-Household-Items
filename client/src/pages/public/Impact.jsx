import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'

const OUTCOMES = [
  {
    title: 'Usable items reach people who need them',
    description:
      'Clothes, furniture and household goods that would otherwise be stored or discarded go directly to beneficiaries.',
  },
  {
    title: 'Verified channels instead of guesswork',
    description:
      'Donors choose from organizations approved by the platform team, so donations go where they are meant to.',
  },
  {
    title: 'Less waste, more reuse',
    description:
      'Extending the life of household items reduces disposal and supports reuse within the community.',
  },
  {
    title: 'A record that can be audited',
    description:
      'Every donation has a status history, so donors and organizations can see exactly what happened and when.',
  },
]

export default function Impact() {
  return (
    <>
      <PageHeader
        title="Community impact"
        subtitle="What the platform is built to achieve for donors, organizations and beneficiaries."
      />

      <section className="page-section bg-white">
        <div className="container">
          <div className="row g-4">
            {OUTCOMES.map((item) => (
              <div className="col-12 col-md-6" key={item.title}>
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body p-4">
                    <h2 className="h6 mb-2">{item.title}</h2>
                    <p className="small text-muted mb-0">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-12 col-lg-7">
              <h2 className="h4 mb-3">How impact is measured</h2>
              <p className="text-muted">
                The admin reports module aggregates real platform data: donations by
                month, by category and by city, completed versus pending donations,
                registered donors, verified organizations and collection statistics.
              </p>
              <p className="text-muted">
                Because those numbers come from the live database, this public page does
                not display any statistics of its own. Current figures are available to
                administrators on the reports dashboard once the reporting phase is
                complete.
              </p>
              <div className="d-flex flex-wrap gap-2 mt-3">
                {['Donations by month', 'Donations by category', 'Donations by city', 'Completed vs pending', 'Verified organizations', 'Collection statistics'].map(
                  (report) => (
                    <span className="badge rounded-pill text-bg-light border" key={report}>
                      {report}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <h2 className="h5 mb-3">Be part of it</h2>
                  <p className="small text-muted">
                    Every completed donation is one more household supported. Register as
                    a donor to list items, or as an organization to receive them.
                  </p>
                  <div className="d-flex flex-column gap-2">
                    <Link to="/register" className="btn btn-success">
                      Create an account
                    </Link>
                    <Link to="/how-it-works" className="btn btn-outline-success">
                      See the workflow
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
