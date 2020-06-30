import React from "react";

import './bottom-buttons.scss';

interface BottomButtonProps {
  onBack?: () => void;
  onNext?: () => void;
}

export const BottomButtons: React.FC<BottomButtonProps> = (props) => {
  return (
    <div className="bottom-buttons">
      <div>
        { props.onBack && <button className="button" onClick={props.onBack}>{`< Back`}</button> }
      </div>
      <div>
        { props.onNext && <button className="button" onClick={props.onNext}>{`Next >`}</button> }
      </div>
    </div>
  );
};
