import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  vi.mocked(rejectProviderRequest).mockResolvedValue({ ...request, status: 'REJECTED', decision_reason: 'Not available' });
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

describe('US5-2, 5-3, 5-4 provider request detail and decisions', () => {
  it('shows details and does not approve without confirmation', async () => {
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    expect(await screen.findByText('Electronics lab project')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Approve$/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(approveProviderRequest).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(approveProviderRequest).not.toHaveBeenCalled();
  });
  it('approves after confirmation and hides decision buttons', async () => {
    vi.mocked(getProviderRequest).mockResolvedValueOnce(request)
      .mockResolvedValueOnce({ ...request, status: 'APPROVED' });
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    await screen.findByText('Electronics lab project');
    await userEvent.click(screen.getByRole('button', { name: /^Approve$/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm approval' }));
    expect(await screen.findByText('Request approved.')).toBeInTheDocument();
    expect(approveProviderRequest).toHaveBeenCalledWith(request.id);
    expect(screen.queryByRole('button', { name: /^Approve$/ })).not.toBeInTheDocument();
  });
  it('requires a rejection reason and sends it to API', async () => {
    vi.mocked(getProviderRequest).mockResolvedValueOnce(request)
      .mockResolvedValueOnce({ ...request, status: 'REJECTED', decision_reason: 'Not available' });
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    await screen.findByText('Electronics lab project');
    await userEvent.click(screen.getByRole('button', { name: /^Reject$/ }));
    expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox', { name: /Reason for rejection/ }), 'Not available');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    expect(rejectProviderRequest).toHaveBeenCalledWith(request.id, 'Not available');
    expect(await screen.findByText('Request rejected.')).toBeInTheDocument();
  });
  it('handles conflict without incorrectly marking request approved', async () => {
    vi.mocked(approveProviderRequest).mockRejectedValueOnce(new ProviderRequestError('Conflict', 409));
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    await screen.findByText('Electronics lab project');
    await userEvent.click(screen.getByRole('button', { name: /^Approve$/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm approval' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer be processed');
    expect(screen.getByRole('button', { name: /^Approve$/ })).toBeInTheDocument();
  });
  it('does not allow modifying a non-pending request', async () => {
    vi.mocked(getProviderRequest).mockResolvedValueOnce({ ...request, status: 'APPROVED' });
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    expect(await screen.findByText('Electronics lab project')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Approve$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Reject$/ })).not.toBeInTheDocument();
  });
});
