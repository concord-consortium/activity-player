import DOMPurify from "dompurify";
import parse, { DOMNode } from "html-react-parser";

// from module htmlparser2
export type ParseHTMLReplacer = (domNode: DOMNode) => JSX.Element | void | undefined | null | false;

// DOMPurify.setConfig({ ADD_ATTR: ["target"] });
DOMPurify.addHook("afterSanitizeAttributes", function(node) {
  // Fix `a` elements:
  // - add `target="_blank"
  // - add `rel="noopener noreferrer"` to prevent https://www.owasp.org/index.php/Reverse_Tabnabbing
  if (node.tagName.toLowerCase() === "a") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function renderHTML(html: string, replace?: ParseHTMLReplacer) {
  return parse(DOMPurify.sanitize(html || "", {ADD_ATTR: ["target"]}), { replace });
}
