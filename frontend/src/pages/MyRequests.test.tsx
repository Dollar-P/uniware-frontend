import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyRequestsPage from './MyRequestsPage';
import MyRequestDetailPage from './MyRequestDetailPage';
import { cancelMyBorrowRequest, getMyBorrowRequest, listMyBorrowRequests, updateMyBorrowRequest } from '../services/myRequestsApi';
import { addDays, toDateInput } from '../utils/dateValidation';
import { MyRequestError } from '../types/borrowRequest';
import type { MyBorrowRequest } from '../types/borrowRequest';
import type { Equipment } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';

vi.mock('../services/myRequestsApi', () => ({
  listMyBorrowRequests: vi.fn(), getMyBorrowRequest: vi.fn(),
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
  status: 'AVAILABLE', archived_at: null, disabled_at: null,
  created_at: '2026-10-01T09:00:00Z', updated_at: '2026-10-01T09:00:00Z',
};

function makeRequest(overrides: Partial<MyBorrowRequest> = {}): MyBorrowRequest {
  return {
    id: 'req-1', borrower: borrower.id, equipment, pickup_date: '2026-10-20', due_date: '2026-10-23',
    purpose: 'Electronics lab project', status: 'PENDING', decision_reason: '',
    decided_by: null, decided_at: null, ...overrides,
  };
}
function paginate(results: MyBorrowRequest[], next: string | null = null) {
  return { count: results.length, next, previous: null, results };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listMyBorrowRequests).mockResolvedValue(paginate([makeRequest()]));
  vi.mocked(getMyBorrowRequest).mockResolvedValue(makeRequest());
});

