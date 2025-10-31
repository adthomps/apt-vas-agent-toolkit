const assert = require('assert');

function expectEqual(a, b, msg) {
  try { assert.deepStrictEqual(a, b); console.log('PASS:', msg); }
  catch (e) { console.error('FAIL:', msg); console.error(e); process.exitCode = 2; }
}

// Tests (use dynamic import so extractor can be ESM in the browser)
(async function run() {
  console.log('Running extractor tests...');
  const mod = await import('./extractor.js');
  const { inferFromText, wordsToNumber } = mod;

  const t1 = 'Create a pay link for $25.00 USD for "Sticker Pack" with memo "Sticker Pack"';
  const r1 = inferFromText(t1, {});
  expectEqual(r1.amount, '25.00', 'extract $25.00 amount');
  expectEqual(r1.currency, 'USD', 'extract USD currency');
  expectEqual(r1.memo, 'Sticker Pack', 'extract memo from quotes');

  const t2 = 'Create a donation link between 5 and 50 dollars for Charity';
  const r2 = inferFromText(t2, {});
  expectEqual(r2.minAmount, '5', 'extract min from between');
  expectEqual(r2.maxAmount, '50', 'extract max from between');
  expectEqual(r2.linkType, 'DONATION', 'infer linkType donation from text');

  const t3 = 'Donation: min amount 1.00 max amount 500 USD';
  const r3 = inferFromText(t3, {});
  expectEqual(r3.minAmount, '1', 'min explicit');
  expectEqual(r3.maxAmount, '500', 'max explicit');
  expectEqual(r3.currency, 'USD', 'currency explicit USD');

  const t4 = 'Please create a pay link for twenty five dollars for "T-shirt"';
  const r4 = inferFromText(t4, {});
  console.log('DEBUG r4 =>', r4);
  // wordsToNumber should parse 'twenty five'
  expectEqual(r4.amount, '25', 'parse words to number');
  expectEqual(r4.memo, 'T-shirt', 'memo extraction works');

  const t5 = 'Create a link for 12 GBP';
  const r5 = inferFromText(t5, {});
  expectEqual(r5.amount, '12', 'numeric with currency code');
  expectEqual(r5.currency, 'GBP', 'currency code GBP');

  // Additional test cases added (edge / natural-language variations)
  const t6 = 'Please create a pay link for one hundred and twenty five dollars for "Custom Print"';
  const r6 = inferFromText(t6, {});
  expectEqual(r6.amount, '125', 'parse "one hundred and twenty five"');

  const t7 = 'Create a pay link for twenty-five dollars for "Sticker"';
  const r7 = inferFromText(t7, {});
  expectEqual(r7.amount, '25', 'parse hyphenated "twenty-five"');

  const t8 = 'Create a link for 2.50 USD for "Donation"';
  const r8 = inferFromText(t8, {});
  expectEqual(r8.amount, '2.50', 'parse decimal amount "2.50"');

  const t9 = 'Create a link for five to fifty dollars for "Tiered Donation"';
  const r9 = inferFromText(t9, {});
  // Expect donation inferred and min/max (five to fifty) -> try to capture min/max when phrased with 'to'
  expectEqual(r9.minAmount, '5', 'parse "five to fifty" min');
  expectEqual(r9.maxAmount, '50', 'parse "five to fifty" max');
  expectEqual(r9.linkType, 'DONATION', 'infer donation for "to" range');

  const t10 = 'Create a donation between five and fifty dollars for "Local Shelter"';
  const r10 = inferFromText(t10, {});
  expectEqual(r10.minAmount, '5', 'parse between five and fifty min');
  expectEqual(r10.maxAmount, '50', 'parse between five and fifty max');

  const t11 = 'Create link for fifty dollars each for "T-Shirts"';
  const r11 = inferFromText(t11, {});
  expectEqual(r11.amount, '50', 'parse "fifty dollars each"');

  const t12 = 'Create a pay link for 1,000 USD for "Conference"';
  const r12 = inferFromText(t12, {});
  expectEqual(r12.amount, '1000', 'parse comma thousands "1,000"');

  console.log('All extractor tests completed.');
})();
