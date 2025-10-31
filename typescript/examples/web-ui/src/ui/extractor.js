// Lightweight extractor helpers used by the AgentPanel
// Exported as plain JS so we can run unit tests via node without a full test framework.
// Toggle this to true to enable debug logging when running tests or debugging locally.
const DEBUG = false;

const numberWords = {
  zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
  eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19, twenty:20,
  thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90, hundred:100
};

function wordsToNumber(s) {
  if (!s) return NaN;
  s = String(s).toLowerCase().replace(/[^a-z\s-]/g, ' ');
  const parts = s.split(/[\s-]+/).filter(Boolean);
  let total = 0;
  let current = 0;
  for (const p of parts) {
    // ignore filler words like 'and'
    if (p === 'and') continue;
    if (numberWords[p] !== undefined) {
      const n = numberWords[p];
      if (n === 100) { current = (current || 1) * 100; }
      else current += n;
    } else {
      return NaN;
    }
  }
  total += current;
  return total || NaN;
}

function normalizeCurrencyWord(word) {
  if (!word) return undefined;
  word = word.toLowerCase();
  if (/usd|us dollar|us dollars|dollars?/.test(word)) return 'USD';
  if (/eur|euro/.test(word)) return 'EUR';
  if (/gbp|pound|pounds/.test(word)) return 'GBP';
  if (/jpy|yen/.test(word)) return 'JPY';
  if (/cad/.test(word)) return 'CAD';
  if (/aud/.test(word)) return 'AUD';
  if (/inr/.test(word)) return 'INR';
  if (/sgd/.test(word)) return 'SGD';
  if (/chf/.test(word)) return 'CHF';
  if (/cny|yuan/.test(word)) return 'CNY';
  return undefined;
}

function extractNumberFromMatch(m) {
  if (!m) return NaN;
  // m may be a regex match array or a simple string/array
  let s;
  if (Array.isArray(m)) s = m[1] || m[0];
  else s = String(m);
  if (!s) return NaN;
  // remove trailing currency words that sometimes get captured with word phrases
  s = String(s).replace(/\b(dollars?|usd|eur|euros?|pounds?|gbp|jpy|yen|cad|aud|inr|sgd|chf|cny)\b/gi, '').trim();
  // try numeric (strip commas)
  const asNum = Number(String(s).replace(/,/g, ''));
  if (!Number.isNaN(asNum)) return asNum;
  // try words
  return wordsToNumber(String(s));
}

