import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyRequestCard from './MyRequestCard';
import RequestCard from './RequestCard';
import { providerRequestFixtures } from '../../test/fixtures/providerRequests';
import type { MyBorrowRequest } from '../../types/borrowRequest';
import { checkoutMyBorrowRequest } from '../../services/myRequestsApi';
import { returnProviderRequest } from '../../services/providerRequestsApi';

vi.mock('../../services/myRequestsApi', () => ({ checkoutMyBorrowRequest: vi.fn() }));
vi.mock('../../services/providerRequestsApi', () => ({ returnProviderRequest: vi.fn() }));

const providerRequest = providerRequestFixtures[0];
const myRequest: MyBorrowRequest = {
  ...providerRequest,
  borrower: 'borrower-1',
  status: 'APPROVED',
};

afterEach(() => vi.resetAllMocks());

describe('Borrower checkout UI', () => {
  it('shows Check out only for approved requests, below View details', async () => {
    vi.mocked(checkoutMyBorrowRequest).mockResolvedValue({ ...myRequest, status: 'CHECKED_OUT' });
    const changed = vi.fn();
    render(<MyRequestCard request={myRequest} onCheckedOut={changed} />);
    expect(screen.getByRole('link', { name: 'View details' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Check out' }));
    await waitFor(() => expect(checkoutMyBorrowRequest).toHaveBeenCalledWith(myRequest.id));
    expect(changed).toHaveBeenCalledOnce();
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
