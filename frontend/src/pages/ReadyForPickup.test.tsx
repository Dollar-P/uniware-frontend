import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProviderRequestsPage from './ProviderRequestsPage';
import { listReadyForPickup } from '../services/providerRequestsApi';
import { providerRequestFixtures } from '../test/fixtures/providerRequests';
import type { RegisterResponse } from '../types/auth';

vi.mock('../services/providerRequestsApi', () => ({ listReadyForPickup: vi.fn(), listProviderRequests: vi.fn() }));
const user: RegisterResponse = { id: 'provider', email: 'provider@chula.ac.th', first_name: 'Pat', last_name: 'Provider', department: '', is_provider: true, is_admin: false, is_borrower: false, account_status: 'ACTIVE', date_joined: '' };
beforeEach(() => vi.resetAllMocks());

it('renders eligible server results with request links and pagination', async () => {
  vi.mocked(listReadyForPickup).mockResolvedValueOnce({ count: 21, next: '?page=2', previous: null, results: [{ ...providerRequestFixtures[0], status: 'APPROVED' }] }).mockResolvedValueOnce({ count: 21, next: null, previous: '?page=1', results: [] });
  render(<ProviderRequestsPage user={user} readyForPickup />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading requests');
  expect(await screen.findByText(providerRequestFixtures[0].equipment.name)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Ready for pickup' })).toBeInTheDocument();
  expect(document.querySelector(`a[href="#provider-requests/${providerRequestFixtures[0].id}"]`)).not.toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByText('No ready-for-pickup requests')).toBeInTheDocument();
  expect(listReadyForPickup).toHaveBeenLastCalledWith(2);
});

it('retries a failed pickup query and restricts non-provider access', async () => {
  vi.mocked(listReadyForPickup).mockRejectedValueOnce(new Error('Pickup service unavailable')).mockResolvedValue({ count: 0, results: [], next: null, previous: null });
  const view = render(<ProviderRequestsPage user={user} readyForPickup />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Pickup service unavailable');
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No ready-for-pickup requests')).toBeInTheDocument();
  view.unmount();
  vi.mocked(listReadyForPickup).mockClear();
  render(<ProviderRequestsPage user={{ ...user, is_provider: false }} readyForPickup />);
  expect(screen.getByRole('heading', { name: 'Provider access required' })).toBeInTheDocument();
  expect(listReadyForPickup).not.toHaveBeenCalled();
});
