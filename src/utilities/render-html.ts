import DOMPurify from "dompurify";
import parse, { DOMNode } from "html-react-parser";

// from module htmlparser2
export type ParseHTMLReplacer = (domNode: DOMNode) => JSX.Element | void | undefined | null | false;

export function renderHTML(html: string, replace?: ParseHTMLReplacer) {
  return parse(DOMPurify.sanitize(html || "", {ADD_ATTR: ["target"]}), { replace });
}
