// Synthetic benchmark corpus for ObsoHTML.
//
// Generates a deterministic set of HTML documents that exercise ObsoHTML’s
// CPU-bound scan paths: `locateMarkup` (a position for every finding) and
// `checkMarkup` (presence only). Most documents are free of obsolete
// markup—the common real-world case—while `legacy` is dense with obsolete
// elements and attributes to exercise hit reporting, sorting, and early exits.

import fs from 'node:fs/promises';
import path from 'node:path';

// Seeded PRNG (mulberry32) so every run generates byte-identical documents
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYLLABLES = ['ar', 'be', 'ca', 'de', 'el', 'fi', 'go', 'ha', 'in', 'jo', 'ka', 'le', 'mo', 'na', 'or', 'pe', 'qa', 'ra', 'si', 'to', 'us', 'va', 'wa', 'xa', 'ya', 'ze'];

const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

function word(rnd, min = 2, max = 9) {
  const n = min + Math.floor(rnd() * (max - min));
  let out = '';
  for (let i = 0; i < n; i++) out += pick(rnd, SYLLABLES);
  return out;
}

function sentence(rnd) {
  const n = 6 + Math.floor(rnd() * 10);
  const words = [];
  for (let i = 0; i < n; i++) words.push(word(rnd));
  return words.join(' ') + '.';
}

function paragraph(rnd) {
  const n = 3 + Math.floor(rnd() * 4);
  const sentences = [];
  for (let i = 0; i < n; i++) sentences.push(sentence(rnd));
  return `<p>${sentences.join(' ')}</p>`;
}

function prose(rnd, paragraphs) {
  const out = [];
  for (let i = 0; i < paragraphs; i++) out.push(paragraph(rnd));
  return out.join('\n');
}

