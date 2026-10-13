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
  obsoleteElements.map(element => [element, new RegExp(`<\\s*${element}\\b`, 'gi')])
);

const attributeRegexes = new Map(
  obsoleteAttributes.map(attribute => [
    attribute,
    // Matches the attribute preceded by whitespace anywhere in a tag, without
    // requiring it to be the last attribute before the closing bracket;
    // the `d` flag exposes where the name itself starts
    new RegExp(`<(?:[^>"']|"[^"]*"|'[^']*')*\\s(${attribute})\\b(\\s*=\\s*(?:"[^"]*"|'[^']*'|[^"'\\s>]+))?`, 'gid'),
  ])
);

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

  for (const [attribute, regex] of attributeRegexes) {
    for (const m of html.matchAll(regex)) attributes.push({ name: attribute, offset: /** @type {number[][]} */ (m.indices)[1][0] });
  }

  return { elements: toOccurrences(elements), attributes: toOccurrences(attributes) };
}

/**
 * Check an HTML string for obsolete and proprietary elements and attributes.
 *
 * @param {string} html
 * @returns {{ elements: string[], attributes: string[] }}
 */
export function checkMarkup(html) {
  const { elements, attributes } = locateMarkup(html);
  const namesElements = new Set(elements.map(e => e.name));
  const namesAttributes = new Set(attributes.map(a => a.name));

  return {
    elements: obsoleteElements.filter(element => namesElements.has(element)),
    attributes: obsoleteAttributes.filter(attribute => namesAttributes.has(attribute)),
  };
}
