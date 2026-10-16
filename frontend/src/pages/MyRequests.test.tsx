import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyRequestsPage from './MyRequestsPage';
import MyRequestDetailPage from './MyRequestDetailPage';
import { getMyBorrowRequest, listMyBorrowRequests } from '../services/myRequestsApi';
import { MyRequestError } from '../types/borrowRequest';
import type { MyBorrowRequest } from '../types/borrowRequest';
import type { Equipment } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';

vi.mock('../services/myRequestsApi', () => ({
  listMyBorrowRequests: vi.fn(), getMyBorrowRequest: vi.fn(),
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
    expect(screen.getByText('Waiting for the provider to decide.')).toBeInTheDocument();
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
