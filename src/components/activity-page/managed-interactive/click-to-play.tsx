import React, { useRef } from "react";
import { useInert } from "../../../utilities/use-inert";

import "./click-to-play.scss";

export interface IProps {
  prompt?: string | null;
  imageUrl?: string | null;
  onClick: () => void;
  disabled?: boolean;
}

export const ClickToPlay: React.FC<IProps> = ({prompt, imageUrl, onClick, disabled = false}) => {
  prompt = prompt || "Click here to start the interactive.";
  const rootRef = useRef<HTMLDivElement>(null);
  useInert(rootRef, disabled);

  const handleOnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onClick();
  };

  return (
    <div className="click-to-play" onClick={handleOnClick} data-cy="click-to-play" ref={rootRef}>
      {imageUrl && <img src={imageUrl} />}
      <div>{prompt}</div>
    </div>
  );
};
