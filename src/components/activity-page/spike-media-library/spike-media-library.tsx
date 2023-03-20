import React from "react";
import { IEmbeddableSpikeMediaLibrary, ISpikeMediaLibraryItem } from "../../../types";

import "./spike-media-library.scss";

interface IProps {
  embeddable: IEmbeddableSpikeMediaLibrary;
  spikeMediaLibrary?: ISpikeMediaLibraryItem[]
}

export const SpikeMediaLibrary: React.FC<IProps> = (props) => {
  const spikeMediaLibrary = props.spikeMediaLibrary || [];

  return(
    <div className="spike-media-library">
      <div className="title">Media Library Demo</div>
      <div className="content">
        <p>
          This is a demo to show how the Activity Player can read media library items optionally pre-defined in the activity authoring (this authoring work has yet to be done).
        </p>
        <p>
          This functionality would be used by the existing labbook interactive or other interactives to allow students to select images, videos and sounds
          defined in this activity without having to copy and upload them themselves.
        </p>
        <p>
          There are {spikeMediaLibrary.length} media library items defined in this activity.  Each item has a title, url and media type (mime type):
        </p>
        <ul>
          {spikeMediaLibrary.map((item, index) => <li key={index}><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> ({item.mimeType})</li>)}
        </ul>
      </div>
    </div>
  );
};
