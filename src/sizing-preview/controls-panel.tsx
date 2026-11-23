import React from "react";
import { DraftInput } from "./draft-input";
import {
  AspectRatioMethod, Column, FixedWidthLayout, InteractiveKind, ISizingSettings, isResponsiveLayout,
  isTwoColumnLayout, OtherText, SectionLayout
} from "./settings";
import { isHttpUrl } from "../utilities/url-utils";

const kFixedWidthLabels: Record<FixedWidthLayout, string> = {
  "1100px": "Standard (1100px)",
  "ipad_friendly": "iPad Friendly (960px)"
};

const kLayoutLabels: Record<SectionLayout, string> = {
  "full-width": "full-width (single column)",
  "60-40": "60-40 (primary on left)",
  "40-60": "40-60 (primary on right)",
  "70-30": "70-30 (primary on left)",
  "30-70": "30-70 (primary on right)",
  "responsive-30-70": "responsive-30-70 (primary on right)",
  "responsive-50-50": "responsive-50-50 (primary on right)",
  "responsive-full-width": "responsive-full-width (single column)"
};

const kColumnLabels: Record<Column, string> = {
  primary: "Primary",
  secondary: "Secondary"
};

const kKindLabels: Record<InteractiveKind, string> = {
  "mw": "Basic iframe interactive",
  "library": "Library interactive",
  "library-custom": "Library interactive, customized"
};

const kAspectRatioLabels: Record<AspectRatioMethod, string> = {
  DEFAULT: "Default aspect ratio, or set by interactive",
  MANUAL: "Manually set the native width & height",
  MAX: "Use all available space for the interactive"
};

const kOtherTextLabels: Record<OtherText, string> = {
  tall: "Taller than the window",
  short: "A short paragraph"
};

const isPositiveWholeNumber = (draft: string) => /^\d+$/.test(draft.trim()) && Number(draft) > 0;

interface ISelectProps<T extends string> {
  label: string;
  value: T;
  labels: Record<T, string>;
  disabled?: boolean;
  note?: string;
  onChange: (value: T) => void;
}

function SelectControl<T extends string>({ label, value, labels, disabled, note, onChange }: ISelectProps<T>) {
  return (
    <div className="control">
      <label>
        <span className="control-label">{label}</span>
        <select value={value} disabled={disabled} onChange={e => onChange(e.target.value as T)}>
          {(Object.keys(labels) as T[]).map(key => <option key={key} value={key}>{labels[key]}</option>)}
        </select>
      </label>
      {note && <div className="control-note">{note}</div>}
    </div>
  );
}

interface IProps {
  settings: ISizingSettings;
  onChange: (next: ISizingSettings) => void;
}

export const ControlsPanel: React.FC<IProps> = ({ settings, onChange }) => {
  const update = (changes: Partial<ISizingSettings>) => onChange({ ...settings, ...changes });
  const twoColumn = isTwoColumnLayout(settings.layout);
  const responsive = isResponsiveLayout(settings.layout);

  return (
    <div className="controls-panel">
      <DraftInput
        label="Interactive URL"
        value={settings.interactive}
        isValid={isHttpUrl}
        invalidMessage="Enter an absolute http(s) URL, for example https://example.com/interactive.html"
        onCommit={interactive => update({ interactive })}
      />
      <SelectControl
        label="Activity Page Fixed Width"
        value={settings.fixedWidthLayout}
        labels={kFixedWidthLabels}
        disabled={responsive}
        note={responsive ? "Not used: a responsive section makes the page full width" : undefined}
        onChange={fixedWidthLayout => update({ fixedWidthLayout })}
      />
      <SelectControl
        label="Layout"
        value={settings.layout}
        labels={kLayoutLabels}
        onChange={layout => update({ layout })}
      />
      {twoColumn &&
        <SelectControl
          label="Interactive's column"
          value={settings.column}
          labels={kColumnLabels}
          onChange={column => update({ column })}
        />}
      <SelectControl
        label="Interactive type"
        value={settings.kind}
        labels={kKindLabels}
        onChange={kind => update({ kind })}
      />
      <SelectControl
        label="Aspect Ratio"
        value={settings.aspectRatioMethod}
        labels={kAspectRatioLabels}
        onChange={aspectRatioMethod => update({ aspectRatioMethod })}
      />
      {settings.aspectRatioMethod === "MANUAL" &&
        <>
          <DraftInput
            label="Width"
            value={String(settings.nativeWidth)}
            isValid={isPositiveWholeNumber}
            invalidMessage="Enter a whole number greater than 0"
            onCommit={draft => update({ nativeWidth: Number(draft) })}
          />
          <DraftInput
            label="Height"
            value={String(settings.nativeHeight)}
            isValid={isPositiveWholeNumber}
            invalidMessage="Enter a whole number greater than 0"
            onCommit={draft => update({ nativeHeight: Number(draft) })}
          />
        </>}
      <div className="control control-checkbox">
        <label>
          <input
            type="checkbox"
            checked={settings.named}
            onChange={e => update({ named: e.target.checked })}
          />
          <span className="control-label">Has a name</span>
        </label>
      </div>
      <div className="control control-checkbox">
        <label>
          <input
            type="checkbox"
            checked={settings.clearButton}
            onChange={e => update({ clearButton: e.target.checked })}
          />
          <span className="control-label">{'Show "Clear & start over" button'}</span>
        </label>
      </div>
      {twoColumn &&
        <SelectControl
          label="Other column's text"
          value={settings.otherText}
          labels={kOtherTextLabels}
          onChange={otherText => update({ otherText })}
        />}
    </div>
  );
};
