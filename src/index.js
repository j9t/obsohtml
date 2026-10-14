// Obsolete or proprietary HTML elements
export const obsoleteElements = Object.freeze([
  'acronym', 'applet', 'basefont', 'bgsound', 'big', 'blink', 'center', 'command', 'content', 'dir', 'element', 'font', 'frame', 'frameset', 'image', 'isindex', 'keygen', 'listing', 'marquee', 'menuitem', 'multicol', 'nextid', 'nobr', 'noembed', 'noframes', 'param', 'plaintext', 'rb', 'rtc', 'shadow', 'spacer', 'strike', 'tt', 'xmp'
]);

// Obsolete or proprietary HTML attributes
export const obsoleteAttributes = Object.freeze([
  'align', 'background', 'bgcolor', 'border', 'frameborder', 'hspace', 'marginheight', 'marginwidth', 'noshade', 'nowrap', 'scrolling', 'valign', 'vspace'
]);

// One pre-compiled regex for all elements, so a document is scanned once
// rather than once per element; names end where HTML ends them, so custom
// elements like `font-awesome-icon` don’t match (and `frame` doesn’t
// match `frameset`)
const elementRegex = new RegExp(`<\\s*(${obsoleteElements.join('|')})(?=[\\s/>]|$)`, 'gi');

// Tag-like spans (from `<` up to `>`), and, within them, quoted values to skip
// and obsolete attribute names preceded by whitespace; as in HTML’s tokenizer,
// quotes only delimit values right after `=`
const tagRegex = /<(?:[^>=]+|=\s*"[^"]*"|=\s*'[^']*'|=)*/g;
const tagAttributeRegex = new RegExp(`=\\s*"[^"]*"|=\\s*'[^']*'|\\s(${obsoleteAttributes.join('|')})(?=[\\s/>=]|$)`, 'gi');

/**
 * Call `onFound` with the lowercase name and offset of every obsolete attribute.
 * Stops early when `onFound` returns false.
 *
 * @param {string} html
 * @param {(name: string, offset: number) => (boolean | undefined)} onFound
 */
function scanAttributes(html, onFound) {
  // One copy per scan: `matchAll` would clone the regex for every tag
  const attributeRegex = new RegExp(tagAttributeRegex);
  for (const tag of html.matchAll(tagRegex)) {
    if (!scanTag(tag[0], tag.index, attributeRegex, onFound)) return;
  }
}

/**
 * Scan one tag for `scanAttributes`, returning false to stop. A function of its own
 * rather than an inner loop, which V8 would keep deoptimizing on every exit.
 *
 * @param {string} tag
 * @param {number} offset
 * @param {RegExp} attributeRegex
 * @param {(name: string, offset: number) => (boolean | undefined)} onFound
 * @returns {boolean}
 */
function scanTag(tag, offset, attributeRegex, onFound) {
  let m;
  while ((m = attributeRegex.exec(tag)) !== null) {
    if (m[1] && onFound(m[1].toLowerCase(), offset + m.index + 1) === false) return false;
  }
  return true;
}

/**
 * Return a function mapping a character offset to its 1-based line and column.
 *
 * @param {string} html
 * @returns {(offset: number) => { line: number, col: number }}
 */
function positionFinder(html) {
  const starts = [0];
  for (let i = html.indexOf('\n'); i !== -1; i = html.indexOf('\n', i + 1)) starts.push(i + 1);
  return offset => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: offset - starts[lo] + 1 };
  };
}

/**
 * @typedef {{ name: string, line: number, col: number }} Occurrence
 */

/**
 * Locate every obsolete and proprietary element and attribute in an HTML string, sorted by position.
 *
 * @param {string} html
 * @returns {{ elements: Occurrence[], attributes: Occurrence[] }}
 */
export function locateMarkup(html) {
  if (typeof html !== 'string') throw new TypeError('`html` must be a string');

  const elements = [];
  const attributes = [];

  for (const m of html.matchAll(elementRegex)) {
    elements.push({ name: m[1].toLowerCase(), offset: m.index });
  }

  scanAttributes(html, (name, offset) => {
    attributes.push({ name, offset });
  });

  // The line index is a scan of its own, so clean documents skip it
  if (elements.length === 0 && attributes.length === 0) return { elements: [], attributes: [] };

  const positionAt = positionFinder(html);
  /** @type {(a: { offset: number }, b: { offset: number }) => number} */
  const byOffset = (a, b) => a.offset - b.offset;
  /** @type {(found: { name: string, offset: number }[]) => Occurrence[]} */
  const toOccurrences = found => found.sort(byOffset).map(({ name, offset }) => ({ name, ...positionAt(offset) }));

  return { elements: toOccurrences(elements), attributes: toOccurrences(attributes) };
}

/**
 * Check an HTML string for obsolete and proprietary elements and attributes.
 *
 * @param {string} html
 * @returns {{ elements: string[], attributes: string[] }}
 */
export function checkMarkup(html) {
  if (typeof html !== 'string') throw new TypeError('`html` must be a string');

  /** @type {Set<string>} */
  const namesElements = new Set();
  for (const m of html.matchAll(elementRegex)) namesElements.add(m[1].toLowerCase());

  /** @type {Set<string>} */
  const namesAttributes = new Set();
  scanAttributes(html, name => {
    namesAttributes.add(name);
    // Once every obsolete attribute is found, nothing can change the result
    return namesAttributes.size < obsoleteAttributes.length;
  });

  return {
    elements: obsoleteElements.filter(element => namesElements.has(element)),
    attributes: obsoleteAttributes.filter(attribute => namesAttributes.has(attribute)),
  };
}
