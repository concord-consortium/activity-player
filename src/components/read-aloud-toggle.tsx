import React from "react";
import { useReadAloud } from "./read-aloud-context";
import { Toggle } from "./toggle";

export const ReadAloudToggle = ({style}: {style?: React.CSSProperties}) => {
  const {readAloud, readAloudDisabled, setReadAloud, hideReadAloud} = useReadAloud();

  if (hideReadAloud || !setReadAloud) {
    return null;
  }

  return (
    <Toggle
      id="read_aloud_toggle"
      label="Tap text to listen"
      disabled={readAloudDisabled}
      disabledMessage="Text to speech not available on this browser."
      isChecked={readAloud}
      onChange={setReadAloud}
      style={style}
    />
  );
};
