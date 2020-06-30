import React from "react";

import './primary-embeddable.scss';

interface IProps {
  embeddable: any;
}

export const PrimaryEmbeddable: React.FC<IProps> = (props) => {
  return (
    <div className="primary-embeddable" data-cy="primary-embeddable">
      <div className="aspect-ratio-box" />
    </div>
  );
};
