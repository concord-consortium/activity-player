import React, { useRef, useEffect } from "react";
import { IEmbeddablePlugin } from "../../../types";
import { initializePlugin } from "../../../lara-plugin/index";

import "./embeddable-plugin.scss";

interface IProps {
  embeddable: IEmbeddablePlugin;
}

export const EmbeddablePlugin: React.FC<IProps> = (props) => {
    const { embeddable } = props;
    const divTarget = useRef<HTMLInputElement>(null);
    useEffect(() => {
      if (divTarget.current && embeddable.plugin) {
        initializePlugin(divTarget.current, embeddable.plugin.author_data);
      }
    }, [embeddable.plugin]);
    return (
      <div className="plugin-container" ref={divTarget}/>
    );
  };