describe('US4-3 my borrow requests list', () => {
  it('shows equipment, requested period, purpose and status, and links to the detail view', async () => {
    render(<MyRequestsPage user={borrower} />);
    expect(await screen.findByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
    expect(screen.getByText('Electronics lab project')).toBeInTheDocument();
    expect(screen.getByText(/20 Oct 2026\s*–\s*23 Oct 2026/)).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute('href', '#my-requests/req-1');
  });

  it('asks only for the signed-in borrower\'s own requests', async () => {
    render(<MyRequestsPage user={borrower} />);
    await screen.findByRole('heading', { name: 'Oscilloscope' });
    expect(listMyBorrowRequests).toHaveBeenCalledWith(1);
  });

  it('shows a loading state before the first response arrives', () => {
    vi.mocked(listMyBorrowRequests).mockReturnValue(new Promise(() => {}));
    render(<MyRequestsPage user={borrower} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your requests...');
  });

  it('shows an empty state with a route back to the catalog', async () => {
    vi.mocked(listMyBorrowRequests).mockResolvedValue(paginate([]));
    render(<MyRequestsPage user={borrower} />);
    expect(await screen.findByText('No borrow requests yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse equipment' })).toHaveAttribute('href', '#catalog');
  });

  it('renders every status the backend can return', async () => {
    vi.mocked(listMyBorrowRequests).mockResolvedValue(paginate([
      makeRequest({ id: 'r-p', status: 'PENDING' }),
      makeRequest({ id: 'r-a', status: 'APPROVED' }),
      makeRequest({ id: 'r-r', status: 'REJECTED' }),
      makeRequest({ id: 'r-c', status: 'CANCELLED' }),
    ]));
    render(<MyRequestsPage user={borrower} />);
    for (const status of ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']) {
      expect(await screen.findByText(status)).toBeInTheDocument();
    }
  });

  it('shows server errors with a retry that recovers', async () => {
    vi.mocked(listMyBorrowRequests).mockRejectedValueOnce(new MyRequestError('Server unavailable', 500));
    render(<MyRequestsPage user={borrower} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
  });

  it('pages forward only while the server reports a next page', async () => {
    vi.mocked(listMyBorrowRequests).mockResolvedValue(paginate([makeRequest()], '?page=2'));
    render(<MyRequestsPage user={borrower} />);
    await screen.findByRole('heading', { name: 'Oscilloscope' });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(listMyBorrowRequests).toHaveBeenCalledWith(2));
  });

  it('does not fetch for a user without the borrower role', () => {
    render(<MyRequestsPage user={{ ...borrower, is_borrower: false }} />);
    expect(screen.getByText('Borrower access required')).toBeInTheDocument();
    expect(listMyBorrowRequests).not.toHaveBeenCalled();
  });

  it('does not fetch for a suspended account', () => {
    render(<MyRequestsPage user={{ ...borrower, account_status: 'SUSPENDED' }} />);
    expect(screen.getByText('Borrower access required')).toBeInTheDocument();
    expect(listMyBorrowRequests).not.toHaveBeenCalled();
  });

  it('falls back to access denied when the server rejects with 403', async () => {
    vi.mocked(listMyBorrowRequests).mockRejectedValue(new MyRequestError('Denied', 403));
    render(<MyRequestsPage user={borrower} />);
    expect(await screen.findByText('Borrower access required')).toBeInTheDocument();
  });
});

describe('US4-3 my borrow request detail', () => {
  it('shows the full request and what its status means', async () => {
    render(<MyRequestDetailPage user={borrower} requestId="req-1" />);
    expect(await screen.findByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
    expect(getMyBorrowRequest).toHaveBeenCalledWith('req-1');
    expect(screen.getByText('EQ-1001')).toBeInTheDocument();
    expect(screen.getByText('Engineering Lab')).toBeInTheDocument();
    expect(screen.getByText('Electronics lab project')).toBeInTheDocument();
    expect(screen.getByText('20 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('23 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText(/request submitted; awaiting processing/i)).toBeInTheDocument();
  });

  it('shows the provider reason on a rejected request', async () => {
    vi.mocked(getMyBorrowRequest).mockResolvedValue(makeRequest({
      status: 'REJECTED', decision_reason: 'Already booked for a class', decided_at: '2026-10-12T10:00:00Z',
    }));
    render(<MyRequestDetailPage user={borrower} requestId="req-1" />);
    expect(await screen.findByText('Already booked for a class')).toBeInTheDocument();
    expect(screen.getByText('REJECTED')).toBeInTheDocument();
  });

  it('hides the reason block when the provider gave none', async () => {
    render(<MyRequestDetailPage user={borrower} requestId="req-1" />);
    await screen.findByRole('heading', { name: 'Oscilloscope' });
    expect(screen.queryByText('Reason given by the provider')).not.toBeInTheDocument();
  });

  it('treats another borrower\'s request as not found and leaks nothing about it', async () => {
    vi.mocked(getMyBorrowRequest).mockRejectedValue(
      new MyRequestError('No BorrowRequest matches the given query.', 404, 'NOT_FOUND'),
    );
    render(<MyRequestDetailPage user={borrower} requestId="someone-elses-id" />);
    expect(await screen.findByText('Request not found')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Oscilloscope' })).not.toBeInTheDocument();
    expect(screen.queryByText('Electronics lab project')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to my requests' })).toHaveAttribute('href', '#my-requests');
  });

  it('shows a loading state before the request arrives', () => {
    vi.mocked(getMyBorrowRequest).mockReturnValue(new Promise(() => {}));
    render(<MyRequestDetailPage user={borrower} requestId="req-1" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading this request...');
  });

  it('offers a retry on a server error', async () => {
    vi.mocked(getMyBorrowRequest).mockRejectedValueOnce(new MyRequestError('Server unavailable', 500));
    render(<MyRequestDetailPage user={borrower} requestId="req-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
  });

  it('does not fetch a detail page for a non-borrower', () => {
    render(<MyRequestDetailPage user={{ ...borrower, is_borrower: false }} requestId="req-1" />);
    expect(screen.getByText('Borrower access required')).toBeInTheDocument();
    expect(getMyBorrowRequest).not.toHaveBeenCalled();
  });
});


describe('Borrower edits and cancels their own request', () => {
  const futureRequest = (status: MyBorrowRequest['status'] = 'PENDING') => makeRequest({
    status, pickup_date: addDays(toDateInput(new Date()), 5),
    due_date: addDays(toDateInput(new Date()), 8),
  });

  it('edits the pickup and return dates and purpose, then shows the saved result', async () => {
    const item = futureRequest();
    vi.mocked(getMyBorrowRequest).mockResolvedValue(item);
    vi.mocked(updateMyBorrowRequest).mockResolvedValue({ ...item, purpose: 'Updated lab activity' });
    render(<MyRequestDetailPage user={borrower} requestId={item.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    expect(screen.getByLabelText('Pickup date')).toHaveValue(item.pickup_date);
    expect(screen.getByLabelText('Return date')).toHaveValue(item.due_date);
    await userEvent.clear(screen.getByLabelText('Purpose'));
    await userEvent.type(screen.getByLabelText('Purpose'), 'Updated lab activity');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateMyBorrowRequest).toHaveBeenCalledWith(item.id, {
      pickup_date: item.pickup_date, due_date: item.due_date, purpose: 'Updated lab activity',
    }));
    expect(await screen.findByText('Borrow request updated successfully.')).toBeInTheDocument();
    expect(screen.getByText('Updated lab activity')).toBeInTheDocument();
  });

  it('shows field validation errors without calling the API', async () => {
    const item = futureRequest();
    vi.mocked(getMyBorrowRequest).mockResolvedValue(item);
    render(<MyRequestDetailPage user={borrower} requestId={item.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    await userEvent.clear(screen.getByLabelText('Purpose'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Please describe why you need this equipment.')).toBeInTheDocument();
    expect(updateMyBorrowRequest).not.toHaveBeenCalled();
  });

  it('requires a second confirmation to cancel and retains the cancelled record', async () => {
    const item = futureRequest();
    vi.mocked(getMyBorrowRequest).mockResolvedValue(item);
    vi.mocked(cancelMyBorrowRequest).mockResolvedValue({ ...item, status: 'CANCELLED' });
    render(<MyRequestDetailPage user={borrower} requestId={item.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel request' }));
    expect(cancelMyBorrowRequest).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Keep request' }));
    expect(screen.getByRole('button', { name: 'Cancel request' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel request' }));
    await waitFor(() => expect(cancelMyBorrowRequest).toHaveBeenCalledWith(item.id));
    expect(await screen.findByText('Borrow request cancelled.')).toBeInTheDocument();
    expect(screen.getByText('CANCELLED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel request' })).not.toBeInTheDocument();
  });

  it('hides edit and cancel for an approved request (US4-5)', async () => {
    vi.mocked(getMyBorrowRequest).mockResolvedValue(futureRequest('APPROVED'));
    render(<MyRequestDetailPage user={borrower} requestId="req-1" />);
    expect(await screen.findByText('APPROVED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel request' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
    expect(cancelMyBorrowRequest).not.toHaveBeenCalled();
  });

  it('hides edit and cancel for a pending request after its pickup date', async () => {
    vi.mocked(getMyBorrowRequest).mockResolvedValue(makeRequest({
      status: 'PENDING', pickup_date: '2025-01-01', due_date: '2025-01-03',
    }));
    render(<MyRequestDetailPage user={borrower} requestId="req-1" />);
    expect(await screen.findByText('PENDING')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel request' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
  });

  it('hides both actions for rejected, completed, checked-out or cancelled requests', async () => {
    for (const status of ['REJECTED', 'COMPLETED', 'CHECKED_OUT', 'CANCELLED'] as const) {
      vi.mocked(getMyBorrowRequest).mockResolvedValue(futureRequest(status));
      const mounted = render(<MyRequestDetailPage user={borrower} requestId="req-1" />);
      await screen.findByText(status.replaceAll('_', ' '));
      expect(screen.queryByRole('button', { name: 'Cancel request' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
      mounted.unmount();
    }
  });

  it('shows a state-conflict error if the provider already acted', async () => {
    vi.mocked(getMyBorrowRequest).mockResolvedValue(futureRequest());
    vi.mocked(cancelMyBorrowRequest).mockRejectedValue(new MyRequestError('Only pending borrow requests can be cancelled.', 409));
    render(<MyRequestDetailPage user={borrower} requestId="req-1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel request' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only pending borrow requests can be cancelled.');
  });
});
