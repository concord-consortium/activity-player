import React, { useContext, useEffect, useRef } from "react";
import { IEmbeddablePlugin } from "../../../types";
import { initializePlugin, IPartialEmbeddablePluginContext, validateEmbeddablePluginContextForPlugin
        } from "../../../utilities/plugin-utils";
import { LaraGlobalContext } from "../../lara-global-context";

import "./embeddable-plugin.scss";
import "./glossary-plugin.scss";

interface IProps {
  embeddable: IEmbeddablePlugin;
  pageNumber?: number;
  pluginsLoaded: boolean;
}

export const EmbeddablePlugin: React.FC<IProps> = (props) => {
    const { embeddable, pluginsLoaded, pageNumber } = props;
    // Checking if the embeddable is glossary because the glossary plugin has different
    // styling from other embeddables.
    const isGlossary = embeddable.plugin?.approved_script_label === "glossary";
    const divTarget = useRef<HTMLInputElement>(null);
    const LARA = useContext(LaraGlobalContext);

    useEffect(() => {
      const pluginContext: IPartialEmbeddablePluginContext = {
        LARA,
        embeddable,
        embeddableContainer: divTarget.current || undefined,
      };
      const validPluginContext = validateEmbeddablePluginContextForPlugin(pluginContext);
      if (validPluginContext && pluginsLoaded) {
        initializePlugin(validPluginContext);
      }
    }, [LARA, embeddable, pluginsLoaded]);
    return (
      <div
        className={isGlossary ? "glossary-plugin-container" : "plugin-container"}
        data-cy={"embeddable-plugin"}
        key={pageNumber ? pageNumber : embeddable.ref_id} // teacher edition does not pass in a page number
        ref={divTarget}
      />
    );
  };
