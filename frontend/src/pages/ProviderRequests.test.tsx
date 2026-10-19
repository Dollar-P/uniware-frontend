import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProviderRequestsPage from './ProviderRequestsPage';
import ProviderRequestDetailPage from './ProviderRequestDetailPage';
import { approveProviderRequest, getProviderRequest, listProviderRequests, rejectProviderRequest } from '../services/providerRequestsApi';
import { providerRequestFixtures } from '../test/fixtures/providerRequests';
import { ProviderRequestError } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';

vi.mock('../services/providerRequestsApi', () => ({
  getProviderRequest: vi.fn(), listProviderRequests: vi.fn(), approveProviderRequest: vi.fn(), rejectProviderRequest: vi.fn(),
}));

const provider: RegisterResponse = {
  id: 'provider-id', email: 'provider@chula.ac.th', first_name: 'Putter', last_name: 'Test', department: 'Engineering',
  is_provider: true, is_borrower: true, is_admin: false, account_status: 'ACTIVE', date_joined: '',
};
const request = providerRequestFixtures[0];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listProviderRequests).mockResolvedValue({ count: 1, next: null, previous: null, results: [request] });
  vi.mocked(getProviderRequest).mockResolvedValue(request);
  vi.mocked(approveProviderRequest).mockResolvedValue({ ...request, status: 'APPROVED' });
  vi.mocked(rejectProviderRequest).mockResolvedValue({ ...request, status: 'REJECTED', decision_reason: 'Maintenance' });
});

describe('US5-1 provider requests inbox', () => {
  it('loads only the pending requests by default and links to detail', async () => {
    render(<ProviderRequestsPage user={provider} />);
    expect(await screen.findByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
    expect(listProviderRequests).toHaveBeenCalledWith(1, 'PENDING');
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute('href', `#provider-requests/${request.id}`);
  });
  it('allows filtering all requests and refreshing', async () => {
    render(<ProviderRequestsPage user={provider} />);
    await screen.findByRole('heading', { name: 'Oscilloscope' });
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => expect(listProviderRequests).toHaveBeenCalledWith(1, 'ALL'));
  });
  it('shows empty state and server errors', async () => {
    vi.mocked(listProviderRequests).mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });
    render(<ProviderRequestsPage user={provider} />);
    expect(await screen.findByText('No pending requests')).toBeInTheDocument();
  });
  it('does not request data for non-providers', () => {
    render(<ProviderRequestsPage user={{ ...provider, is_provider: false }} />);
    expect(screen.getByText('Provider access required')).toBeInTheDocument();
    expect(listProviderRequests).not.toHaveBeenCalled();
  });
  it('shows API errors with retry', async () => {
    vi.mocked(listProviderRequests).mockRejectedValueOnce(new ProviderRequestError('Server unavailable', 500));
    render(<ProviderRequestsPage user={provider} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
  });
});

describe('US5-2 / US5-3 / US5-4 provider decisions', () => {
  it('shows details and opens confirmation before approving a PENDING request', async () => {
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    expect(await screen.findByText('Electronics lab project')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByRole('dialog', { name: 'Approve borrowing request?' })).toBeInTheDocument();
    expect(approveProviderRequest).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm approval' }));
    await waitFor(() => expect(approveProviderRequest).toHaveBeenCalledWith(request.id));
    expect(await screen.findByText(/Request approved/)).toBeInTheDocument();
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('requires a nonblank reason and sends it to the backend when rejecting', async () => {
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    await screen.findByText('Electronics lab project');
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const confirm = screen.getByRole('button', { name: 'Confirm rejection' });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox', { name: /Reason for rejection/ }), '  Maintenance  ');
    await userEvent.click(confirm);
    await waitFor(() => expect(rejectProviderRequest).toHaveBeenCalledWith(request.id, 'Maintenance'));
    expect(await screen.findByText('REJECTED')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('shows 409 conflict and reloads the latest status (e.g. already decided elsewhere)', async () => {
    vi.mocked(approveProviderRequest).mockRejectedValueOnce(new ProviderRequestError('Only pending requests can be approved.', 409, 'INVALID_STATE_TRANSITION'));
    vi.mocked(getProviderRequest).mockResolvedValueOnce(request).mockResolvedValueOnce({ ...request, status: 'APPROVED' });
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    await screen.findByText('Electronics lab project');
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm approval' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only pending requests can be approved.');
    await waitFor(() => expect(getProviderRequest).toHaveBeenCalledTimes(2));
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the rejection dialog open with backend validation error so the user can retry', async () => {
    vi.mocked(rejectProviderRequest).mockRejectedValueOnce(new ProviderRequestError('Reason is too long', 400, 'VALIDATION_ERROR'));
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    await screen.findByText('Electronics lab project');
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await userEvent.type(screen.getByRole('textbox', { name: /Reason for rejection/ }), 'Maintenance');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reason is too long');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    await waitFor(() => expect(rejectProviderRequest).toHaveBeenCalledTimes(2));
  });

  it('hides decision buttons when the request is no longer pending', async () => {
    vi.mocked(getProviderRequest).mockResolvedValueOnce({ ...request, status: 'REJECTED', decision_reason: 'Unavailable' });
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    expect(await screen.findByText('Unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('handles permission errors from backend decision API', async () => {
    vi.mocked(approveProviderRequest).mockRejectedValueOnce(new ProviderRequestError('Forbidden', 403, 'PERMISSION_DENIED'));
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    await screen.findByText('Electronics lab project');
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm approval' }));
    expect(await screen.findByText('Provider access required')).toBeInTheDocument();
  });

  it('refreshes details from API', async () => {
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    await screen.findByText('Electronics lab project');
    await userEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    await waitFor(() => expect(getProviderRequest).toHaveBeenCalledTimes(2));
  });

  it('blocks inactive providers without sending a request', () => {
    render(<ProviderRequestDetailPage user={{ ...provider, account_status: 'SUSPENDED' }} requestId={request.id} />);
    expect(screen.getByText('Provider access required')).toBeInTheDocument();
    expect(getProviderRequest).not.toHaveBeenCalled();
  });
});
