import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const expected = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.openai.com https://api.github.com; base-uri 'none'; form-action 'none'";

export function checkCsp(html: string): void {
  const dom = new JSDOM(html);
  try {
    const document = dom.window.document;
    const policies = [...document.querySelectorAll('meta[http-equiv]')]
      .filter((meta) => meta.getAttribute('http-equiv')?.toLowerCase() === 'content-security-policy');
    if (policies.length !== 1 || policies[0].getAttribute('content') !== expected) {
      throw new Error('Build must include the exact production CSP.');
    }
    // Resolve relative paths against a synthetic Pages origin, never the local file system.
    const base = new URL('https://cjl.invalid/CJL/');
    for (const element of document.querySelectorAll('script[src], link[href]')) {
      const value = element.getAttribute(element.tagName === 'SCRIPT' ? 'src' : 'href')!;
      if (new URL(value, base).origin !== base.origin) {
        throw new Error('Build contains an external script or stylesheet asset.');
      }
    }
  } finally {
    dom.window.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    checkCsp(readFileSync('dist/index.html', 'utf8'));
    console.log('CSP and asset origins verified.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'CSP verification failed.');
    process.exitCode = 1;
  }
}
