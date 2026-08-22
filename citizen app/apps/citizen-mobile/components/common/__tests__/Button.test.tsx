import { fireEvent, render } from '@testing-library/react-native';

import { Button } from '../Button';

// @testing-library/react-native v14's `render`/`fireEvent` are async (they
// await React's concurrent rendering internally) — every call here must be
// awaited or the returned queries are a pending Promise, not the result.
describe('Button', () => {
  it('renders its label and calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button label="Submit Report" onPress={onPress} />);
    await fireEvent.press(getByText('Submit Report'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button label="Submit Report" onPress={onPress} disabled />);
    await fireEvent.press(getByText('Submit Report'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress while loading', async () => {
    const onPress = jest.fn();
    // The label is replaced by a spinner while loading, so the button is
    // targeted by accessibility role instead of by its (absent) text.
    const { getByRole } = await render(<Button label="Submit Report" onPress={onPress} loading />);
    await fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes an accessible label matching its text', async () => {
    const { getByLabelText } = await render(<Button label="Log In" onPress={() => {}} />);
    expect(getByLabelText('Log In')).toBeTruthy();
  });
});
