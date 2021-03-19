import React, { useContext, useEffect, useRef }  from "react";
import { initializePlugin } from "../../../utilities/plugin-utils";
import { IEmbeddablePlugin } from "../../../types";
import { LaraGlobalContext } from "../../lara-global-context";

interface IProps {
  embeddable: IEmbeddablePlugin;
}

export const EmbeddablePluginSideTip: React.FC<IProps> = (props) => {
  const { embeddable } = props;

  const embeddableDivTarget = useRef<HTMLInputElement>(null);

  const LARA = useContext(LaraGlobalContext);
  useEffect(() => {
    if (LARA && embeddableDivTarget.current) {
      // tslint:disable-next-line:no-console
      console.info("initializePlugin called by EmbeddablePluginSideTip");
      initializePlugin({
        LARA,
        embeddable,
        embeddableContainer: embeddableDivTarget.current,
        approvedScriptLabel: "teacherEditionTips"
      });
    }
  }, [LARA, embeddable]);

  return (
    <div className="embeddable-plugin-sidetip" data-cy="embeddable-plugin-sidetip"  ref={embeddableDivTarget} />
  );
};
