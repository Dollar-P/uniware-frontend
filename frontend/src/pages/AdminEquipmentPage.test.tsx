import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminEquipmentPage from './AdminEquipmentPage';
import * as api from '../services/equipmentApi';
import type { Equipment } from '../types/equipment';

const item: Equipment = {
  id: 'equipment-1', asset_id: 'AST-001', name: 'Microscope', model: 'M-1', description: '',
  provider: 'owner-1', owner: { name: 'Lab Owner', email: 'owner@chula.ac.th', department: '' },
  category: { id: 'c1', name: 'Lab' }, location: { id: 'l1', name: 'Engineering' },
  status: 'AVAILABLE', admin_suspended: false, is_suspended: false, suspension_reason: '',
  archived_at: null, disabled_at: null, created_at: '', updated_at: '',
};
afterEach(() => vi.restoreAllMocks());
describe('Admin equipment suspension', () => {
  it('requires reason and persists a manual hold', async () => {
    vi.spyOn(api, 'listAdminEquipment').mockResolvedValue({ count: 1, next: null, previous: null, results: [item] });
    const save = vi.spyOn(api, 'updateEquipmentSuspension').mockResolvedValue({
      ...item, admin_suspended: true, is_suspended: true, suspension_reason: 'Inspection',
    });
    render(<AdminEquipmentPage />);
    await screen.findByText(/Microscope/);
    await userEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    await userEvent.type(screen.getByLabelText('Suspension reason (required)'), 'Inspection');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm suspension' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('equipment-1', true, 'Inspection'));
    expect(await screen.findByText('Inspection')).toBeInTheDocument();
  });
  it('does not provide manual release for items held by a suspended owner', async () => {
    vi.spyOn(api, 'listAdminEquipment').mockResolvedValue({
      count: 1, next: null, previous: null,
      results: [{ ...item, is_suspended: true, suspension_reason: 'Equipment owner account is suspended.' }],
    });
    render(<AdminEquipmentPage />);
    expect(await screen.findByText(/Automatically suspended because the owner/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove manual hold' })).not.toBeInTheDocument();
  });
});
