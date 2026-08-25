import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Alert, Badge, Button, Card, EmptyState, Input, cn } from './index.js';

describe('@dlv/ui', () => {
  it('cn joins truthy class names', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b');
  });

  it('Button renders label, type and variant classes', () => {
    const html = renderToStaticMarkup(createElement(Button, { variant: 'danger' }, 'Delete'));
    expect(html).toContain('Delete');
    expect(html).toContain('type="button"');
    expect(html).toContain('bg-danger');
  });

  it('Badge and Alert render their content', () => {
    expect(renderToStaticMarkup(createElement(Badge, {}, 'New'))).toContain('New');
    const alert = renderToStaticMarkup(createElement(Alert, { variant: 'danger', title: 'Oops' }));
    expect(alert).toContain('Oops');
    expect(alert).toContain('role="alert"');
  });

  it('Input wires label + error a11y', () => {
    const html = renderToStaticMarkup(
      createElement(Input, { label: 'Email', error: 'Required', id: 'email' }),
    );
    expect(html).toContain('for="email"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('Required');
  });

  it('Card and EmptyState compose', () => {
    expect(renderToStaticMarkup(createElement(Card, {}, 'body'))).toContain('body');
    expect(
      renderToStaticMarkup(createElement(EmptyState, { title: 'Nothing here' })),
    ).toContain('Nothing here');
  });
});
