import { expect, it } from 'vitest';
import { checkCsp } from './check-csp';

const policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.openai.com https://api.github.com; base-uri 'none'; form-action 'none'";
const html = (extra = '') => '<html><head><meta http-equiv="Content-Security-Policy" content="' + policy + '">' + extra + '</head></html>';

it('accepts the exact policy and relative assets', () => {
  expect(() => checkCsp(html('<script src="./assets/app.js"></script><link href="./assets/app.css">'))).not.toThrow();
});
it('rejects a missing or altered policy', () => {
  expect(() => checkCsp('<html></html>')).toThrow();
  expect(() => checkCsp(html().replace("base-uri 'none'", "base-uri 'self'"))).toThrow();
});
it.each([
  '<script src="https://cdn.example/app.js"></script>',
  '<link href="//cdn.example/font.css">',
  '<script src="data:text/javascript,alert(1)"></script>',
  '<SCRIPT SRC="https:&#47;&#47;cdn.example/app.js"></SCRIPT>',
])('rejects external asset %s', (tag) => {
  expect(() => checkCsp(html(tag))).toThrow();
});
