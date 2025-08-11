import { renderWithProviders, screen } from '../../test/test-utils';
import { HomePage } from './HomePage';

test('renders home page heading', () => {
  renderWithProviders(<HomePage />);
  expect(screen.getByRole('heading', { name: /ideafinder/i })).toBeInTheDocument();
});


