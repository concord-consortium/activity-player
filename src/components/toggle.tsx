import classNames from "classnames";
import React from "react";

import "./toggle.scss";

interface IProps {
  id: string;
  label: string;
  isChecked: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  onChange: (checked: boolean) => void;
}

export const Toggle: React.FC<IProps> = (props) => {

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (props.disabled) {
      event.preventDefault();
      event.stopPropagation();
      if (props.disabledMessage?.length || 0 > 0) {
        alert(props.disabledMessage);
      }
    } else {
      props.onChange?.(event.target.checked);
    }
  };

  const labelId = `label-${props.id}`;
  const className = classNames("toggle", {disabled: props.disabled});

  return (
    <label htmlFor={props.id} className={className}>
      <div className="label" id={labelId}>
        {props.label}
      </div>
      <input
        id={props.id}
        type="checkbox"
        role="switch"
        checked={props.isChecked}
        onChange={onChange}
        aria-checked={props.isChecked}
        aria-labelledby={labelId}
      />
    </label>
  );
};
