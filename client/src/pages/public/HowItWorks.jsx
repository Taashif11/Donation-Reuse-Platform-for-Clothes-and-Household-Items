import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'

const FLOW = [
  { step: 1, text: 'Donor creates an account and completes their profile.' },
  { step: 2, text: 'Donor clicks "Donate Items" and selects a category.' },
  { step: 3, text: 'Donor enters item details, quantity, condition and an optional photo.' },
  { step: 4, text: 'Donor chooses a verified NGO or beneficiary.' },
  { step: 5, text: 'Donor enters the pickup address and selects a date and time.' },
  { step: 6, text: 'The donation request is created with status PENDING.' },
  { step: 7, text: 'The organization reviews the request and accepts or rejects it.' },
  { step: 8, text: 'Once accepted, the donor or the organization schedules the doorstep collection.' },
  { step: 9, text: 'The organization marks the pickup as PICKED_UP when the items are collected.' },
  { step: 10, text: 'The organization marks the items as RECEIVED at its office.' },
  { step: 11, text: 'After distribution the donation becomes DISTRIBUTED and stays in the history.' },
]

const STATUSES = [
  { status: 'PENDING', meaning: 'Donation requested, waiting for the organization to respond.', badge: 'text-bg-secondary' },
  { status: 'ACCEPTED', meaning: 'The organization accepted the donation request.', badge: 'text-bg-primary' },
  { status: 'SCHEDULED', meaning: 'A pickup date and time slot has been agreed.', badge: 'text-bg-info text-dark' },
  { status: 'PICKED_UP', meaning: 'The volunteer collected the items from the donor.', badge: 'text-bg-warning text-dark' },
  { status: 'RECEIVED', meaning: 'The organization confirmed it has the items.', badge: 'text-bg-success' },
  { status: 'DISTRIBUTED', meaning: 'Items were handed over to beneficiaries - the donation is complete.', badge: 'text-bg-success' },
  { status: 'CANCELLED', meaning: 'The donor cancelled an eligible request.', badge: 'text-bg-danger' },
  { status: 'REJECTED', meaning: 'The organization could not accept the request.', badge: 'text-bg-danger' },
]

export default function HowItWorks() {
  return (
    <>
      <PageHeader
        title="How it works"
        subtitle="The complete donation flow, from listing items to a completed donation."
      />

      <section className="page-section bg-white">
        <div className="container">
          <div className="row g-5">
            <div className="col-12 col-lg-7">
              <h2 className="h4 mb-4">The donation flow</h2>
              <ol className="list-group list-group-numbered list-group-flush">
                {FLOW.map((item) => (
                  <li className="list-group-item border-0 ps-0 py-2" key={item.step}>
                    {item.text}
                  </li>
                ))}
              </ol>
            </div>

            <div className="col-12 col-lg-5">
              <h2 className="h4 mb-4">Donation statuses</h2>
              <p className="small text-muted">
                Every donation moves through these statuses so both sides always know
                what is happening.
              </p>
              <div className="d-flex flex-column gap-2">
                {STATUSES.map((item) => (
                  <div className="border rounded p-3 d-flex flex-column" key={item.status}>
                    <span className={`badge align-self-start mb-1 ${item.badge}`}>{item.status}</span>
                    <span className="small text-muted">{item.meaning}</span>
                  </div>
                ))}
              </div>

              <div className="card border-0 shadow-sm mt-4">
                <div className="card-body">
                  <h3 className="h6 mb-2">For organizations</h3>
                  <p className="small text-muted mb-3">
                    Organizations register, submit verification details, wait for admin
                    approval, then receive and accept donation requests, schedule
                    collections and confirm received items.
                  </p>
                  <Link to="/ngos" className="btn btn-outline-success btn-sm">
                    Browse verified NGOs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container text-center">
          <h2 className="h4 mb-3">Start your first donation</h2>
          <p className="text-muted mb-4">
            Creating an account takes a minute. Listing items takes a couple more.
          </p>
          <Link to="/register" className="btn btn-success btn-lg px-4">
            Create free account
          </Link>
        </div>
      </section>
    </>
  )
}
