import { describe, expect, it } from 'vitest';
import { err, isErr, isOk, map, mapErr, ok, unwrap } from './index.js';
import { ValidationError } from './index.js';

describe('result', () => {
  it('constructs and narrows', () => {
    expect(isOk(ok(1))).toBe(true);
    expect(isErr(err('x'))).toBe(true);
  });
  it('maps value and error', () => {
    expect(map(ok(2), (n) => n * 3)).toEqual(ok(6));
    expect(mapErr(err('e'), (e) => `${e}!`)).toEqual(err('e!'));
    expect(map(err<string>('e'), (n: number) => n)).toEqual(err('e'));
  });
  it('unwraps or throws', () => {
    expect(unwrap(ok('v'))).toBe('v');
    expect(() => unwrap(err(new ValidationError('bad')))).toThrow(ValidationError);
    expect(() => unwrap(err('plain'))).toThrow('plain');
  });
});
