import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProviderRequestsPage from './ProviderRequestsPage';
import ProviderRequestDetailPage from './ProviderRequestDetailPage';
import { getProviderRequest, listProviderRequests } from '../services/providerRequestsApi';
import { providerRequestFixtures } from '../test/fixtures/providerRequests';
import { ProviderRequestError } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';

vi.mock('../services/providerRequestsApi', () => ({
  getProviderRequest: vi.fn(), listProviderRequests: vi.fn(),
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

describe('Provider request detail (read-only, decisions not implemented)', () => {
  it('shows borrower and request details without approve or reject actions', async () => {
    render(<ProviderRequestDetailPage user={provider} requestId={request.id} />);
    expect(await screen.findByText('Electronics lab project')).toBeInTheDocument();
    expect(screen.getByText(/Request approval and rejection are not available yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Reject$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('refreshes details using read-only GET', async () => {
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
