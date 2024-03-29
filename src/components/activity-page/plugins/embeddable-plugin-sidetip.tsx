import React, { useContext, useEffect, useRef }  from "react";
import { initializePlugin } from "../../../utilities/plugin-utils";
import { IEmbeddablePlugin } from "../../../types";
import { LaraGlobalContext } from "../../lara-global-context";

interface IProps {
  embeddable: IEmbeddablePlugin;
  pluginsLoaded?: boolean;
}

export const EmbeddablePluginSideTip: React.FC<IProps> = (props) => {
  const { embeddable, pluginsLoaded } = props;

  const embeddableDivTarget = useRef<HTMLInputElement>(null);

  const LARA = useContext(LaraGlobalContext);
  useEffect(() => {
    if (LARA && embeddableDivTarget.current && pluginsLoaded) {
      initializePlugin({
        LARA,
        embeddable,
        embeddableContainer: embeddableDivTarget.current
      });
    }
  }, [LARA, embeddable, pluginsLoaded]);

  return (
    <div className="embeddable-plugin-sidetip" data-cy="embeddable-plugin-sidetip"  ref={embeddableDivTarget} />
  );
};
