
import { Activity, Sequence } from "../types";
import sampleNewSectionsActivity1 from "../data/version-2/sample-new-sections-activity-1.json";
import sampleActivity1TE from "../data/sample-activity-1-te.json";
import sampleActivity1 from "../data/sample-activity-1.json";
import sampleNewSections from "../data/version-2/sample-new-sections.json";
import sampleNewSectionsHiddenContent from "../data/version-2/sample-new-sections-hidden-content.json";
import sampleNewSectionsMultipleLayoutTypes from "../data/version-2/sample-new-sections-multiple-layout-types.json";
import sampleNewSectionsSinglePageLayout from "../data/version-2/sample-new-sections-single-page-layout.json";
import sampleNewSectionsInteractiveSharing from "../data/version-2/sample-new-sections-interactive-sharing.json";
import sampleActivity2 from "../data/sample-activity-2.json";
import sampleActivityCbio from "../data/sample-activity-CBIO.json";
import sampleActivityHas from "../data/sample-activity-HAS.json";
import sampleActivityHiddenContent from "../data/sample-activity-hidden-content.json";
import sampleActivityMultipleLayoutTypes from "../data/sample-activity-multiple-layout-types.json";
import sampleActivityPlugins from "../data/sample-activity-plugins.json";
import sampleActivityPluginsSinglePage from "../data/sample-activity-plugins-single-page.json";
import sampleActivityGlossaryPlugin from "../data/sample-activity-glossary-plugin.json";
import sampleActivityGlossaryPluginExampleInteractive from "../data/sample-activity-glossary-plugin-example-interactive.json";
import sampleActivityResponsive from "../data/sample-activity-responsive-layout.json";
import sampleActivitySinglePageLayout from "../data/sample-activity-single-page-layout.json";
import sampleActivityFullWidthOff from "../data/LARA-page-elements-full-width-off.json";
import sampleActivityFullWidthOn from "../data/LARA-page-elements-full-width-on.json";
import sampleActivityQISimple from "../data/sample-activity-question-interactive-simple.json";
import sampleActivityQIComplex from "../data/sample-activity-question-interactive-complex.json";
import sampleActivityLinkedInteractives from "../data/Linked-Interactives-Test_version_1.json";
import sampleActivityInteractiveSizing from "../data/sample-activity-interactive-sizing.json";
import sampleActivityInteractiveSharing from "../data/sample-activity-interactive-sharing.json";
import sampleActivity1100px from "../data/sample-activity-1100px.json";
import sampleActivityIPadFriendly from "../data/sample-activity-ipad-friendly.json";
import sampleActivityAllQuestionInteractives from "../data/sample-activity-all-question-interactives.json";
import interactiveSizingDemoQI from "../data/Interactive-Sizing-Demo-Question-Interactives.json";
const sampleActivities: {[name: string]: Activity} = {
  "sample-new-sections-activity-1": sampleNewSectionsActivity1 as Activity,
  "sample-activity-1-te": sampleActivity1TE as Activity,
  "sample-activity-1": sampleActivity1 as unknown as Activity,
  "sample-new-sections": sampleNewSections as Activity,
  "sample-new-sections-hidden-content":sampleNewSectionsHiddenContent as Activity,
  "sample-new-sections-multiple-layout-types": sampleNewSectionsMultipleLayoutTypes as Activity,
  "sample-new-sections-single-page-layout": sampleNewSectionsSinglePageLayout as Activity,
  "sample-new-sections-interactive-sharing": sampleNewSectionsInteractiveSharing as Activity,
  "sample-activity-2": sampleActivity2 as unknown as Activity,
  "sample-activity-cbio": sampleActivityCbio as unknown as Activity,
  "sample-activity-has": sampleActivityHas as unknown as Activity,
  "sample-activity-hidden-content": sampleActivityHiddenContent as unknown as Activity,
  "sample-activity-multiple-layout-types": sampleActivityMultipleLayoutTypes as unknown as Activity,
  "sample-activity-plugins": sampleActivityPlugins as unknown as Activity,
  "sample-activity-plugins-single-page": sampleActivityPluginsSinglePage as unknown as Activity,
  "sample-activity-glossary-plugin": sampleActivityGlossaryPlugin as unknown as Activity,
  "sample-activity-glossary-plugin-example-interactive": sampleActivityGlossaryPluginExampleInteractive as unknown as Activity,
  "sample-activity-responsive-layout": sampleActivityResponsive as unknown as Activity,
  "sample-activity-single-page-layout": sampleActivitySinglePageLayout as unknown as Activity,
  "sample-activity-all-question-interactives": sampleActivityAllQuestionInteractives as unknown as Activity,
  "LARA-page-elements-full-width-off": sampleActivityFullWidthOff as unknown as Activity,
  "LARA-page-elements-full-width-on": sampleActivityFullWidthOn as unknown as Activity,
  "sample-question-interactive-simple": sampleActivityQISimple as unknown as Activity,
  "sample-question-interactive-complex": sampleActivityQIComplex as unknown as Activity,
  "sample-activity-linked-interactives": sampleActivityLinkedInteractives as unknown as Activity,
  "sample-activity-interactive-sizing": sampleActivityInteractiveSizing as unknown as Activity,
  "sample-activity-interactive-sharing": sampleActivityInteractiveSharing as unknown as Activity,
  "sample-activity-1100px": sampleActivity1100px as unknown as Activity,
  "sample-activity-ipad-friendly": sampleActivityIPadFriendly as unknown as Activity,
  "interactive-sizing-demo-question-interactive": interactiveSizingDemoQI as unknown as Activity,
};

import sampleSequence from "../data/sample-sequence.json";
import sampleNewSectionsSequence from "../data/version-2/sample-new-sections-sequence.json";
import sampleNewSectionsSequenceTE from "../data/version-2/sample-new-sections-sequence-te.json";
import sampleSequenceEmptyFields from "../data/sample-sequence-empty-fields.json";
import sampleSequenceWithQuestions from "../data/sample-sequence-with-questions.json";
import sampleSequenceTE from "../data/sample-sequence-te.json";
import sampleSequenceDefunct from "../data/sample-sequence-defunct.json";

const sampleSequences: {[name: string]: Sequence} = {
  "sample-sequence": sampleSequence as unknown as Sequence,
  "sample-new-sections-sequence": sampleNewSectionsSequence as Sequence,
  "sample-new-sections-sequence-te": sampleNewSectionsSequenceTE as Sequence,
  "sample-sequence-empty-fields": sampleSequenceEmptyFields as unknown as Sequence,
  "sample-sequence-with-questions": sampleSequenceWithQuestions as unknown as Sequence,
  "sample-sequence-te": sampleSequenceTE as unknown as Sequence,
  "sample-sequence-defunct": sampleSequenceDefunct as unknown as Sequence,
};

export  { sampleActivities, sampleSequences };