const header = (rnd, title) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<!-- ${sentence(rnd)} <span>${word(rnd)}</span> -->
<style>
body { color: #333; margin: 0 auto; max-width: 40em; }
::before { content: "${word(rnd)}"; }
</style>
</head>
<body>
`;

const footer = (rnd) => `<footer>
<p>${sentence(rnd)}</p>
<script>
var tracker = "${word(rnd)}";
console.log(tracker);
</script>
</footer>
</body>
</html>
`;

// A typical small page
function smallPage() {
  const rnd = mulberry32(1);
  return header(rnd, 'Small page') + `<header>
<nav><a href="/">Home</a> <a href="#main">Main</a> <a href="/about">About</a></nav>
</header>
<main id="main">
<h1>${sentence(rnd)}</h1>
${prose(rnd, 12)}
<ul>${Array.from({ length: 8 }, () => `<li>${word(rnd)}</li>`).join('')}</ul>
</main>
` + footer(rnd);
}

// A long-form article with headings, anchors, and lists
function articlePage() {
  const rnd = mulberry32(2);
  const sections = [];
  for (let i = 0; i < 24; i++) {
    sections.push(`<section id="section-${i}">
<h2><a href="#section-${i}">${sentence(rnd)}</a></h2>
${prose(rnd, 6)}
<blockquote><p>${sentence(rnd)}</p></blockquote>
${prose(rnd, 4)}
</section>`);
  }
  return header(rnd, 'Article') + `<main>
<h1>${sentence(rnd)}</h1>
<nav>${sections.map((_, i) => `<a href="#section-${i}">${i + 1}</a>`).join(' ')}</nav>
${sections.join('\n')}
</main>
` + footer(rnd);
}

// A page dominated by dense, deeply nested markup and attributes
function markupPage() {
  const rnd = mulberry32(3);
  const parts = [header(rnd, 'Markup')];

  let nest = '';
  for (let i = 0; i < 20; i++) {
    nest += `<div class="${word(rnd, 3, 6)}" data-id="${i}" style="margin: ${i}px">`;
  }
  nest += prose(rnd, 2);
  for (let i = 0; i < 20; i++) nest += '</div>';
  parts.push(nest);

  parts.push('<table>');
  for (let r = 0; r < 50; r++) {
    parts.push('<tr>');
    for (let c = 0; c < 10; c++) {
      parts.push(`<td id="cell-${r}-${c}" class="${word(rnd, 2, 4)}" title="${word(rnd, 3, 8)}">${word(rnd, 2, 5)}</td>`);
    }
    parts.push('</tr>');
  }
  parts.push('</table>');

  const list = (depth) => {
    if (depth === 0) return '';
    let out = depth % 2 ? '<ul>' : '<ol>';
    for (let i = 0; i < 6; i++) {
      out += `<li><span data-n="${depth}-${i}">${word(rnd, 2, 6)}</span>${list(depth - 1)}</li>`;
    }
    return out + (depth % 2 ? '</ul>' : '</ol>');
  };
  parts.push(list(5));

  parts.push(`<script>
var template = "<a href=\\"#${word(rnd)}\\">${word(rnd)}</a>";
var labels = ["${word(rnd)}", "${word(rnd)}"];
</script>`);

  parts.push(prose(rnd, 15));
  parts.push(footer(rnd));
  return parts.join('\n');
}

// Every obsolete element, for the legacy page to pick from
const LEGACY_ELEMENTS = ['acronym', 'applet', 'basefont', 'bgsound', 'big', 'blink', 'center', 'command', 'content', 'dir', 'element', 'font', 'frame', 'frameset', 'image', 'isindex', 'keygen', 'listing', 'marquee', 'menuitem', 'multicol', 'nextid', 'nobr', 'noembed', 'noframes', 'param', 'plaintext', 'rb', 'rtc', 'shadow', 'spacer', 'strike', 'tt', 'xmp'];

// Every obsolete attribute, for the legacy page to sprinkle into tags
const LEGACY_ATTRIBUTES = ['align', 'background', 'bgcolor', 'border', 'frameborder', 'hspace', 'marginheight', 'marginwidth', 'noshade', 'nowrap', 'scrolling', 'valign', 'vspace'];

// A page dense with obsolete elements and attributes, exercising hit
// reporting, position mapping, and the check’s early exit
function legacyPage() {
  const rnd = mulberry32(4);
  const parts = [header(rnd, 'Legacy')];

  // Framesets, with obsolete frame attributes in every variation
  parts.push(`<frameset rows="50%,50%">
<frame src="${word(rnd)}.html" frameborder=1 marginwidth=10 scrolling=auto>
<frame src="${word(rnd)}.html" frameborder=0 marginheight=5 noresize>
<frame src="${word(rnd)}.html">
</frameset>`);

  // One block per obsolete element, wrapped in center and font
  for (const element of LEGACY_ELEMENTS) {
    parts.push(`<center>
<font color="#${Math.floor(rnd() * 0xffffff).toString(16).padStart(6, '0')}" ${pick(rnd, LEGACY_ATTRIBUTES)}="${word(rnd, 2, 5)}">
<${element} class="${word(rnd, 2, 5)}" title="${word(rnd, 3, 7)}">${sentence(rnd)}</${element}>
</font>
</center>`);
  }

  // Tables full of obsolete table and cell attributes, plus quoted values
  // and minimized attributes to exercise the tokenizer branches
  parts.push('<table border=1 bgcolor="#eeeeee" background="/tile.png">');
  for (let r = 0; r < 30; r++) {
    parts.push(`<tr align=${pick(rnd, ['left', 'right', 'center'])} valign=${pick(rnd, ['top', 'bottom'])}>
<td nowrap width="100">${word(rnd, 2, 5)}</td>
<td background="${word(rnd)}.png"><img src="${word(rnd)}.gif" alt="A graphic indicating a border between regions." align=left hspace=4 vspace=4 border=2></td>
<td><p align = "justify">${sentence(rnd)}</p></td>
</tr>`);
  }
  parts.push('</table>');

  // Inline markup with unquoted values containing apostrophes
  for (let i = 0; i < 20; i++) {
    parts.push(`<p><big>${sentence(rnd)}</big> <tt>alt=Don&apos;t</tt> <strike>${word(rnd)}</strike> <marquee bgcolor="#ff0000">${sentence(rnd)}</marquee></p>`);
  }

  // Rules and form leftovers
  parts.push(`<hr noshade size=3>
<isindex prompt="${sentence(rnd)}">
<keygen name="${word(rnd, 2, 5)}">
<applet code="${word(rnd, 2, 5)}.class" align=baseline>${sentence(rnd)}</applet>
<bgsound src="${word(rnd)}.mid" loop=2>
<dir><li>${word(rnd)}</li></dir>
<listing>${sentence(rnd)}</listing>
<plaintext>${sentence(rnd)}`);

  parts.push(prose(rnd, 8));
  parts.push(footer(rnd));
  return parts.join('\n');
}

/** @typedef {{ name: string, content: string }} CorpusFile */

/**
 * Generate the benchmark corpus. Deterministic: identical on every run.
 * @returns {CorpusFile[]}
 */
export function generate() {
  return [
    { name: 'small', content: smallPage() },
    { name: 'article', content: articlePage() },
    { name: 'markup', content: markupPage() },
    { name: 'legacy', content: legacyPage() },
  ];
}

/**
 * Generate the corpus and write it into `dir` as `<name>.html` files.
 * Existing files are rewritten, keeping the corpus in sync with the generator.
 * @param {string} dir
 * @returns {Promise<CorpusFile[]>}
 */
export async function write(dir) {
  const files = generate();
  await fs.mkdir(dir, { recursive: true });
  await Promise.all(files.map(file => fs.writeFile(path.join(dir, file.name + '.html'), file.content, 'utf8')));
  return files;
}