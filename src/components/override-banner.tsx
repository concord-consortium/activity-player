import React from "react";
import { OverrideInfo } from "../utilities/url-overrides/types";

import "./override-banner.scss";

interface IProps {
  info: OverrideInfo;
}

const formatRule = (rule: OverrideInfo["active"][number]): string => {
  const lhs = rule.param !== undefined
    ? `override.${rule.key}.${rule.param}`
    : `override.${rule.key}`;
  return `${lhs} = ${rule.value}`;
};

const formatError = (error: OverrideInfo["errors"][number]): string => {
  const lhs = error.param !== undefined
    ? `override.${error.key}.${error.param}`
    : `override.${error.key}`;
  return `${lhs}: ${error.reason}`;
};

export const OverrideBanner: React.FC<IProps> = ({ info }) => {
  const hasContent = info.active.length > 0 || info.errors.length > 0 || info.registryFetchFailed;
  if (!hasContent) return null;
  return (
    <div className="override-banner">
      {info.registryFetchFailed && (
        <div className="override-banner-row override-banner-error">
          Override registry could not be loaded.
        </div>
      )}
      {info.active.map(rule => (
        <div className="override-banner-row" key={`active-${rule.key}-${rule.param ?? ""}`}>
          Active override: {formatRule(rule)}
        </div>
      ))}
      {info.errors.map((error, i) => (
        <div className="override-banner-row override-banner-error" key={`error-${i}`}>
          {formatError(error)}
        </div>
      ))}
    </div>
  );
};
