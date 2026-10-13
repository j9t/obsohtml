/**
 * TypeScript type definition tests
 *
 * This file is compiled by TypeScript during testing to verify that the
 * declaration file is valid and types are correctly exported and usable.
 *
 * This file is not executed—it only needs to type-check successfully.
 */

import { checkMarkup, locateMarkup, obsoleteElements, obsoleteAttributes } from './index.js';
import type { Occurrence } from './index.js';

// Exported arrays are readonly string arrays
const els: readonly string[] = obsoleteElements;
const attrs: readonly string[] = obsoleteAttributes;

// `checkMarkup` accepts a string and returns the correct shape
const result: { elements: string[]; attributes: string[] } = checkMarkup('<center>test</center>');

// `checkMarkup` rejects non-string input
// @ts-expect-error
checkMarkup(null);
// @ts-expect-error
checkMarkup(42);

// `locateMarkup` returns occurrences with name, line, and column
const located: { elements: Occurrence[]; attributes: Occurrence[] } = locateMarkup('<center>test</center>');
const { name, line, col }: { name: string; line: number; col: number } = located.elements[0];

// `locateMarkup` rejects non-string input
// @ts-expect-error
locateMarkup(null);

export { els, attrs, result, located, name, line, col };