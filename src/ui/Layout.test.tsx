import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import Layout from './Layout';

afterEach(cleanup);

it('renders the four navigation links', () => {
  render(<Layout />);
  for (const name of ['Train', 'History', 'Profile', 'Settings']) {
    expect(screen.getByRole('link', { name })).toBeTruthy();
  }
});

it('renders the exact training disclaimer', () => {
  render(<Layout />);
  expect(screen.getByText('CJL is a training tool. It is not legal, accounting or financial advice.')).toBeTruthy();
});

it.each([
  ['/', 'Train'],
  ['/history', 'History'],
  ['/profile', 'Profile'],
  ['/settings', 'Settings'],
])('renders the heading at #%s', (path, name) => {
  window.location.hash = path;
  render(<Layout />);
  expect(screen.getByRole('heading', { name, level: 1 })).toBeTruthy();
});
