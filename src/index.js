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
  obsoleteElements.map(element => [element, new RegExp(`<\\s*${element}\\b`, 'i')])
);

const attributeRegexes = new Map(
  obsoleteAttributes.map(attribute => [
    attribute,
    // Matches the attribute preceded by whitespace anywhere in a tag, without
    // requiring it to be the last attribute before the closing bracket.
    new RegExp(`<[^>]*\\s${attribute}\\b(\\s*=\\s*(?:"[^"]*"|'[^']*'|[^"'\\s>]+))?`, 'i'),
  ])
);

/**
 * Check an HTML string for obsolete and proprietary elements and attributes.
 *
 * @param {string} html
 * @returns {{ elements: string[], attributes: string[] }}
 */
export function checkMarkup(html) {
  if (typeof html !== 'string') throw new TypeError('`html` must be a string');

  const elements = [];
  const attributes = [];

  for (const [element, regex] of elementRegexes) {
    if (regex.test(html)) elements.push(element);
  }

  for (const [attribute, regex] of attributeRegexes) {
    if (regex.test(html)) attributes.push(attribute);
  }

  return { elements, attributes };
}
