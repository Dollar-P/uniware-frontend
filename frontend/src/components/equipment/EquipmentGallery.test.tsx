import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EquipmentGallery from './EquipmentGallery';

const photos = [1, 2, 3].map(slot => ({ slot, preview_url: `/api/photos/equipment/id/preview-${slot}`, original_url: `/api/photos/equipment/id/original-${slot}` }));
describe('equipment gallery', () => {
  it('switches previews and loads the original only when opened', async () => {
    render(<EquipmentGallery photos={photos} name="Camera" />);
    expect(screen.queryByAltText('Camera, full-size photo')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show photo 2' }));
    expect(screen.getByAltText('Camera, photo 2')).toHaveAttribute('src', photos[1].preview_url);
    await userEvent.click(screen.getByRole('button', { name: 'View full-size photo' }));
    expect(screen.getByAltText('Camera, full-size photo')).toHaveAttribute('src', photos[1].original_url);
    await userEvent.click(screen.getByRole('button', { name: 'Close full-size photo' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('shows placeholders when there is no photo or loading fails', () => {
    const view = render(<EquipmentGallery name="Camera" />);
    expect(screen.getByText('No photo available')).toBeInTheDocument();
    view.unmount();
    render(<EquipmentGallery name="Camera" photos={photos} />);
    fireEvent.error(screen.getByAltText('Camera, photo 1'));
    expect(screen.getByText('Photo unavailable')).toBeInTheDocument();
  });
});
