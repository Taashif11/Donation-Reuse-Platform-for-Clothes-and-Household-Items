import { DONATION_STAGES } from '../utils/constants'

function historyDate(donation, stage) {
  const entry = (donation.statusHistory || []).find((item) => item.status === stage)
  if (!entry) return null
  return new Date(entry.changedAt).toLocaleString()
}

// Ordered lifecycle timeline: every stage plus "when" it happened.
// Terminal states (CANCELLED/REJECTED) are shown by the page's own alert.
export default function DonationProgress({ donation }) {
  const currentIndex = DONATION_STAGES.indexOf(donation.status)
  const isTerminal = donation.status === 'CANCELLED' || donation.status === 'REJECTED'

  return (
    <ol className="list-group list-group-numbered list-group-flush mb-0">
      {DONATION_STAGES.map((stage, index) => {
        let className = 'list-group-item d-flex justify-content-between align-items-center'
        if (isTerminal || index > currentIndex) {
          className += ' text-muted'
        } else {
          className += ' fw-semibold'
        }

        const when = historyDate(donation, stage)

        return (
          <li className={className} key={stage}>
            <span>
              {stage.replace(/_/g, ' ')}
              {when && <span className="text-muted fw-normal small ms-2">{when}</span>}
            </span>
            {!isTerminal && index === currentIndex && (
              <span className="badge text-bg-success">Current</span>
            )}
            {!isTerminal && index < currentIndex && (
              <span className="badge text-bg-light text-success">Done</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
