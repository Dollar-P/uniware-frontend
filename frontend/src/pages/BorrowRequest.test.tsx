import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EquipmentDetailPage from './EquipmentDetailPage';
import * as equipmentApi from '../services/equipmentApi';
import * as borrowApi from '../services/borrowService';
import { BorrowRequestError } from '../types/borrow';
import type { BorrowRequest } from '../types/borrow';
import type { Equipment } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';
import { addDays, toDateInput } from '../utils/dateValidation';

const borrower: RegisterResponse = {
  id: 'borrower-1', email: 'borrower@student.chula.ac.th', first_name: 'Test', last_name: 'Borrower', department: '',
  is_admin: false, is_provider: false, is_borrower: true, account_status: 'ACTIVE', date_joined: '',
};
const item: Equipment = {
  id: 'eq-1', asset_id: 'ASSET-1', name: 'Microscope', model: 'MX-5', description: 'A lab microscope',
  provider: 'provider-1', category: { id: 'cat', name: 'Lab' }, location: { id: 'loc', name: 'Building A' },
  status: 'AVAILABLE', archived_at: null, disabled_at: null, created_at: '', updated_at: '',
};
const pickup = addDays(toDateInput(new Date()), 1);
const due = addDays(pickup, 3);
const created: BorrowRequest = {
  id: 'req-1', equipment: { id: 'eq-1', asset_id: 'ASSET-1', name: 'Microscope' }, borrower: 'borrower-1',
  pickup_date: pickup, due_date: due, purpose: 'Cell imaging', status: 'PENDING',
  decision_reason: '', decided_at: null, created_at: '', updated_at: '',
};

async function openForm(equipment = item, user = borrower) {
  vi.spyOn(equipmentApi, 'getEquipment').mockResolvedValue(equipment);
  render(<EquipmentDetailPage equipmentId={equipment.id} user={user} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Request to borrow' }));
  return screen.getByRole('dialog', { name: 'Request to borrow Microscope' });
}

function fillForm(purpose = 'Cell imaging') {
  fireEvent.change(screen.getByLabelText('Pickup date'), { target: { value: pickup } });
  fireEvent.change(screen.getByLabelText('Due date'), { target: { value: due } });
  if (purpose) fireEvent.change(screen.getByLabelText('Purpose'), { target: { value: purpose } });
}

describe('borrow request from equipment detail (US4-1, US4-2)', () => {
  beforeEach(() => { window.history.replaceState(null, '', '#equipment/eq-1'); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('submits a valid request and shows it is pending', async () => {
    const submit = vi.spyOn(borrowApi, 'createBorrowRequest').mockResolvedValue(created);
    await openForm();
    fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(submit).toHaveBeenCalledWith({ equipment_id: 'eq-1', pickup_date: pickup, due_date: due, purpose: 'Cell imaging' });
    expect(await screen.findByRole('status')).toHaveTextContent(`Request submitted for ${pickup} to ${due}. It is pending`);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('blocks missing fields without calling the API', async () => {
    const submit = vi.spyOn(borrowApi, 'createBorrowRequest');
    await openForm();
    await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(screen.getByText('Please select a pickup date.')).toBeInTheDocument();
    expect(screen.getByText('Please select a due date.')).toBeInTheDocument();
    expect(screen.getByText('Please describe why you need this equipment.')).toBeInTheDocument();
    expect(screen.getByLabelText('Purpose')).toHaveAttribute('aria-invalid', 'true');
    expect(submit).not.toHaveBeenCalled();
  });

  it('blocks a due date that is not after pickup', async () => {
    const submit = vi.spyOn(borrowApi, 'createBorrowRequest');
    await openForm();
    fillForm();
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: pickup } });
    await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(screen.getByText('Due date must be after the pickup date.')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('shows backend field errors next to their fields', async () => {
    vi.spyOn(borrowApi, 'createBorrowRequest').mockRejectedValue(new BorrowRequestError(
      'A loan can last at most 30 days.', 400, 'VALIDATION_ERROR', { due_date: 'A loan can last at most 30 days.' }));
    await openForm();
    fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(await screen.findByText('A loan can last at most 30 days.')).toHaveAttribute('id', 'borrow-due-date-error');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['a conflicting reservation', 409, 'BOOKING_CONFLICT', 'This equipment is already reserved for part of the requested period (2026-10-14 to 2026-10-16).'],
    ['unavailable equipment', 409, 'EQUIPMENT_NOT_REQUESTABLE', 'This equipment is not available for requests (maintenance).'],
    ['a user without borrower capability', 403, 'PERMISSION_DENIED', 'This action requires borrower capability.'],
  ])('keeps the form open and explains %s', async (_, status, code, message) => {
    vi.spyOn(borrowApi, 'createBorrowRequest').mockRejectedValue(new BorrowRequestError(message, status, code));
    await openForm();
    fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Purpose')).toHaveValue('Cell imaging');
  });

  it('sends an expired session to sign in', async () => {
    vi.spyOn(borrowApi, 'createBorrowRequest').mockRejectedValue(
      new BorrowRequestError('Authentication credentials were not provided.', 401, 'AUTHENTICATION_REQUIRED'));
    await openForm();
    fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    await vi.waitFor(() => expect(window.location.hash).toBe('#login'));
  });

  it('closes with Cancel or Escape', async () => {
    await openForm();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Request to borrow' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    ['the user is not a borrower', item, { ...borrower, is_borrower: false }],
    ['the user provides the equipment', { ...item, provider: 'borrower-1' }, borrower],
  ])('hides the action when %s', async (_, equipment, user) => {
    vi.spyOn(equipmentApi, 'getEquipment').mockResolvedValue(equipment);
    render(<EquipmentDetailPage equipmentId="eq-1" user={user} />);
    expect(await screen.findByRole('heading', { name: 'Microscope' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request to borrow' })).not.toBeInTheDocument();
  });

  it('explains why equipment under maintenance cannot be requested', async () => {
    vi.spyOn(equipmentApi, 'getEquipment').mockResolvedValue({ ...item, status: 'MAINTENANCE' });
    render(<EquipmentDetailPage equipmentId="eq-1" user={borrower} />);
    expect(await screen.findByText('This equipment cannot be requested while its status is maintenance.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request to borrow' })).not.toBeInTheDocument();
  });
});
