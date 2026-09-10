import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyEquipmentPage from './MyEquipmentPage';
import * as api from '../services/equipmentApi';
import { EquipmentError } from '../types/equipment';
import type { Equipment } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';

const provider: RegisterResponse = {
  id: 'user-1', email: 'provider@chula.ac.th', first_name: 'Pat', last_name: 'Provider',
  department: 'Engineering', is_admin: false, is_provider: true, is_borrower: true,
  account_status: 'ACTIVE', date_joined: '2026-01-01T00:00:00Z',
};
const borrower: RegisterResponse = { ...provider, is_provider: false };

function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 'eq-1', asset_id: 'AST-001', name: 'Microscope', model: 'MX-5', description: 'Lab scope',
    provider: 'user-1',
    category: { id: 'cat-1', name: 'Lab' },
    location: { id: 'loc-1', name: 'Building A' },
    status: 'AVAILABLE', archived_at: null, disabled_at: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function paginate(results: Equipment[], next: string | null = null) {
  return { count: results.length, next, previous: null, results };
}

describe('MyEquipmentPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'listCategories').mockResolvedValue([{ id: 'cat-1', name: 'Lab' }]);
    vi.spyOn(api, 'listLocations').mockResolvedValue([{ id: 'loc-1', name: 'Building A' }]);
  });
  afterEach(() => vi.restoreAllMocks());

  it('US2-2: lists only the equipment the provider owns', async () => {
    const listSpy = vi.spyOn(api, 'listMyEquipment').mockResolvedValue(paginate([makeEquipment()]));
    render(<MyEquipmentPage user={provider} />);

    expect(await screen.findByText('Microscope')).toBeInTheDocument();
    expect(screen.getByText('AST-001')).toBeInTheDocument();
    expect(screen.getByText('Lab')).toBeInTheDocument();
    expect(screen.getByText('Building A')).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledWith(1);
  });

  it('US2-2: shows the empty state when the inventory has no items', async () => {
    vi.spyOn(api, 'listMyEquipment').mockResolvedValue(paginate([]));
    render(<MyEquipmentPage user={provider} />);

    expect(await screen.findByText('No equipment yet')).toBeInTheDocument();
  });

  it('US2-2: shows access denied to a user without provider capability', async () => {
    const listSpy = vi.spyOn(api, 'listMyEquipment');
    render(<MyEquipmentPage user={borrower} />);

    expect(await screen.findByText('Provider access required')).toBeInTheDocument();
    expect(listSpy).not.toHaveBeenCalled();
  });

  it('US2-2: shows access denied when the server rejects with 403', async () => {
    vi.spyOn(api, 'listMyEquipment').mockRejectedValue(
      new EquipmentError('This action requires provider capability.', {}, 403),
    );
    render(<MyEquipmentPage user={provider} />);

    expect(await screen.findByText('Provider access required')).toBeInTheDocument();
  });

  it('US2-2: offers a retry when loading fails', async () => {
    const listSpy = vi.spyOn(api, 'listMyEquipment')
      .mockRejectedValueOnce(new EquipmentError('Network down', {}, 500))
      .mockResolvedValueOnce(paginate([makeEquipment()]));
    render(<MyEquipmentPage user={provider} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Microscope')).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledTimes(2);
  });

  it('US2-1: submits a new item and returns to the list', async () => {
    vi.spyOn(api, 'listMyEquipment').mockResolvedValue(paginate([]));
    const createSpy = vi.spyOn(api, 'createEquipment')
      .mockResolvedValue(makeEquipment({ name: 'Oscilloscope' }));
    render(<MyEquipmentPage user={provider} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add equipment' }));
    await userEvent.type(screen.getByLabelText('Asset ID'), 'AST-002');
    await userEvent.type(screen.getByLabelText('Equipment name'), 'Oscilloscope');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'cat-1');
    await userEvent.selectOptions(screen.getByLabelText('Location'), 'loc-1');
    await userEvent.click(screen.getByRole('button', { name: 'Add equipment' }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      asset_id: 'AST-002', name: 'Oscilloscope', category_id: 'cat-1', location_id: 'loc-1',
      status: 'AVAILABLE',
    })));
    expect(await screen.findByRole('status')).toHaveTextContent('was added to your inventory');
  });

  it('US2-1: blocks submission when required fields are missing', async () => {
    vi.spyOn(api, 'listMyEquipment').mockResolvedValue(paginate([]));
    const createSpy = vi.spyOn(api, 'createEquipment');
    render(<MyEquipmentPage user={provider} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add equipment' }));
    await waitFor(() => expect(screen.getByLabelText('Asset ID')).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Add equipment' }));

    expect(await screen.findByText('Asset ID is required')).toBeInTheDocument();
    expect(screen.getByText('Equipment name is required')).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('US2-1: reports a duplicate asset ID against the field', async () => {
    vi.spyOn(api, 'listMyEquipment').mockResolvedValue(paginate([]));
    vi.spyOn(api, 'createEquipment').mockRejectedValue(new EquipmentError(
      'Request failed.',
      { asset_id: 'Equipment with this asset id already exists.' },
      400,
    ));
    render(<MyEquipmentPage user={provider} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add equipment' }));
    await userEvent.type(screen.getByLabelText('Asset ID'), 'AST-001');
    await userEvent.type(screen.getByLabelText('Equipment name'), 'Microscope');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'cat-1');
    await userEvent.selectOptions(screen.getByLabelText('Location'), 'loc-1');
    await userEvent.click(screen.getByRole('button', { name: 'Add equipment' }));

    expect(await screen.findByText('Equipment with this asset id already exists.')).toBeInTheDocument();
  });

  it('US2-3: prefills the edit form with the existing values', async () => {
    vi.spyOn(api, 'listMyEquipment').mockResolvedValue(paginate([makeEquipment()]));
    render(<MyEquipmentPage user={provider} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    expect(screen.getByLabelText('Asset ID')).toHaveValue('AST-001');
    expect(screen.getByLabelText('Equipment name')).toHaveValue('Microscope');
    await waitFor(() => expect(screen.getByLabelText('Category')).toHaveValue('cat-1'));
    expect(screen.getByLabelText('Location')).toHaveValue('loc-1');
  });

  it('US2-3: saves the edit and reflects it in the list without a refetch', async () => {
    const listSpy = vi.spyOn(api, 'listMyEquipment').mockResolvedValue(paginate([makeEquipment()]));
    const updateSpy = vi.spyOn(api, 'updateEquipment')
      .mockResolvedValue(makeEquipment({ name: 'Microscope MkII' }));
    render(<MyEquipmentPage user={provider} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Equipment name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Microscope MkII');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith('eq-1', expect.objectContaining({
      name: 'Microscope MkII',
    })));
    expect(await screen.findByText('Microscope MkII')).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledTimes(1);
  });

  it('US2-3: leaves the form open and shows the message when saving fails', async () => {
    vi.spyOn(api, 'listMyEquipment').mockResolvedValue(paginate([makeEquipment()]));
    vi.spyOn(api, 'updateEquipment').mockRejectedValue(
      new EquipmentError('Cannot change status from Available to Archived.', {}, 400),
    );
    render(<MyEquipmentPage user={provider} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Cannot change status from Available to Archived.');
    expect(screen.getByLabelText('Asset ID')).toBeInTheDocument();
  });

  it('US2-5: offers only the statuses a provider may set', async () => {
    vi.spyOn(api, 'listMyEquipment').mockResolvedValue(paginate([]));
    render(<MyEquipmentPage user={provider} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add equipment' }));
    const status = screen.getByLabelText('Status');

    expect(within(status).getAllByRole('option').map(option => option.textContent))
      .toEqual(['Available', 'Maintenance']);
  });

  it('US2-5: fills the category and location pickers from the server', async () => {
    vi.spyOn(api, 'listMyEquipment').mockResolvedValue(paginate([]));
    render(<MyEquipmentPage user={provider} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add equipment' }));

    await waitFor(() => expect(within(screen.getByLabelText('Category')).getByRole('option', { name: 'Lab' }))
      .toBeInTheDocument());
    expect(within(screen.getByLabelText('Location')).getByRole('option', { name: 'Building A' }))
      .toBeInTheDocument();
  });

  it('pages through a long inventory', async () => {
    const listSpy = vi.spyOn(api, 'listMyEquipment')
      .mockResolvedValueOnce({ ...paginate([makeEquipment()]), next: '/api/provider/equipment?page=2' })
      .mockResolvedValueOnce(paginate([makeEquipment({ id: 'eq-2', name: 'Centrifuge' })]));
    render(<MyEquipmentPage user={provider} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Centrifuge')).toBeInTheDocument();
    expect(listSpy).toHaveBeenLastCalledWith(2);
  });
});
