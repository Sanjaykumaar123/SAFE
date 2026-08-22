import { render } from '@testing-library/react-native';

import { ConfidenceBadge, SeverityBadge, StatusBadge } from '../Badge';

// @testing-library/react-native v14's `render` is async — see Button.test.tsx.
describe('Badge components (section 48 — never color alone: icon + text always present)', () => {
  it('SeverityBadge renders the severity label as text', async () => {
    const { getByText } = await render(<SeverityBadge severity="CRITICAL" />);
    expect(getByText('CRITICAL')).toBeTruthy();
  });

  it('StatusBadge renders the friendly status label, not the raw enum', async () => {
    const { getByText } = await render(<StatusBadge status="UNDER_REVIEW" />);
    expect(getByText('Under Review')).toBeTruthy();
  });

  it('ConfidenceBadge renders confidence as a rounded percentage', async () => {
    const { getByText } = await render(<ConfidenceBadge confidence={0.943} />);
    expect(getByText('94% AI confidence')).toBeTruthy();
  });
});
