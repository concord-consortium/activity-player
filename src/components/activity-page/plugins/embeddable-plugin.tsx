import React, { useContext, useEffect, useRef } from "react";
import { IEmbeddablePlugin } from "../../../types";
import { initializePlugin, IPartialEmbeddablePluginContext, validateEmbeddablePluginContextForPlugin
        } from "../../../utilities/plugin-utils";
import { LaraGlobalContext } from "../../lara-global-context";

import "./embeddable-plugin.scss";

interface IProps {
  embeddable: IEmbeddablePlugin;
  pluginsLoaded: boolean;
  offlineMode: boolean;
}

export const EmbeddablePlugin: React.FC<IProps> = (props) => {
    const { embeddable, pluginsLoaded, offlineMode } = props;
    const divTarget = useRef<HTMLInputElement>(null);
    const LARA = useContext(LaraGlobalContext);
    useEffect(() => {
      const pluginContext: IPartialEmbeddablePluginContext = {
        LARA,
        embeddable,
        embeddableContainer: divTarget.current || undefined,
        approvedScriptLabel: "teacherEditionTips"
      };
      const validPluginContext = validateEmbeddablePluginContextForPlugin(pluginContext);
      if (validPluginContext && pluginsLoaded) {
        initializePlugin(validPluginContext, offlineMode);
      }
    }, [LARA, embeddable, pluginsLoaded]);
    return (
      <div className="plugin-container" ref={divTarget} data-cy="embeddable-plugin" key={embeddable.ref_id} />
    );
  };
