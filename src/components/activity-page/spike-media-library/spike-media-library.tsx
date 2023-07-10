import React from "react";
import { IMediaLibraryItem } from "@concord-consortium/lara-interactive-api";
import { IEmbeddableSpikeMediaLibrary } from "../../../types";
import { useMediaLibrary } from "../../media-library-context";

import "./spike-media-library.scss";

export const SpikeMediaLibraryImageItem: React.FC<{item: IMediaLibraryItem}> = ({item}) => {
  return (
    <div>
      <a href={item.url} target="_blank" rel="noreferrer" title={item.caption}><img src={item.url} /></a>
    </div>
  );
};

interface IProps {
  embeddable: IEmbeddableSpikeMediaLibrary;
}

export const SpikeMediaLibrary: React.FC<IProps> = (props) => {
  const mediaLibrary = useMediaLibrary();

  const images = mediaLibrary.items.filter(i => i.type === "image");

  return(
    <div className="spike-media-library">
      <div className="title">Media Library Demo</div>
      <div className="content">
        <p>
          The media library is <strong>{mediaLibrary.enabled ? "enabled" : "disabled"}</strong> for this activity.
        </p>
        <p>
          There are {mediaLibrary.items.length} unique media library items exported in this activity.  Of these {images.length} are images.
        </p>
        <div className="images">
          {images.map((item, index) => <SpikeMediaLibraryImageItem key={index} item={item} />)}
        </div>
      </div>
    </div>
  );
};
