import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProviderReturnsPage from './ProviderReturnsPage';
import ProviderRequestDetailPage from './ProviderRequestDetailPage';
import { confirmProviderReturn, getProviderRequest, listProviderActiveLoans } from '../services/providerRequestsApi';
import { providerRequestFixtures } from '../test/fixtures/providerRequests';
import { ProviderRequestError } from '../types/borrowRequest';
import type { ProviderBorrowRequest } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';
import { addDays, toDateInput } from '../utils/dateValidation';

vi.mock('../services/providerRequestsApi', () => ({
  listProviderActiveLoans: vi.fn(), confirmProviderReturn: vi.fn(), getProviderRequest: vi.fn(),
  listProviderRequests: vi.fn(), approveProviderRequest: vi.fn(), rejectProviderRequest: vi.fn(),
}));

const provider: RegisterResponse = {
  id: 'provider-id', email: 'provider@chula.ac.th', first_name: 'Putter', last_name: 'Test', department: 'Engineering',
  is_provider: true, is_borrower: true, is_admin: false, account_status: 'ACTIVE', date_joined: '',
};
const today = toDateInput(new Date());
const loan: ProviderBorrowRequest = {
  ...providerRequestFixtures[0], status: 'CHECKED_OUT',
  pickup_date: addDays(today, -3), due_date: addDays(today, 4),
};
const overdueLoan: ProviderBorrowRequest = {
  ...providerRequestFixtures[1], status: 'CHECKED_OUT',
  pickup_date: addDays(today, -10), due_date: today,
};
const completed: ProviderBorrowRequest = { ...loan, status: 'COMPLETED', returned_at: '2026-10-23T10:00:00Z' };
const paginate = (results: ProviderBorrowRequest[], next: string | null = null) => ({ count: results.length, next, previous: null, results });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listProviderActiveLoans).mockResolvedValue(paginate([loan, overdueLoan]));
  vi.mocked(confirmProviderReturn).mockResolvedValue(completed);
  vi.mocked(getProviderRequest).mockResolvedValue(loan);
});

