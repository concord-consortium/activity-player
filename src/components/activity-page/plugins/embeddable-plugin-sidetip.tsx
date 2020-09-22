import React, { useRef, useEffect }  from "react";
import { initializePlugin } from "../../../utilities/plugin-utils";
import { IEmbeddablePlugin } from "../../../types";

interface IProps {
  embeddable: IEmbeddablePlugin;
  teacherEditionMode?: boolean;
}

export const EmbeddablePluginSideTip: React.FC<IProps> = (props) => {
  const { embeddable, teacherEditionMode } = props;

  const embeddableDivTarget = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (embeddableDivTarget.current && teacherEditionMode) {
      initializePlugin(embeddable, undefined, embeddableDivTarget.current, undefined);
    }
  }, [embeddable, teacherEditionMode]);

  return (
    <div className="embeddable-plugin-sidetip" ref={embeddableDivTarget} />
  );
};
