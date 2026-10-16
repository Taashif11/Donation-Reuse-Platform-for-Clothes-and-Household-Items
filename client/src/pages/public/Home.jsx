import { Link } from 'react-router-dom'

const STEPS = [
  {
    title: 'List your items',
    description: 'Choose a category, add quantities, condition and a photo of the items you want to give away.',
  },
  {
    title: 'Pick a verified NGO',
    description: 'Choose from verified NGOs and beneficiaries that accept your type of items in your city.',
  },
  {
    title: 'Schedule a pickup',
    description: 'Enter your pickup address and pick a convenient date and time for doorstep collection.',
  },
  {
    title: 'Track to completion',
    description: 'Follow every status update until the NGO confirms the items have been received.',
  },
]

const VALUES = [
  {
    title: 'Verified organizations only',
    description: 'Every NGO and beneficiary is reviewed and approved by the platform team before donors can select it.',
  },
  {
    title: 'Doorstep collection',
    description: 'No trips to drop-off points. Schedule a pickup and follow its status in real time.',
  },
  {
    title: 'Transparent tracking',
    description: 'Each donation moves through clear statuses - pending, accepted, scheduled, picked up, received, distributed.',
  },
]

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="hero-section">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-12 col-lg-7">
              <span className="badge text-bg-light mb-3">In-kind donations only - no payments</span>
              <h1 className="display-5 fw-bold mb-3">
                Give your unused items a second home
              </h1>
              <p className="lead mb-4">
                DonateReuse connects households with verified NGOs and beneficiaries.
                List your clothes and household items, schedule a doorstep pickup and
                follow your donation all the way to completion.
              </p>
              <div className="d-flex flex-column flex-sm-row gap-2 mb-4">
                <Link to="/register" className="btn btn-light btn-lg px-4">
                  Start Donating
                </Link>
                <Link to="/ngos" className="btn btn-outline-light btn-lg px-4">
                  Browse NGOs
                </Link>
              </div>
              <p className="small mb-0 opacity-75">
                Donors, NGOs and beneficiaries register free. Admins verify every organization.
              </p>
            </div>

            <div className="col-12 col-lg-5">
              <div className="card border-0 shadow hero-card">
                <div className="card-body p-4">
                  <h2 className="h6 text-uppercase text-muted mb-3">Why people use it</h2>
                  <ul className="list-unstyled mb-0">
                    {VALUES.map((value) => (
                      <li key={value.title} className="d-flex mb-3">
                        <span className="check-dot me-3" aria-hidden="true"></span>
                        <div>
                          <strong className="d-block">{value.title}</strong>
                          <span className="small text-muted">{value.description}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="page-section bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="h3 mb-2">How it works</h2>
            <p className="text-muted mb-0">Four simple steps from listing to completion.</p>
          </div>

          <div className="row g-4">
            {STEPS.map((step, index) => (
              <div className="col-12 col-sm-6 col-lg-3" key={step.title}>
                <div className="card h-100 border-0 shadow-sm step-card">
                  <div className="card-body p-4">
                    <span className="step-number">{index + 1}</span>
                    <h3 className="h6 mt-3 mb-2">{step.title}</h3>
                    <p className="small text-muted mb-0">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-4">
            <Link to="/how-it-works" className="btn btn-outline-success">
              See the full workflow
            </Link>
          </div>
        </div>
      </section>

      {/* What you can donate */}
      <section className="page-section">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-12 col-lg-6">
              <h2 className="h3 mb-3">What you can donate</h2>
              <p className="text-muted">
                If it is usable and you no longer need it, an organization probably can.
                Common categories include clothes, footwear, books, kitchen items,
                furniture, general household items, toys, blankets and bags.
              </p>
              <p className="text-muted">
                Every item is listed with its condition - new, like new, good or usable -
                so receiving organizations know exactly what to expect.
              </p>
              <div className="d-flex flex-wrap gap-2 mt-3">
                {['Clothing', 'Footwear', 'Books', 'Kitchen Items', 'Furniture', 'Household Items', 'Toys', 'Blankets', 'Bags'].map(
                  (category) => (
                    <span className="badge rounded-pill text-bg-light border" key={category}>
                      {category}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <h3 className="h5 mb-3">Who receives your donation</h3>
                  <p className="small text-muted">
                    NGOs, orphanages and registered beneficiaries create an organization
                    profile and submit verification details. Nothing goes live to donors
                    until an admin approves it.
                  </p>
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex align-items-center justify-content-between border rounded p-3">
                      <span>Organization registers</span>
                      <span className="badge text-bg-secondary">Pending</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between border rounded p-3">
                      <span>Admin reviews details</span>
                      <span className="badge text-bg-warning text-dark">In review</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between border rounded p-3">
                      <span>Visible to donors</span>
                      <span className="badge text-bg-success">Verified</span>
                    </div>
                  </div>
                  <Link to="/register" className="btn btn-success mt-4">
                    Register an organization
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band text-white">
        <div className="container text-center py-5">
          <h2 className="h3 mb-3">Ready to clear out some space?</h2>
          <p className="mb-4 mx-auto" style={{ maxWidth: '36rem' }}>
            Create a free account, list your items in a couple of minutes and let a
            verified organization collect them from your doorstep.
          </p>
          <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
            <Link to="/register" className="btn btn-light btn-lg px-4">
              Create free account
            </Link>
            <Link to="/contact" className="btn btn-outline-light btn-lg px-4">
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
