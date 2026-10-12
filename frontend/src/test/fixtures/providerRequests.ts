import type { Equipment } from '../../types/equipment';
import type { ProviderBorrowRequest } from '../../types/borrowRequest';

const sampleEquipment: Equipment = {
  id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  asset_id: 'EQ-1001', name: 'Oscilloscope', model: 'DS1054Z',
  description: 'Four-channel digital oscilloscope',
  provider: 'provider-sample', category: { id: 'cat-1', name: 'Electronics' },
  location: { id: 'loc-1', name: 'Engineering Lab' },
  status: 'AVAILABLE', archived_at: null, disabled_at: null,
  created_at: '2026-10-01T09:00:00Z', updated_at: '2026-10-01T09:00:00Z',
};

/** Local development data only: not evidence of real requests. */
export const providerRequestFixtures: ProviderBorrowRequest[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    borrower: { id: 'borrower-1', first_name: 'Somchai', last_name: 'Jaidee', email: 'somchai@chula.ac.th' },
    equipment: sampleEquipment, pickup_date: '2026-10-20', due_date: '2026-10-23',
    purpose: 'Electronics lab project', status: 'PENDING', decision_reason: '', decided_by: null, decided_at: null,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    borrower: { id: 'borrower-2', first_name: 'Narin', last_name: 'S.', email: 'narin@chula.ac.th' },
    equipment: { ...sampleEquipment, id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', name: 'Arduino Starter Kit', asset_id: 'EQ-1002' },
    pickup_date: '2026-10-25', due_date: '2026-10-28', purpose: 'Microcontroller coursework',
    status: 'PENDING', decision_reason: '', decided_by: null, decided_at: null,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    borrower: { id: 'borrower-3', first_name: 'Pim', last_name: 'T.', email: 'pim@chula.ac.th' },
    equipment: sampleEquipment, pickup_date: '2026-10-13', due_date: '2026-10-15',
    purpose: 'Research project', status: 'APPROVED', decision_reason: '',
    decided_by: 'provider-sample', decided_at: '2026-10-11T15:00:00Z',
  },
];
