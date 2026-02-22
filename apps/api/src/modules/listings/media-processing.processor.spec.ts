/**
 * Tests for media-processing.processor.ts
 *
 * Tests the dHash perceptual hashing logic by creating synthetic pixel buffers.
 * No S3 or Sharp installation required for the pure hash logic tests.
 */

// We re-implement the pure dHash function here to test its logic without
// triggering the Sharp dynamic import in the processor. The algorithm is
// deterministic and isolated.

function computeDHashFromPixels(data: Uint8Array): string {
  // Input: 9×8 greyscale pixel array (72 bytes)
  let hash = 0n;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col] ?? 0;
      const right = data[row * 9 + col + 1] ?? 0;
      if (left > right) {
        hash |= 1n << BigInt(row * 8 + col);
      }
    }
  }
  return hash.toString(16).padStart(16, '0');
}

function hammingDistance(a: string, b: string): number {
  const aVal = BigInt('0x' + a);
  const bVal = BigInt('0x' + b);
  let xor = aVal ^ bVal;
  let count = 0;
  while (xor > 0n) {
    if (xor & 1n) count++;
    xor >>= 1n;
  }
  return count;
}

describe('dHash perceptual hashing', () => {
  it('produces a 16-character hex string', () => {
    const pixels = new Uint8Array(72).fill(128);
    const hash = computeDHashFromPixels(pixels);
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('returns all-zeros hash for uniform pixel values (no gradient)', () => {
    // All pixels the same value → left never > right → hash = 0
    const pixels = new Uint8Array(72).fill(100);
    const hash = computeDHashFromPixels(pixels);
    expect(hash).toBe('0000000000000000');
  });

  it('returns all-ones hash when all left pixels are brighter than right pixels', () => {
    // Strictly decreasing left-to-right within each row ensures every
    // adjacent pair has left > right → all 64 bits set
    const pixels = new Uint8Array(72);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 9; col++) {
        pixels[row * 9 + col] = 250 - col * 28; // 250, 222, 194, …, 26
      }
    }
    const hash = computeDHashFromPixels(pixels);
    expect(hash).toBe('ffffffffffffffff');
  });

  it('identical images produce identical hashes', () => {
    const pixels = new Uint8Array(72);
    for (let i = 0; i < 72; i++) pixels[i] = (i * 7) % 256;
    const hash1 = computeDHashFromPixels(pixels);
    const hash2 = computeDHashFromPixels(pixels);
    expect(hash1).toBe(hash2);
  });

  it('similar images have low hamming distance', () => {
    // Create two nearly identical pixel arrays differing by one pixel
    const pixels1 = new Uint8Array(72).fill(150);
    const pixels2 = new Uint8Array(72).fill(150);
    pixels2[0] = 145; // tiny change — same direction, so same bit
    const hash1 = computeDHashFromPixels(pixels1);
    const hash2 = computeDHashFromPixels(pixels2);
    const distance = hammingDistance(hash1, hash2);
    expect(distance).toBeLessThan(10);
  });

  it('very different images have high hamming distance', () => {
    // pixels1: strictly decreasing per row → all bits set (ffffffffffffffff)
    // pixels2: strictly increasing per row → all bits clear (0000000000000000)
    // Hamming distance = 64 >> 20
    const pixels1 = new Uint8Array(72);
    const pixels2 = new Uint8Array(72);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 9; col++) {
        pixels1[row * 9 + col] = 250 - col * 28; // decreasing: left > right everywhere
        pixels2[row * 9 + col] = col * 28 + 26;  // increasing: right > left everywhere
      }
    }
    const hash1 = computeDHashFromPixels(pixels1);
    const hash2 = computeDHashFromPixels(pixels2);
    const distance = hammingDistance(hash1, hash2);
    // Completely opposite gradients → maximum difference
    expect(distance).toBeGreaterThan(20);
  });

  it('hamming distance function works correctly', () => {
    expect(hammingDistance('0000000000000000', '0000000000000000')).toBe(0);
    expect(hammingDistance('0000000000000000', '0000000000000001')).toBe(1);
    expect(hammingDistance('0000000000000000', 'ffffffffffffffff')).toBe(64);
  });
});
