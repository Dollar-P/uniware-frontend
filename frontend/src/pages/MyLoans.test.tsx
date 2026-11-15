import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyLoansPage from './MyLoansPage';
import MyRequestDetailPage from './MyRequestDetailPage';
import { getMyBorrowRequest, listMyActiveLoans } from '../services/myRequestsApi';
import { addDays, toDateInput } from '../utils/dateValidation';
import { dateLabel, MyRequestError } from '../types/borrowRequest';
import type { MyBorrowRequest } from '../types/borrowRequest';
import type { Equipment } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';

vi.mock('../services/myRequestsApi', () => ({
  listMyActiveLoans: vi.fn(), getMyBorrowRequest: vi.fn(), listMyBorrowRequests: vi.fn(),
  updateMyBorrowRequest: vi.fn(), cancelMyBorrowRequest: vi.fn(),
}));

const borrower: RegisterResponse = {
  id: 'borrower-1', email: 'lazan@chula.ac.th', first_name: 'Lazan', last_name: 'Test', department: 'Engineering',
  is_admin: false, is_provider: false, is_borrower: true, account_status: 'ACTIVE', date_joined: '2026-01-01T00:00:00Z',
};
const equipment: Equipment = {
  id: 'eq-1', asset_id: 'EQ-1001', name: 'Oscilloscope', model: 'DS1054Z',
  description: 'Four-channel digital oscilloscope', provider: 'provider-1',
  category: { id: 'cat-1', name: 'Electronics' }, location: { id: 'loc-1', name: 'Engineering Lab' },
  status: 'CHECKED_OUT', archived_at: null, disabled_at: null,
  created_at: '2026-10-01T09:00:00Z', updated_at: '2026-10-01T09:00:00Z',
};
const today = toDateInput(new Date());

function makeLoan(overrides: Partial<MyBorrowRequest> = {}): MyBorrowRequest {
  return {
    id: 'loan-1', borrower: borrower.id, equipment, pickup_date: addDays(today, -2), due_date: addDays(today, 6),
    purpose: 'Electronics lab project', status: 'CHECKED_OUT', decision_reason: '',
    decided_by: 'provider-1', decided_at: '2026-10-10T10:00:00Z', ...overrides,
  };
}
const paginate = (results: MyBorrowRequest[], next: string | null = null) => ({ count: results.length, next, previous: null, results });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listMyActiveLoans).mockResolvedValue(paginate([makeLoan()]));
  vi.mocked(getMyBorrowRequest).mockResolvedValue(makeLoan());
});

describe('US8-1 my active loans', () => {
  it('shows each loan with the last day to return it (day before the exclusive due date)', async () => {
    const loan = makeLoan();
    render(<MyLoansPage user={borrower} />);
    expect(await screen.findByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
    expect(listMyActiveLoans).toHaveBeenCalledWith(1);
    expect(screen.getByText('1 active loan')).toBeInTheDocument();
    expect(screen.getByText(dateLabel(addDays(loan.due_date, -1)))).toBeInTheDocument();
    expect(screen.queryByText(dateLabel(loan.due_date))).not.toBeInTheDocument();
    expect(screen.getByText('Due in 5 days')).toBeInTheDocument();
    expect(screen.getByText('Engineering Lab')).toBeInTheDocument();
  });

  it('flags loans that are due today or overdue', async () => {
    vi.mocked(listMyActiveLoans).mockResolvedValue(paginate([
      makeLoan({ id: 'due-today', due_date: addDays(today, 1) }),
      makeLoan({ id: 'overdue', due_date: addDays(today, -2), equipment: { ...equipment, name: 'Arduino Kit' } }),
    ]));
    render(<MyLoansPage user={borrower} />);
    expect(await screen.findByText('Due today')).toBeInTheDocument();
    expect(screen.getByText('Overdue by 3 days')).toBeInTheDocument();
  });

  it('links each loan to its detail page', async () => {
    render(<MyLoansPage user={borrower} />);
    await screen.findByRole('heading', { name: 'Oscilloscope' });
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute('href', '#my-requests/loan-1');
  });

  it('shows an empty state that points back to borrow requests', async () => {
    vi.mocked(listMyActiveLoans).mockResolvedValue(paginate([]));
    render(<MyLoansPage user={borrower} />);
    expect(await screen.findByText('No active loans')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View my borrow requests' })).toHaveAttribute('href', '#my-requests');
  });

  it('shows a loading state, then server errors with a retry', async () => {
    vi.mocked(listMyActiveLoans).mockRejectedValueOnce(new MyRequestError('Server unavailable', 500));
    render(<MyLoansPage user={borrower} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your loans...');
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
  });

  it('pages forward while the server reports a next page', async () => {
    vi.mocked(listMyActiveLoans).mockResolvedValue(paginate([makeLoan()], '?page=2'));
    render(<MyLoansPage user={borrower} />);
    await screen.findByRole('heading', { name: 'Oscilloscope' });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(listMyActiveLoans).toHaveBeenCalledWith(2));
  });

  it('does not fetch for a non-borrower or a suspended account', () => {
    const { unmount } = render(<MyLoansPage user={{ ...borrower, is_borrower: false }} />);
    expect(screen.getByText('Borrower access required')).toBeInTheDocument();
    unmount();
    render(<MyLoansPage user={{ ...borrower, account_status: 'SUSPENDED' }} />);
    expect(screen.getByText('Borrower access required')).toBeInTheDocument();
    expect(listMyActiveLoans).not.toHaveBeenCalled();
  });

  it('falls back to access denied when the server answers 401/403', async () => {
    vi.mocked(listMyActiveLoans).mockRejectedValue(new MyRequestError('Denied', 403));
    render(<MyLoansPage user={borrower} />);
    expect(await screen.findByText('Borrower access required')).toBeInTheDocument();
  });
});

describe('US8-1 loan details', () => {
  it('shows Return by with the due state and links back to my loans for an active loan', async () => {
    const loan = makeLoan();
    render(<MyRequestDetailPage user={borrower} requestId={loan.id} />);
    expect(await screen.findByText('Return by')).toBeInTheDocument();
    expect(screen.getByText(dateLabel(addDays(loan.due_date, -1)))).toBeInTheDocument();
    expect(screen.getByText('Due in 5 days')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to my loans' })).toHaveAttribute('href', '#my-loans');
  });

  it('shows a completed loan as returned, without a due badge', async () => {
    vi.mocked(getMyBorrowRequest).mockResolvedValue(makeLoan({ status: 'COMPLETED', returned_at: '2026-10-23T10:00:00Z' }));
    render(<MyRequestDetailPage user={borrower} requestId="loan-1" />);
    expect(await screen.findByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('Returned on')).toBeInTheDocument();
    expect(screen.queryByText(/^Due in|^Overdue/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to my requests' })).toHaveAttribute('href', '#my-requests');
  });

  it('treats another borrower\'s loan as not found', async () => {
    vi.mocked(getMyBorrowRequest).mockRejectedValue(new MyRequestError('Not found', 404, 'NOT_FOUND'));
    render(<MyRequestDetailPage user={borrower} requestId="someone-elses-loan" />);
    expect(await screen.findByText('Request not found')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Oscilloscope' })).not.toBeInTheDocument();
  });
});
