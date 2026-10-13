export declare const obsoleteElements: readonly string[];
export declare const obsoleteAttributes: readonly string[];

export declare function checkMarkup(html: string): {
  elements: string[];
  attributes: string[];
};

export interface Occurrence {
  name: string;
  line: number;
  col: number;
}

export declare function locateMarkup(html: string): {
  elements: Occurrence[];
  attributes: Occurrence[];
};