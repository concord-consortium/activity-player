
import { Activity, Sequence } from "../types";
import sampleActivity1 from "../data/sample-activity-1.json";
import sampleActivity2 from "../data/sample-activity-2.json";
import sampleActivityCbio from "../data/sample-activity-CBIO.json";
import sampleActivityHas from "../data/sample-activity-HAS.json";
import sampleActivityHiddenContent from "../data/sample-activity-hidden-content.json";
import sampleActivityMultipleLayoutTypes from "../data/sample-activity-multiple-layout-types.json";
import sampleActivityPlugins from "../data/sample-activity-plugins.json";
import sampleActivityPluginsSinglePage from "../data/sample-activity-plugins-single-page.json";
import sampleActivityGlossaryPlugin from "../data/sample-activity-glossary-plugin.json";
import sampleActivityResponsive from "../data/sample-activity-responsive-layout.json";
import sampleActivitySinglePageLayout from "../data/sample-activity-single-page-layout.json";
import sampleActivityFullWidthOff from "../data/LARA-page-elements-full-width-off.json";
import sampleActivityFullWidthOn from "../data/LARA-page-elements-full-width-on.json";
import sampleActivityQISimple from "../data/sample-question-interactive-simple.json";
import sampleActivityQIComplex from "../data/sample-question-interactive-complex.json";
import sampleActivityLinkedInteractives from "../data/Linked-Interactives-Test_version_1.json";
import sampleActivityInteractiveSizing from "../data/sample-activity-interactive-sizing.json";

const sampleActivities: {[name: string]: Activity} = {
  "sample-activity-1": sampleActivity1 as Activity,
  "sample-activity-2": sampleActivity2 as Activity,
  "sample-activity-cbio": sampleActivityCbio as Activity,
  "sample-activity-has": sampleActivityHas as Activity,
  "sample-activity-hidden-content": sampleActivityHiddenContent as Activity,
  "sample-activity-multiple-layout-types": sampleActivityMultipleLayoutTypes as Activity,
  "sample-activity-plugins": sampleActivityPlugins as Activity,
  "sample-activity-plugins-single-page": sampleActivityPluginsSinglePage as Activity,
  "sample-activity-glossary-plugin": sampleActivityGlossaryPlugin as Activity,
  "sample-activity-responsive-layout": sampleActivityResponsive as Activity,
  "sample-activity-single-page-layout": sampleActivitySinglePageLayout as Activity,
  "LARA-page-elements-full-width-off": sampleActivityFullWidthOff as Activity,
  "LARA-page-elements-full-width-on": sampleActivityFullWidthOn as Activity,
  "sample-question-interactive-simple": sampleActivityQISimple as Activity,
  "sample-question-interactive-complex": sampleActivityQIComplex as Activity,
  "sample-activity-linked-interactives": sampleActivityLinkedInteractives as Activity,
  "sample-activity-interactive-sizing": sampleActivityInteractiveSizing as Activity
};

import sampleSequence from "../data/sample-sequence.json";
import sampleSequenceEmptyFields from "../data/sample-sequence-empty-fields.json";

const sampleSequences: {[name: string]: Sequence} = {
  "sample-sequence": sampleSequence as Sequence,
  "sample-sequence-empty-fields": sampleSequenceEmptyFields as Sequence,
};

export  { sampleActivities, sampleSequences };
