import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'

// Shared table for donation lists (donor history, organization inbox).
// basePath decides which dashboard the "View" link opens (default: donor).
export default function DonationTable({ donations, basePath = '/donor', donorColumn = false }) {
  return (
    <div className="table-responsive">
      <table className="table align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th scope="col">Date</th>
            <th scope="col">{donorColumn ? 'Donor' : 'Organization'}</th>
            <th scope="col">Quantity</th>
            <th scope="col">Pickup</th>
            <th scope="col">Status</th>
            <th scope="col" className="text-end">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {donations.map((donation) => {
            const totalQuantity = (donation.items || []).reduce(
              (sum, item) => sum + (item.quantity || 0),
              0
            )

            return (
              <tr key={donation._id}>
                <td>{new Date(donation.createdAt).toLocaleDateString()}</td>
                <td>
                  {donorColumn
                    ? donation.donor?.name || '-'
                    : donation.organization?.organizationName || '-'}
                </td>
                <td>{totalQuantity}</td>
                <td>
                  {donation.scheduledDate
                    ? new Date(donation.scheduledDate).toLocaleDateString()
                    : 'Not scheduled'}
                </td>
                <td>
                  <StatusBadge status={donation.status} />
                </td>
                <td className="text-end">
                  <Link
                    to={`${basePath}/donations/${donation._id}`}
                    className="btn btn-sm btn-outline-success"
                  >
                    View
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
