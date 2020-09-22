import React, { useRef, useEffect }  from "react";
import { initializePlugin } from "../../../utilities/plugin-utils";
import { IEmbeddablePlugin } from "../../../types";

interface IProps {
  embeddable: IEmbeddablePlugin;
}

export const EmbeddablePluginSideTip: React.FC<IProps> = (props) => {
  const { embeddable } = props;

  const embeddableDivTarget = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (embeddableDivTarget.current) {
      initializePlugin(embeddable, undefined, embeddableDivTarget.current, undefined);
    }
  }, [embeddable]);

  return (
    <div className="embeddable-plugin-sidetip" ref={embeddableDivTarget} />
  );
};
