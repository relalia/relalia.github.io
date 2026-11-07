import assert from 'node:assert/strict';

export function assertStaticReport(html, id, route) {
  assert(html.includes('access-password'), `Missing access gate on ${route}`);
  assert(html.includes(String.raw`\"activeId\":\"${id}\"`), `Wrong active report on ${route}; expected ${id}`);
}
