
import { ActivityDefinition } from "../lara-api";
import sampleActivity1 from "../data/sample-activity-1.json";
import sampleActivity2 from "../data/sample-activity-2.json";
import sampleActivityCbio from "../data/sample-activity-CBIO.json";
import sampleActivityHas from "../data/sample-activity-HAS.json";
import sampleActivityHiddenContent from "../data/sample-activity-hidden-content.json";
import sampleActivityMultipleLayoutTypes from "../data/sample-activity-multiple-layout-types.json";
import sampleActivityResponsive from "../data/sample-activity-responsive-layout.json";
import sampleActivitySinglePageLayout from "../data/sample-activity-single-page-layout.json";
import sampleActivityFullWidthOff from "../data/LARA-page-elements-full-width-off.json";
import sampleActivityFullWidthOn from "../data/LARA-page-elements-full-width-on.json";

const sampleActivities: {[name: string]: ActivityDefinition} = {
  "sample-activity-1": sampleActivity1,
  "sample-activity-2": sampleActivity2,
  "sample-activity-cbio": sampleActivityCbio,
  "sample-activity-has": sampleActivityHas,
  "sample-activity-hidden-content": sampleActivityHiddenContent,
  "sample-activity-multiple-layout-types": sampleActivityMultipleLayoutTypes,
  "sample-activity-responsive-layout": sampleActivityResponsive,
  "sample-activity-single-page-layout": sampleActivitySinglePageLayout,
  "LARA-page-elements-full-width-off": sampleActivityFullWidthOff,
  "LARA-page-elements-full-width-on": sampleActivityFullWidthOn,
};

export default sampleActivities;
