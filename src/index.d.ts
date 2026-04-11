export declare const obsoleteElements: readonly string[];
export declare const obsoleteAttributes: readonly string[];

export declare function checkMarkup(html: string): {
  elements: string[];
  attributes: string[];
};
