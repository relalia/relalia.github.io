/** @typedef {{algorithm:'PBKDF2', hash:'SHA-256', iterations:number, length:256, salt:string, verifier:string, version:string}} AccessConfig */
/** @typedef {{version:string, expiresAt:number}} AccessGrant */
export const ACCESS_STORAGE_KEY = 'relalia.access';
export const ACCESS_DURATION = 8 * 60 * 60 * 1000;

/** @param {string} value */
function decode(value) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }

/** @param {unknown} input @returns {AccessConfig | null} */
export function validateAccessConfig(input) {
  if (!input || typeof input !== 'object') return null;
  const value = /** @type {Record<string, unknown>} */ (input);
  const keys = ['algorithm','hash','iterations','length','salt','verifier','version'];
  if (Object.keys(value).length !== keys.length || keys.some(key => !(key in value))) return null;
  if (value.algorithm !== 'PBKDF2' || value.hash !== 'SHA-256' || value.length !== 256 ||
      !Number.isInteger(value.iterations) || Number(value.iterations) < 600000 || Number(value.iterations) > 2000000 ||
      typeof value.version !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.version) ||
      typeof value.salt !== 'string' || typeof value.verifier !== 'string') return null;
  try {
    if (!/^[A-Za-z0-9+/]{22}==$/.test(value.salt) || decode(value.salt).length !== 16 ||
        !/^[A-Za-z0-9+/]{43}=$/.test(value.verifier) || decode(value.verifier).length !== 32) return null;
  } catch { return null; }
  return /** @type {AccessConfig} */ (value);
}

/** @param {string | null} raw @param {AccessConfig} config @param {number} now @returns {AccessGrant | null} */
export function readAccessGrant(raw, config, now) {
  try {
    const value = JSON.parse(raw || 'null');
    if (!value || Object.keys(value).length !== 2 || value.version !== config.version ||
        !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + ACCESS_DURATION) return null;
    return value;
  } catch { return null; }
}

/** @param {string} password @param {AccessConfig} config @param {SubtleCrypto} subtle */
export async function verifyAccessPassword(password, config, subtle) {
  const encoded = new TextEncoder().encode(password);
  let derived;
  try {
    const key = await subtle.importKey('raw', encoded, 'PBKDF2', false, ['deriveBits']);
    // Release the UTF-8 input as soon as the browser has imported it.
    encoded.fill(0);
    derived = new Uint8Array(await subtle.deriveBits({name:'PBKDF2', hash:config.hash,
      iterations:config.iterations, salt:decode(config.salt)}, key, config.length));
    const expected = decode(config.verifier);
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= derived[i] ^ expected[i];
    expected.fill(0);
    return difference === 0;
  } finally { encoded.fill(0); derived?.fill(0); }
}
