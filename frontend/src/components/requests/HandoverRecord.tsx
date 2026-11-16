import type { ProviderBorrowRequest } from '../../types/borrowRequest';
import { borrowerLabel, dateLabel } from '../../types/borrowRequest';
import { STATUS_LABELS } from '../../types/equipment';
import { serverToday } from '../../utils/serverDate';

export default function HandoverRecord({ request, viewerId, today = serverToday() }: {
  request: ProviderBorrowRequest; viewerId: string; today?: string;
}) {
  // RETURNED is what the server sets when the provider records a return; COMPLETED is its
  // older name and still exists on legacy requests.
  const returned = request.status === 'RETURNED' || request.status === 'COMPLETED';
  if (request.status !== 'APPROVED' && request.status !== 'CHECKED_OUT' && !returned) return null;
  const borrower = borrowerLabel(request.borrower);
  const { equipment } = request;
  let summary: string;
  if (request.status === 'CHECKED_OUT') summary = `Handed over. ${borrower} holds the equipment.`;
  else if (returned) summary = 'Handed over and returned.';
  // From here the request is APPROVED. Each branch mirrors a reason the server gives for
  // refusing the borrower's checkout, in the order a provider can act on them.
  else if (request.borrower.account_status === 'SUSPENDED') summary = `Pickup is on hold while ${borrower}'s account is suspended.`;
  else if (equipment.is_suspended) summary = 'Pickup is on hold while this equipment is suspended.';
  else if (request.pickup_date < today) summary = `The pickup date has passed, so ${borrower} can no longer collect this request. A new request with new dates is needed.`;
  else if (equipment.status !== 'AVAILABLE' && equipment.status !== 'RESERVED') summary = `Pickup is not possible while the equipment is marked ${STATUS_LABELS[equipment.status].toLowerCase()}.`;
  else summary = `Ready for pickup. Confirm handover when ${borrower} collects the equipment, up to ${dateLabel(request.pickup_date)}. This request then shows as checked out.`;
  return (
    <section className="provider-handover" aria-labelledby="handover-title">
      <h2 id="handover-title">Handover</h2>
      <p className="provider-handover-summary">{summary}</p>
      <dl className="provider-request-detail-grid">
        {request.checkout_record ? <>
          <div><dt>Picked up at</dt><dd>{new Date(request.checkout_record.checkout_at).toLocaleString('en-GB')}</dd></div>
          <div><dt>Handed over by</dt><dd>{borrowerLabel(request.checkout_record.handover_person)}</dd></div>
        </> : request.status !== 'APPROVED' && <div><dt>Handover record</dt><dd>Not recorded for this legacy loan.</dd></div>}

        <div><dt>{request.status === 'APPROVED' ? 'To be collected by' : 'Collected by'}</dt><dd>{borrower}</dd></div>
        <div><dt>Planned pickup date</dt><dd>{dateLabel(request.pickup_date)}</dd></div>
        {request.decided_at && (
          <div><dt>Approved on</dt><dd>{new Date(request.decided_at).toLocaleString('en-GB')}</dd></div>
        )}
        {request.decided_by && (
          <div><dt>Approved by</dt><dd>{request.decided_by === viewerId ? 'You' : 'Another account'}</dd></div>
        )}
      </dl>
    </section>
  );
}
