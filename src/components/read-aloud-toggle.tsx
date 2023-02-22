import React from "react";
import { Toggle } from "./toggle";

interface IProps {
  isChecked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export const ReadAloudToggle: React.FC<IProps> = (props) => {
  return (
    <Toggle
      id="read_aloud_toggle"
      label="Tap text to listen"
      disabled={props.disabled}
      disabledMessage="Text to speech not available on this browser."
      isChecked={props.isChecked}
      onChange={props.onChange}
    />
  );
};
