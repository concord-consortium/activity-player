import React from "react";

import "./click-to-play.scss";

export interface IProps {
  prompt?: string | null;
  imageUrl?: string | null;
  onClick: () => void;
}

export const ClickToPlay: React.FC<IProps> = ({prompt, imageUrl, onClick}) => {
  prompt = prompt || "Click here to start the interactive.";

  const handleOnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onClick();
  };

  return (
    <div className="click-to-play" onClick={handleOnClick} data-cy="click-to-play">
      {imageUrl && <img src={imageUrl} />}
      <div>{prompt}</div>
    </div>
  );
};
