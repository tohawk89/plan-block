const ENCODING = '0123456789abcdefghjkmnpqrstvwxyz';

/**
 * Lowercase ULID: 10 chars of millisecond time + 16 random chars.
 * Blocks get their id on the client so a new block can be referenced by
 * later commands before the server replies.
 */
export function ulid(now: number = Date.now()): string {
  let time = '';
  let n = now;

  for (let i = 0; i < 10; i++) {
    time = ENCODING.charAt(n % 32) + time;
    n = Math.floor(n / 32);
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  let random = '';
  for (const byte of bytes) {
    random += ENCODING.charAt(byte % 32); // 256 is a multiple of 32: unbiased
  }

  return time + random;
}
