import { useState, useEffect } from "react";

interface ISize {
  embeddable: any;
  ARFromSupportedFeatures: number;
  heightFromInteractive: number;
  screenHeight: any;
  divSize: any;
  headerSize: any;
  showDeleteDataButton: boolean;
}

const kDefaultAspectRatio = 4 / 3;
const kBottomMargin = 15;

export const useSizeAndAspectRatio = ({embeddable, ARFromSupportedFeatures, heightFromInteractive, screenHeight, divSize,
  headerSize, showDeleteDataButton}: ISize) => {
  const [containerWidth, setContainerWidth] = useState<string | number>("100%");
  const [proposedHeight, setProposedHeight] = useState<number>(0);

  useEffect(() => {
    const { type, library_interactive, inherit_aspect_ratio_method, custom_aspect_ratio_method,
      inherit_native_height, inherit_native_width, custom_native_height, custom_native_width } = embeddable;
    const isManagedInteractive = type === "ManagedInteractive";
    const embeddableData = isManagedInteractive ? library_interactive?.data : embeddable;

    let aspectRatioMethod = "DEFAULT";
    let aspectRatio = kDefaultAspectRatio;
    let nativeHeight = embeddableData?.native_height || 0;
    let nativeWidth = embeddableData?.native_width || 0;
    let _proposedHeight = 0;
    let _containerWidth: string|number = "100%";

    if (isManagedInteractive && !inherit_aspect_ratio_method) {
      aspectRatioMethod = custom_aspect_ratio_method || "DEFAULT";
    } else {
      aspectRatioMethod = embeddableData?.aspect_ratio_method || "DEFAULT";
    }

    if (isManagedInteractive) {
      nativeHeight = (inherit_native_height ? embeddableData?.native_height : custom_native_height) || 0;
      nativeWidth = (inherit_native_width ? embeddableData?.native_width : custom_native_width) || 0;
    }

    if (aspectRatioMethod === "DEFAULT" && ARFromSupportedFeatures) {
      aspectRatio = ARFromSupportedFeatures;
    } else if (aspectRatioMethod === "MANUAL") {
      aspectRatio = nativeWidth / nativeHeight;
    }

    const headerHeight = headerSize?.height || 0;
    const deleteDataButtonHeight = showDeleteDataButton ? 44 : 0;
    const unusableHeight = kBottomMargin + headerHeight + deleteDataButtonHeight;
    const maxHeight = screenHeight.dynamicHeight * .98;

    switch (aspectRatioMethod) {
      case "MAX":
        // if set to max, we set interactive height via CSS
        _proposedHeight = 0;
        break;
      case "MANUAL":
        _proposedHeight = divSize?.width / aspectRatio;
        break;
      case "DEFAULT":
      default:
        if (heightFromInteractive) {
          _proposedHeight = heightFromInteractive;
          _containerWidth = "100%";
        }
        else if ((divSize?.width / aspectRatio) > (maxHeight - unusableHeight)) {
          _proposedHeight = maxHeight - unusableHeight;
          _containerWidth = (maxHeight * aspectRatio) > divSize?.width ? "100%" : (maxHeight * aspectRatio);
        } else {
          _proposedHeight = (divSize?.width / aspectRatio) || 0;
        }
    }

    setProposedHeight(_proposedHeight);
    setContainerWidth(_containerWidth);

  }, [embeddable, divSize, ARFromSupportedFeatures, screenHeight, headerSize, showDeleteDataButton, heightFromInteractive]);

  return { containerWidth, proposedHeight };
};
