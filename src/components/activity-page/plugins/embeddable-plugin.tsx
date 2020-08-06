import React, { useRef, useEffect } from "react";
import { IEmbeddablePlugin } from "../../../types";
import { initializePlugin } from "../../../utilities/plugin-utils";

import "./embeddable-plugin.scss";

interface IProps {
  embeddable: IEmbeddablePlugin;
}

export const EmbeddablePlugin: React.FC<IProps> = (props) => {
    const { embeddable: { plugin } } = props;
    const divTarget = useRef<HTMLInputElement>(null);
    useEffect(() => {
      if (divTarget.current && plugin) {
        initializePlugin(divTarget.current, plugin.author_data);
      }
    }, [plugin]);
    return (
      <div className="plugin-container" ref={divTarget}/>
    );
  };
