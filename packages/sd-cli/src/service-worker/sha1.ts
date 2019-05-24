enum Endian {
  Little,
  Big
}

export function sha1Binary(buffer: ArrayBuffer): string {
  const words32 = arrayBufferToWords32(buffer, Endian.Big);
  return _sha1(words32, buffer.byteLength * 8);
}

function _sha1(words32: number[], len: number): string {
  const w = new Array(80);
  let [a, b, c, d, e]: number[] = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];

  words32[len >> 5] |= 0x80 << (24 - len % 32);
  words32[((len + 64 >> 9) << 4) + 15] = len;

  for (let i = 0; i < words32.length; i += 16) {
    const [h0, h1, h2, h3, h4]: number[] = [a, b, c, d, e];

    for (let j = 0; j < 80; j++) {
      if (j < 16) {
        w[j] = words32[i + j];
      }
      else {
        w[j] = rol32(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
      }

      const fkValues = fk(j, b, c, d);
      const f = fkValues[0];
      const k = fkValues[1];

      const temp = [rol32(a, 5), f, e, k, w[j]].reduce(add32);
      [e, d, c, b, a] = [d, c, rol32(b, 30), a, temp];
    }

    [a, b, c, d, e] = [add32(a, h0), add32(b, h1), add32(c, h2), add32(d, h3), add32(e, h4)];
  }

  return byteStringToHexString(words32ToByteString([a, b, c, d, e]));
}

function add32(a: number, b: number): number {
  return add32to64(a, b)[1];
}

function add32to64(a: number, b: number): [number, number] {
  const low = (a & 0xFFFF) + (b & 0xFFFF);
  const high = (a >>> 16) + (b >>> 16) + (low >>> 16);
  return [high >>> 16, (high << 16) | (low & 0xFFFF)];
}

// Rotate a 32b number left `count` position
function rol32(a: number, count: number): number {
  return (a << count) | (a >>> (32 - count));
}

function fk(index: number, b: number, c: number, d: number): [number, number] {
  if (index < 20) {
    return [(b & c) | (~b & d), 0x5A827999];
  }

  if (index < 40) {
    return [b ^ c ^ d, 0x6ED9EBA1];
  }

  if (index < 60) {
    return [(b & c) | (b & d) | (c & d), 0x8F1BBCDC];
  }

  return [b ^ c ^ d, 0xCA62C1D6];
}

function arrayBufferToWords32(buffer: ArrayBuffer, endian: Endian): number[] {
  const words32 = Array((buffer.byteLength + 3) >>> 2);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < words32.length; i++) {
    words32[i] = wordAt(view, i * 4, endian);
  }
  return words32;
}

function byteAt(str: string | Uint8Array, index: number): number {
  if (typeof str === "string") {
    return index >= str.length ? 0 : str.charCodeAt(index) & 0xFF;
  }
  else {
    return index >= str.byteLength ? 0 : str[index] & 0xFF;
  }
}

function wordAt(str: string | Uint8Array, index: number, endian: Endian): number {
  let word = 0;
  if (endian === Endian.Big) {
    for (let i = 0; i < 4; i++) {
      word += byteAt(str, index + i) << (24 - 8 * i);
    }
  }
  else {
    for (let i = 0; i < 4; i++) {
      word += byteAt(str, index + i) << 8 * i;
    }
  }
  return word;
}

function words32ToByteString(words32: number[]): string {
  return words32.reduce((str, word) => str + word32ToByteString(word), "");
}

function word32ToByteString(word: number): string {
  let str = "";
  for (let i = 0; i < 4; i++) {
    str += String.fromCharCode((word >>> 8 * (3 - i)) & 0xFF);
  }
  return str;
}

function byteStringToHexString(str: string): string {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    const b = byteAt(str, i);
    hex += (b >>> 4).toString(16) + (b & 0x0F).toString(16);
  }
  return hex.toLowerCase();
}
