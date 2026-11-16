import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProviderRequestDetailPage from './ProviderRequestDetailPage';
import { getProviderRequest } from '../services/providerRequestsApi';
import { providerRequestFixtures } from '../test/fixtures/providerRequests';
import type { ProviderBorrowRequest } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';
import { addDays, toDateInput } from '../utils/dateValidation';

vi.mock('../services/providerRequestsApi', () => ({
  listProviderActiveLoans: vi.fn(), confirmProviderReturn: vi.fn(), getProviderRequest: vi.fn(),
  listProviderRequests: vi.fn(), approveProviderRequest: vi.fn(), rejectProviderRequest: vi.fn(),
  returnProviderRequest: vi.fn(),
}));

const provider: RegisterResponse = {
  id: 'provider-id', email: 'provider@chula.ac.th', first_name: 'Putter', last_name: 'Test', department: 'Engineering',
  is_provider: true, is_borrower: true, is_admin: false, account_status: 'ACTIVE', date_joined: '',
};
const today = toDateInput(new Date());
const approved: ProviderBorrowRequest = {
  ...providerRequestFixtures[0], status: 'APPROVED', pickup_date: addDays(today, 2), due_date: addDays(today, 5),
  decided_by: 'provider-id', decided_at: '2026-11-15T03:30:00Z',
};

beforeEach(() => { vi.resetAllMocks(); });

describe('US6-2 / US6-3 handover on the provider request detail page', () => {
  it('shows the handover record for an approved request, with no provider checkout button', async () => {
    vi.mocked(getProviderRequest).mockResolvedValue(approved);
    render(<ProviderRequestDetailPage user={provider} requestId={approved.id} />);
    expect(await screen.findByRole('heading', { name: 'Handover' })).toBeInTheDocument();
    expect(screen.getByText(/^Ready for pickup\. Somchai Jaidee confirms pickup/)).toBeInTheDocument();
    expect(screen.getByText('Approved by').nextElementSibling).toHaveTextContent('You');
    // The API offers no provider-side checkout, so the page must not offer one either.
    expect(screen.queryByRole('button', { name: /check ?out|hand ?over|confirm pickup/i })).not.toBeInTheDocument();
  });

  it('shows who collected the equipment once it is checked out, next to the return action', async () => {
    vi.mocked(getProviderRequest).mockResolvedValue({ ...approved, status: 'CHECKED_OUT', pickup_date: addDays(today, -1) });
    render(<ProviderRequestDetailPage user={provider} requestId={approved.id} />);
    expect(await screen.findByText('Handed over. Somchai Jaidee holds the equipment.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm return' })).toBeInTheDocument();
  });

  it('keeps the handover record after the provider has recorded the return', async () => {
    vi.mocked(getProviderRequest).mockResolvedValue({ ...approved, status: 'RETURNED', returned_at: '2026-11-20T02:00:00Z', return_condition: 'Good' });
    render(<ProviderRequestDetailPage user={provider} requestId={approved.id} />);
    expect(await screen.findByText('Handed over and returned.')).toBeInTheDocument();
    expect(screen.getByText('Collected by').nextElementSibling).toHaveTextContent('Somchai Jaidee');
  });

  it('shows no handover section while the request is still pending', async () => {
    vi.mocked(getProviderRequest).mockResolvedValue(providerRequestFixtures[0]);
    render(<ProviderRequestDetailPage user={provider} requestId={providerRequestFixtures[0].id} />);
    expect(await screen.findByText('Electronics lab project')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Handover' })).not.toBeInTheDocument();
  });
});
