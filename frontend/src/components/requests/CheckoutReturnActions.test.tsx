import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyRequestCard from './MyRequestCard';
import RequestCard from './RequestCard';
import { providerRequestFixtures } from '../../test/fixtures/providerRequests';
import type { MyBorrowRequest } from '../../types/borrowRequest';
import { returnProviderRequest } from '../../services/providerRequestsApi';

vi.mock('../../services/providerRequestsApi', () => ({ returnProviderRequest: vi.fn() }));

const providerRequest = providerRequestFixtures[0];
const myRequest: MyBorrowRequest = {
  ...providerRequest,
  borrower: 'borrower-1',
  status: 'APPROVED',
};

afterEach(() => vi.resetAllMocks());

describe('Borrower checkout UI', () => {
  it('explains that the provider confirms collection without a borrower checkout action', () => {
    render(<MyRequestCard request={myRequest} />);
    expect(screen.getByRole('link', { name: 'View details' })).toBeInTheDocument();
    expect(screen.getByText(/The provider confirms handover/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check out' })).not.toBeInTheDocument();
  });

  it('hides Check out on pending or returned requests', () => {
    const { rerender } = render(<MyRequestCard request={{ ...myRequest, status: 'PENDING' }} />);
    expect(screen.queryByRole('button', { name: 'Check out' })).not.toBeInTheDocument();
    rerender(<MyRequestCard request={{ ...myRequest, status: 'RETURNED' }} />);
    expect(screen.queryByRole('button', { name: 'Check out' })).not.toBeInTheDocument();
  });
});

describe('Provider return UI', () => {
  it('asks for required return condition and records return', async () => {
    vi.mocked(returnProviderRequest).mockResolvedValue({ ...providerRequest, status: 'RETURNED', return_condition: 'Good condition' });
    const changed = vi.fn();
    render(<RequestCard request={{ ...providerRequest, status: 'CHECKED_OUT' }} onReturned={changed} />);
    await userEvent.click(screen.getByRole('button', { name: 'Returned' }));
    expect(screen.getByRole('dialog', { name: 'Record return condition' })).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Confirm returned' });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox', { name: 'Equipment condition on return' }), ' Good condition ');
    await userEvent.click(confirm);
    await waitFor(() => expect(returnProviderRequest).toHaveBeenCalledWith(providerRequest.id, 'Good condition'));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
  });

  it('hides Returned on pending and already returned requests', () => {
    const { rerender } = render(<RequestCard request={providerRequest} />);
    expect(screen.queryByRole('button', { name: 'Returned' })).not.toBeInTheDocument();
    rerender(<RequestCard request={{ ...providerRequest, status: 'RETURNED' }} />);
    expect(screen.queryByRole('button', { name: 'Returned' })).not.toBeInTheDocument();
  });
});
