/* Pure IPv4 calculation functions, shared by the browser and tests. */
export function parseIPv4(input, label = 'IPv4アドレス') {
  const value = input.trim();
  const parts = value.split('.');
  if (parts.length !== 4 || parts.some(part => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)) {
    throw new Error(`${label}は 0〜255 の数値4つをドットで区切って入力してください。`);
  }
  return parts.reduce((result, part) => result * 256 + Number(part), 0);
}

export function formatIPv4(value) {
  return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
}

export function calculate(networkInput, wildcardInput) {
  const address = parseIPv4(networkInput, 'ネットワークアドレス');
  const wildcard = parseIPv4(wildcardInput, 'ワイルドカードマスク');
  const base = (address & ~wildcard) >>> 0;
  const positions = Array.from({ length: 32 }, (_, bit) => bit).filter(bit => ((wildcard >>> bit) & 1) === 1);
  return {
    address, wildcard, base, positions,
    last: (base | wildcard) >>> 0,
    count: 2 ** positions.length,
  };
}

export function addressAt(result, index) {
  if (!Number.isInteger(index) || index < 0 || index >= result.count) {
    throw new RangeError('アドレスのインデックスが範囲外です。');
  }
  let value = result.base;
  result.positions.forEach((position, digit) => {
    if (Math.floor(index / 2 ** digit) % 2 === 1) value += 2 ** position;
  });
  return formatIPv4(value);
}

export function addressesForPage(result, page, pageSize = 256) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 65536) throw new RangeError('ページサイズが範囲外です。');
  if (!Number.isInteger(page) || page < 0 || page >= Math.ceil(result.count / pageSize)) throw new RangeError('ページが範囲外です。');
  const start = page * pageSize;
  return Array.from({ length: Math.min(pageSize, result.count - start) }, (_, index) => addressAt(result, start + index));
}
