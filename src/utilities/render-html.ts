import DOMPurify from "dompurify";
import parse from "html-react-parser";

// from module htmlparser2
interface DomElement {
    attribs?: {[s: string]: string};
    children?: DomElement[];
    data?: any;
    name?: string;
    next?: DomElement;
    parent?: DomElement;
    prev?: DomElement;
    type?: string;
}
export type ParseHTMLReplacer = (domNode: DomElement) => JSX.Element | void | undefined | null | false;

export function renderHTML(html: string, replace?: ParseHTMLReplacer) {
  return parse(DOMPurify.sanitize(html || "", {ADD_ATTR: ["target"]}), { replace });
}
