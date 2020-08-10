import React, { useRef, useEffect } from "react";
import { IEmbeddablePlugin } from "../../../types";
import { initializePlugin } from "../../../utilities/plugin-utils";

import "./embeddable-plugin.scss";

interface IProps {
  embeddable: IEmbeddablePlugin;
}

export const EmbeddablePlugin: React.FC<IProps> = (props) => {
    const { embeddable } = props;
    const divTarget = useRef<HTMLInputElement>(null);
    useEffect(() => {
      if (divTarget.current && embeddable) {
        initializePlugin(embeddable, undefined, divTarget.current, undefined);
      }
    }, [embeddable]);
    return (
      <div className="plugin-container" ref={divTarget} data-cy="embeddable-plugin" />
    );
  };
