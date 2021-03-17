import React, { useContext, useEffect, useRef } from "react";
import { IEmbeddablePlugin } from "../../../types";
import { initializePlugin, IPartialEmbeddablePluginContext, validateEmbeddablePluginContextForPlugin
        } from "../../../utilities/plugin-utils";
import { LaraGlobalContext } from "../../lara-global-context";

import "./glossary-plugin.scss";

interface IProps {
  embeddable: IEmbeddablePlugin;
  pageNumber: number;
  offlineMode: boolean;
}

export const GlossaryPlugin: React.FC<IProps> = (props) => {
  const { embeddable, pageNumber, offlineMode } = props;
  const divTarget = useRef<HTMLInputElement>(null);
  const LARA = useContext(LaraGlobalContext);
  useEffect(() => {
    const pluginContext: IPartialEmbeddablePluginContext = {
      LARA,
      embeddable,
      embeddableContainer: divTarget.current || undefined,
      approvedScriptLabel: "glossary"
    };
    const validPluginContext = validateEmbeddablePluginContextForPlugin(pluginContext);
    if (validPluginContext) {
      initializePlugin(validPluginContext, offlineMode);
    }
  }, [LARA, embeddable]);
  return (
    <div className="glossary-plugin-container" ref={divTarget} data-cy="glossary-embeddable-plugin" key={pageNumber} />
  );
};
