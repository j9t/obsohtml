// Obsolete or proprietary HTML elements
export const obsoleteElements = Object.freeze([
  'acronym', 'applet', 'basefont', 'bgsound', 'big', 'blink', 'center', 'command', 'content', 'dir', 'element', 'font', 'frame', 'frameset', 'image', 'isindex', 'keygen', 'listing', 'marquee', 'menuitem', 'multicol', 'nextid', 'nobr', 'noembed', 'noframes', 'param', 'plaintext', 'rb', 'rtc', 'shadow', 'spacer', 'strike', 'tt', 'xmp'
]);

// Obsolete or proprietary HTML attributes
export const obsoleteAttributes = Object.freeze([
  'align', 'background', 'bgcolor', 'border', 'frameborder', 'hspace', 'marginheight', 'marginwidth', 'noshade', 'nowrap', 'scrolling', 'valign', 'vspace'
]);

// Pre-compiled regexes for performance
const elementRegexes = new Map(
  // Names end where HTML ends them, so custom elements like `font-awesome-icon` don’t match
  obsoleteElements.map(element => [element, new RegExp(`<\\s*${element}(?=[\\s/>]|$)`, 'gi')])
);

// Tag-like spans (from `<` up to `>`), and, within them, quoted values to skip
// and obsolete attribute names preceded by whitespace; as in HTML’s tokenizer,
// quotes only delimit values right after `=`
const tagRegex = /<(?:=\s*"[^"]*"|=\s*'[^']*'|[^>])*/g;
const tagAttributeRegex = new RegExp(`=\\s*"[^"]*"|=\\s*'[^']*'|\\s(${obsoleteAttributes.join('|')})(?=[\\s/>=]|$)`, 'gi');

/**
 * Call `onFound` with the lowercase name and offset of every obsolete attribute.
 *
 * @param {string} html
 * @param {(name: string, offset: number) => void} onFound
 */
function scanAttributes(html, onFound) {
  for (const tag of html.matchAll(tagRegex)) {
    for (const m of tag[0].matchAll(tagAttributeRegex)) {
      if (m[1]) onFound(m[1].toLowerCase(), tag.index + m.index + 1);
    }
  }
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

  const positionAt = positionFinder(html);
  /** @type {(a: { offset: number }, b: { offset: number }) => number} */
  const byOffset = (a, b) => a.offset - b.offset;
  /** @type {(found: { name: string, offset: number }[]) => Occurrence[]} */
  const toOccurrences = found => found.sort(byOffset).map(({ name, offset }) => ({ name, ...positionAt(offset) }));

  const elements = [];
  const attributes = [];

  for (const [element, regex] of elementRegexes) {
    for (const m of html.matchAll(regex)) elements.push({ name: element, offset: m.index });
  }

  scanAttributes(html, (name, offset) => attributes.push({ name, offset }));

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

  // Global regexes keep `lastIndex` between calls, so it’s reset around each test
  const isFound = (/** @type {RegExp} */ regex) => {
    regex.lastIndex = 0;
    const found = regex.test(html);
    regex.lastIndex = 0;
    return found;
  };

  /** @type {Set<string>} */
  const namesAttributes = new Set();
  scanAttributes(html, name => namesAttributes.add(name));

  return {
    elements: obsoleteElements.filter(element => isFound(/** @type {RegExp} */ (elementRegexes.get(element)))),
    attributes: obsoleteAttributes.filter(attribute => namesAttributes.has(attribute)),
  };
}