function inferFromText(text, src) {
  const out = Object.assign({}, src || {});
  const t = String(text || '');
  const lower = t.toLowerCase();

  // Range: "between 5 and 50" — parse manually around keywords to avoid greedy regex matches
  const betweenIdx = lower.indexOf('between ');
  if (betweenIdx !== -1) {
    const after = lower.slice(betweenIdx + 'between '.length);
    const andIdx = after.indexOf(' and ');
    if (andIdx !== -1) {
      const leftPart = after.slice(0, andIdx);
      const rightPart = after.slice(andIdx + ' and '.length);
      const leftTokens = (leftPart.match(/[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[a-z-]+/gi) || []);
      const rightTokens = (rightPart.match(/[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[a-z-]+/gi) || []);
      // pick sensible candidates: prefer numeric tokens, otherwise nearby short word phrases
      const leftCandidate = (function() {
        for (let i = leftTokens.length - 1; i >= 0; i--) if (/[0-9]/.test(leftTokens[i])) return leftTokens[i];
        return leftTokens.slice(-1).join(' ');
      })();
      const rightCandidate = (function() {
        for (let i = 0; i < rightTokens.length; i++) if (/[0-9]/.test(rightTokens[i])) return rightTokens[i];
        return rightTokens.slice(0,2).join(' ');
      })();
      const a = extractNumberFromMatch([leftCandidate, leftCandidate]);
      const b = extractNumberFromMatch([rightCandidate, rightCandidate]);
      if (!out.minAmount && !Number.isNaN(a)) out.minAmount = String(a);
      if (!out.maxAmount && !Number.isNaN(b)) out.maxAmount = String(b);
      if (!out.linkType) out.linkType = 'DONATION';
    }
  }

  // Range: "5 to 50" (common phrasing) — handle programmatically (grab nearest tokens)
  const toIdx = lower.indexOf(' to ');
  if (toIdx !== -1) {
    const left = lower.slice(0, toIdx);
    const right = lower.slice(toIdx + 4);
    const leftTokens = (left.match(/[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[a-z-]+/gi) || []);
    const rightTokens = (right.match(/[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[a-z-]+/gi) || []);
    const leftCandidate = (function() {
      for (let i = leftTokens.length - 1; i >= 0; i--) if (/[0-9]/.test(leftTokens[i])) return leftTokens[i];
      return leftTokens.slice(-1).join(' ');
    })();
    const rightCandidate = (function() {
      for (let i = 0; i < rightTokens.length; i++) if (/[0-9]/.test(rightTokens[i])) return rightTokens[i];
      return rightTokens.slice(0,2).join(' ');
    })();
    const a = extractNumberFromMatch([leftCandidate, leftCandidate]);
    const b = extractNumberFromMatch([rightCandidate, rightCandidate]);
    if (!out.minAmount && !Number.isNaN(a)) out.minAmount = String(a);
    if (!out.maxAmount && !Number.isNaN(b)) out.maxAmount = String(b);
    if (!out.linkType && (!out.minAmount || !out.maxAmount)) out.linkType = 'DONATION';
  }

  // $12.34 or $12 or 12.34 USD
  const dollarMatch = /\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/.exec(t);
  const trailingCodeMatch = /([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(usd|eur|gbp|jpy|cad|aud|inr|sgd|chf|cny)\b/i.exec(t);
  // match explicit phrases like 'for twenty five dollars' (require currency word)
  const numWordAmount = /(?:amount|for|of)\s+([a-z\-\s]{1,60}?)\s+(dollars|usd|euros|eur)\b/i.exec(t);
  // capture up to ~6 words immediately before a currency word (non-greedy for long sentences)
  const wordsAmountMatch = /((?:[a-z]+\s+){0,6}[a-z-]+)\s+(dollars|euros|pounds|usd|eur|gbp)\b/i.exec(t);
  const numberThenCurrency = /([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(dollars|usd|euros|eur|pounds|gbp)\b/i.exec(t);

  // Only set a single 'amount' when a min/max range hasn't already been inferred.
  if (!out.amount && !(out.minAmount && out.maxAmount)) {
    if (dollarMatch) out.amount = dollarMatch[1].replace(/,/g,'');
    else if (trailingCodeMatch) out.amount = trailingCodeMatch[1].replace(/,/g,'');
    else if (numberThenCurrency) out.amount = numberThenCurrency[1].replace(/,/g,'');
    else if (numWordAmount) {
      if (DEBUG) console.debug('numWordAmount match:', numWordAmount);
      const parsed = wordsToNumber(numWordAmount[1]); if (!Number.isNaN(parsed)) out.amount = String(parsed);
    } else if (wordsAmountMatch) {
      if (DEBUG) console.debug('wordsAmountMatch:', wordsAmountMatch);
      const parsed = wordsToNumber(wordsAmountMatch[1]);
      if (DEBUG) console.debug('parsed words amount:', wordsAmountMatch[1], '=>', parsed);
      if (!Number.isNaN(parsed)) out.amount = String(parsed);
    }
  }

  // currency
  if (!out.currency) {
    const sym = (t.match(/[$]/) || [])[0];
    const symbolMap = { '$':'USD','':'EUR','':'GBP','':'JPY' };
    if (sym && symbolMap[sym]) out.currency = symbolMap[sym];
    else if (trailingCodeMatch && trailingCodeMatch[2]) out.currency = trailingCodeMatch[2].toUpperCase();
    else {
      const code = /\b(usd|eur|gbp|jpy|cad|aud|inr|sgd|chf|cny)\b/i.exec(t);
      if (code) out.currency = code[1].toUpperCase();
      else {
        const wordCurrency = /\b(us dollars|us dollar|dollars|euros|pounds|yen)\b/i.exec(t);
        if (wordCurrency) {
          const norm = normalizeCurrencyWord(wordCurrency[1]); if (norm) out.currency = norm;
        }
      }
    }
  }

  // linkType
  if (!out.linkType) {
    if (/donat|charit|contribut/i.test(lower)) out.linkType = 'DONATION';
    else if (/purchase|buy|order|product|item|sell/i.test(lower)) out.linkType = 'PURCHASE';
  }

  // min/max explicit
  const minMatch = /min(?:imum)?\s*(?:amount)?\s*[:=]?\s*\$?([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[a-z\-\s]+)/i.exec(t);
  const maxMatch = /max(?:imum)?\s*(?:amount)?\s*[:=]?\s*\$?([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[a-z\-\s]+)/i.exec(t);
  if (minMatch && !out.minAmount) {
    const v = extractNumberFromMatch(minMatch); if (!Number.isNaN(v)) out.minAmount = String(v);
  }
  if (maxMatch && !out.maxAmount) {
    const v = extractNumberFromMatch(maxMatch); if (!Number.isNaN(v)) out.maxAmount = String(v);
  }

  // memo/product: quoted or after 'for' or 'memo' or 'description'
  if (!out.memo) {
    const quoteMatch = /\"([^\"]{2,80})\"|'([^']{2,80})'/.exec(t);
    if (quoteMatch) out.memo = quoteMatch[1] || quoteMatch[2];
    else {
      const forMatch = /(?:for|memo|description)\s+\"?([A-Za-z0-9\-\s]{3,80})\"?/i.exec(t);
      if (forMatch) out.memo = forMatch[1].trim();
    }
  }

  return out;
}

// Export as ES module for browser-friendly imports. Tests in Node will use dynamic import.
export { inferFromText, wordsToNumber };
