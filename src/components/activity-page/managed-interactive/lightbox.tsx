import React, { useRef, useState } from "react";
import { IShowLightbox } from "@concord-consortium/lara-interactive-api";
import ReactModal from "react-modal";
import "./lightbox.scss";

export interface IProps extends IShowLightbox {
  onClose: () => void;
}

const getModalContainer = (): HTMLElement => {
  return document.getElementById("app") || document.body;
};

// Center lightbox vertically and horizontally.
const customStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)"
  }
};

// Partially based on:
// https://github.com/concord-consortium/lara/blob/9e323e7c81c11e1c8940143e2ab80bd5570ce373/lara-typescript/src/interactive-api-parent/modal-api-plugin.ts#L54-L92
const getSizeOptions = ({ size, allowUpscale }: { size?: { width: number, height: number }, allowUpscale?: boolean }) => {
  const kMargin = 100;
  const availableWidth = window.innerWidth - kMargin;
  const availableHeight = window.innerHeight - kMargin;
  const sizeOpts: { width: number, height: number } = { width: 0, height: 0 };
  if (size) {
    const aspectRatio = size.width / size.height;
    const availableAspectRatio = availableWidth / availableHeight;

    if (allowUpscale) {
      // If upscaling is enabled, simply try to use all available width first. It's either fine or height is too big.
      // The second case will be handled by the code below.
      size.width = availableWidth;
      size.height = availableWidth / aspectRatio;
    }

    if (aspectRatio >= availableAspectRatio && size.width > availableWidth) {
      // width is constraining dimension
      sizeOpts.width = availableWidth;
      sizeOpts.height = availableWidth / aspectRatio;
    } else if (aspectRatio < availableAspectRatio && size.height > availableHeight) {
      // height is constraining dimension
      sizeOpts.width = availableHeight * aspectRatio;
      sizeOpts.height = availableHeight;
    } else {
      // image fits in the available space, no adjustments necessary
      sizeOpts.width = size.width;
      sizeOpts.height = size.height;
    }
    return sizeOpts;
  }
  // otherwise use available space
  sizeOpts.width = availableWidth;
  sizeOpts.height = availableHeight;
  return sizeOpts;
};

export const Lightbox: React.FC<IProps> = (props) => {
  const { isImage, url, onClose, allowUpscale } = props;
  // Image size can be calculated after the image is actually loaded.
  const [ imgWidth, setImgWidth ] = useState<number | undefined>();
  const [ imgHeight, setImgHeight ] = useState<number | undefined>();
  const imgRef = useRef<HTMLImageElement>(null);

  const imgLoaded = () => {
    if (imgRef.current) {
      const width = imgRef.current.width;
      const height = imgRef.current.height;
      const finalSize = getSizeOptions({ size: {width, height}, allowUpscale });
      setImgWidth(finalSize.width);
      setImgHeight(finalSize.height);
    }
  };

  const iframeSizeOpts = getSizeOptions(props);
  return (
    <ReactModal isOpen={true} appElement={getModalContainer()} onRequestClose={onClose} style={customStyles} >
      <div className="lightbox-content">
      <div className="lightbox-close-icon" onClick={onClose} data-testid="lightbox-close">✖</div>
      {
        isImage ?
        <img ref={imgRef} src={url} onLoad={imgLoaded} style={{ width: imgWidth, height: imgHeight, visibility: imgWidth === undefined ? "hidden" : "visible" }} data-testid="lightbox-image" /> :
        <iframe src={url} width={iframeSizeOpts.width} height={iframeSizeOpts.height} title="Image lightbox" data-testid="lightbox-iframe" />
      }
      </div>
    </ReactModal>
  );
};
