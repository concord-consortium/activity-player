import React from "react";
import { IconProps } from "./icon-props";

// FontAwesome icon: https://www.iconfinder.com/icons/213111/f0c9_icon
// initial JSX conversion: https://react-svgr.com/playground/
export default function IconHamburger(props: IconProps) {
  return (
    <svg viewBox="0 0 1536 2048" {...props}>
      <path d="M1536 1472v128c0 17.333-6.333 32.333-19 45s-27.667 19-45 19H64c-17.333 0-32.333-6.333-45-19s-19-27.667-19-45v-128c0-17.333 6.333-32.333 19-45s27.667-19 45-19h1408c17.333 0 32.333 6.333 45 19s19 27.667 19 45zm0-512v128c0 17.333-6.333 32.333-19 45s-27.667 19-45 19H64c-17.333 0-32.333-6.333-45-19s-19-27.667-19-45V960c0-17.333 6.333-32.333 19-45s27.667-19 45-19h1408c17.333 0 32.333 6.333 45 19s19 27.667 19 45zm0-512v128c0 17.333-6.333 32.333-19 45s-27.667 19-45 19H64c-17.333 0-32.333-6.333-45-19S0 593.333 0 576V448c0-17.333 6.333-32.333 19-45s27.667-19 45-19h1408c17.333 0 32.333 6.333 45 19s19 27.667 19 45z" />
    </svg>
  );
}