describe('US7-1 provider return queue', () => {
  it('lists the provider\'s active loans with borrower, due state and a detail link', async () => {
    render(<ProviderReturnsPage user={provider} />);
    expect(await screen.findByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
    expect(listProviderActiveLoans).toHaveBeenCalledWith(1);
    expect(screen.getByText('2 active loans')).toBeInTheDocument();
    expect(screen.getByText('Somchai Jaidee')).toBeInTheDocument();
    expect(screen.getByText('Due in 3 days')).toBeInTheDocument();
    expect(screen.getByText('Overdue by 1 day')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View details' })[0]).toHaveAttribute('href', `#provider-requests/${loan.id}`);
  });

  it('asks for confirmation, completes the return and refreshes the queue', async () => {
    render(<ProviderReturnsPage user={provider} />);
    await screen.findByRole('heading', { name: 'Oscilloscope' });
    vi.mocked(listProviderActiveLoans).mockResolvedValue(paginate([overdueLoan]));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm return of Oscilloscope' }));
    const dialog = screen.getByRole('dialog', { name: 'Confirm equipment return?' });
    expect(within(dialog).getByText(/Somchai Jaidee/)).toBeInTheDocument();
    expect(confirmProviderReturn).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm return' }));
    await waitFor(() => expect(confirmProviderReturn).toHaveBeenCalledWith(loan.id));
    expect(await screen.findByText('Oscilloscope marked as returned. The loan is now completed.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Oscilloscope' })).not.toBeInTheDocument());
    expect(listProviderActiveLoans).toHaveBeenCalledTimes(2);
  });

  it('cancelling the dialog sends nothing', async () => {
    render(<ProviderReturnsPage user={provider} />);
    await screen.findByRole('heading', { name: 'Oscilloscope' });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm return of Oscilloscope' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(confirmProviderReturn).not.toHaveBeenCalled();
  });

  it('cannot send a second return while the first is in flight', async () => {
    let finish!: (value: ProviderBorrowRequest) => void;
    vi.mocked(confirmProviderReturn).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<ProviderReturnsPage user={provider} />);
    await screen.findByRole('heading', { name: 'Oscilloscope' });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm return of Oscilloscope' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm return' }));
    expect(screen.getByRole('button', { name: 'Confirming...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirm return of Arduino Starter Kit' })).toBeDisabled();
    expect(confirmProviderReturn).toHaveBeenCalledTimes(1);
    finish(completed);
    expect(await screen.findByText(/marked as returned/)).toBeInTheDocument();
  });

  it('shows a duplicate-return 409 and reloads the queue from the server', async () => {
    vi.mocked(confirmProviderReturn).mockRejectedValue(new ProviderRequestError('This loan has already been returned.', 409, 'INVALID_STATE_TRANSITION'));
    render(<ProviderReturnsPage user={provider} />);
    await screen.findByRole('heading', { name: 'Oscilloscope' });
    vi.mocked(listProviderActiveLoans).mockResolvedValue(paginate([overdueLoan]));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm return of Oscilloscope' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm return' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This loan has already been returned.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(listProviderActiveLoans).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('heading', { name: 'Oscilloscope' })).not.toBeInTheDocument();
  });

  it('keeps the dialog open on a server failure so the provider can retry', async () => {
    vi.mocked(confirmProviderReturn).mockRejectedValueOnce(new ProviderRequestError('Server unavailable', 500));
    render(<ProviderReturnsPage user={provider} />);
    await screen.findByRole('heading', { name: 'Oscilloscope' });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm return of Oscilloscope' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm return' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm return' }));
    await waitFor(() => expect(confirmProviderReturn).toHaveBeenCalledTimes(2));
  });

  it('falls back to access denied when the backend rejects an unauthorized provider', async () => {
    vi.mocked(confirmProviderReturn).mockRejectedValue(new ProviderRequestError('Forbidden', 403, 'PERMISSION_DENIED'));
    render(<ProviderReturnsPage user={provider} />);
    await screen.findByRole('heading', { name: 'Oscilloscope' });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm return of Oscilloscope' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm return' }));
    expect(await screen.findByText('Provider access required')).toBeInTheDocument();
  });

  it('shows an empty state when nothing is on loan', async () => {
    vi.mocked(listProviderActiveLoans).mockResolvedValue(paginate([]));
    render(<ProviderReturnsPage user={provider} />);
    expect(await screen.findByText('No equipment awaiting return')).toBeInTheDocument();
  });

  it('shows load errors with a retry', async () => {
    vi.mocked(listProviderActiveLoans).mockRejectedValueOnce(new ProviderRequestError('Server unavailable', 500));
    render(<ProviderReturnsPage user={provider} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
  });

  it('does not fetch for non-providers or inactive providers', () => {
    const { unmount } = render(<ProviderReturnsPage user={{ ...provider, is_provider: false }} />);
    expect(screen.getByText('Provider access required')).toBeInTheDocument();
    unmount();
    render(<ProviderReturnsPage user={{ ...provider, account_status: 'SUSPENDED' }} />);
    expect(screen.getByText('Provider access required')).toBeInTheDocument();
    expect(listProviderActiveLoans).not.toHaveBeenCalled();
  });
});

describe('US7-1 confirm return from request details', () => {
  it('offers Confirm return only for a CHECKED_OUT loan and shows the completed result', async () => {
    vi.mocked(getProviderRequest).mockResolvedValue(loan);
    render(<ProviderRequestDetailPage user={provider} requestId={loan.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm return' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm return' }));
    await waitFor(() => expect(confirmProviderReturn).toHaveBeenCalledWith(loan.id));
    expect(await screen.findByText('Return confirmed. The loan is now completed.')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('Returned on')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm return' })).not.toBeInTheDocument();
  });

  it('hides Confirm return for every other status', async () => {
    for (const status of ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const) {
      vi.mocked(getProviderRequest).mockResolvedValue({ ...loan, status });
      const mounted = render(<ProviderRequestDetailPage user={provider} requestId={loan.id} />);
      await screen.findByText(status);
      expect(screen.queryByRole('button', { name: 'Confirm return' })).not.toBeInTheDocument();
      mounted.unmount();
    }
  });

  it('reloads the latest status after a 409 invalid-state response', async () => {
    vi.mocked(confirmProviderReturn).mockRejectedValue(new ProviderRequestError('This loan has already been returned.', 409));
    vi.mocked(getProviderRequest).mockResolvedValueOnce(loan).mockResolvedValueOnce(completed);
    render(<ProviderRequestDetailPage user={provider} requestId={loan.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm return' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm return' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This loan has already been returned.');
    await waitFor(() => expect(getProviderRequest).toHaveBeenCalledTimes(2));
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });
});
