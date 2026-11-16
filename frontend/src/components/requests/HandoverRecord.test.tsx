import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HandoverRecord from './HandoverRecord';
import { providerRequestFixtures } from '../../test/fixtures/providerRequests';
import type { ProviderBorrowRequest } from '../../types/borrowRequest';

const TODAY = '2026-11-16';
const approved: ProviderBorrowRequest = {
  ...providerRequestFixtures[0], status: 'APPROVED', pickup_date: '2026-11-18', due_date: '2026-11-21',
  decided_by: 'provider-id', decided_at: '2026-11-15T03:30:00Z',
};
const show = (request: ProviderBorrowRequest, viewerId = 'provider-id') =>
  render(<HandoverRecord request={request} viewerId={viewerId} today={TODAY} />);

describe('US6-2 handover status for the provider', () => {
  it.each(['PENDING', 'REJECTED', 'CANCELLED'] as const)('shows nothing for a %s request', status => {
    const { container } = show({ ...approved, status });
    expect(container).toBeEmptyDOMElement();
  });

  it('says an approved request is ready and that the borrower confirms pickup', () => {
    show(approved);
    expect(screen.getByRole('heading', { name: 'Handover' })).toBeInTheDocument();
    expect(screen.getByText(/^Ready for pickup\. Somchai Jaidee confirms pickup from their request page, up to 18 Nov 2026\./)).toBeInTheDocument();
    expect(screen.getByText('To be collected by').nextElementSibling).toHaveTextContent('Somchai Jaidee');
  });

  it('still counts the pickup date itself as ready', () => {
    show({ ...approved, pickup_date: TODAY });
    expect(screen.getByText(/^Ready for pickup\./)).toBeInTheDocument();
  });

  it('says pickup can no longer be confirmed once the pickup date has passed', () => {
    show({ ...approved, pickup_date: '2026-11-15' });
    expect(screen.getByText(/^The pickup date has passed, so Somchai Jaidee can no longer confirm pickup\./)).toBeInTheDocument();
    expect(screen.queryByText(/Ready for pickup/)).not.toBeInTheDocument();
  });

  it('says pickup is on hold while the equipment is suspended', () => {
    show({ ...approved, equipment: { ...approved.equipment, is_suspended: true, suspension_reason: 'Under review' } });
    expect(screen.getByText('Pickup is on hold while this equipment is suspended.')).toBeInTheDocument();
  });

  it('says pickup is on hold while the borrower account is suspended', () => {
    show({ ...approved, borrower: { ...approved.borrower, account_status: 'SUSPENDED' } });
    expect(screen.getByText("Pickup is on hold while Somchai Jaidee's account is suspended.")).toBeInTheDocument();
    expect(screen.queryByText(/Ready for pickup/)).not.toBeInTheDocument();
  });

  it.each(['MAINTENANCE', 'CHECKED_OUT', 'ARCHIVED'] as const)('does not call it ready while the equipment is %s', status => {
    show({ ...approved, equipment: { ...approved.equipment, status } });
    expect(screen.getByText(/^Pickup is not possible while the equipment is marked /)).toBeInTheDocument();
    expect(screen.queryByText(/Ready for pickup/)).not.toBeInTheDocument();
  });

  it('treats a reserved item as ready, as the server does', () => {
    show({ ...approved, equipment: { ...approved.equipment, status: 'RESERVED' } });
    expect(screen.getByText(/^Ready for pickup\./)).toBeInTheDocument();
  });

  it('says who holds the equipment once the borrower has checked it out', () => {
    show({ ...approved, status: 'CHECKED_OUT' });
    expect(screen.getByText('Handed over. Somchai Jaidee holds the equipment.')).toBeInTheDocument();
    expect(screen.getByText('Collected by').nextElementSibling).toHaveTextContent('Somchai Jaidee');
  });

  it.each(['RETURNED', 'COMPLETED'] as const)('keeps the record after the loan is %s', status => {
    show({ ...approved, status, returned_at: '2026-11-21T02:00:00Z' });
    expect(screen.getByText('Handed over and returned.')).toBeInTheDocument();
    expect(screen.getByText('Collected by').nextElementSibling).toHaveTextContent('Somchai Jaidee');
  });
});

describe('US6-3 recorded approval details', () => {
  it('shows when the request was approved and that the viewer approved it', () => {
    show(approved);
    expect(screen.getByText('Approved on').nextElementSibling).toHaveTextContent(new Date('2026-11-15T03:30:00Z').toLocaleString('en-GB'));
    expect(screen.getByText('Approved by').nextElementSibling).toHaveTextContent('You');
    expect(screen.getByText('Planned pickup date').nextElementSibling).toHaveTextContent('18 Nov 2026');
  });

  it('does not claim the viewer approved a request someone else decided', () => {
    show(approved, 'someone-else');
    expect(screen.getByText('Approved by').nextElementSibling).toHaveTextContent('Another account');
  });

  it('leaves out approval rows the API did not send', () => {
    show({ ...approved, decided_by: null, decided_at: null });
    expect(screen.queryByText('Approved on')).not.toBeInTheDocument();
    expect(screen.queryByText('Approved by')).not.toBeInTheDocument();
  });
});
