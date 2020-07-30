
import { Activity } from "../types";
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

const sampleActivities: {[name: string]: Activity} = {
  "sample-activity-1": sampleActivity1 as Activity,
  "sample-activity-2": sampleActivity2 as Activity,
  "sample-activity-cbio": sampleActivityCbio as Activity,
  "sample-activity-has": sampleActivityHas as Activity,
  "sample-activity-hidden-content": sampleActivityHiddenContent as Activity,
  "sample-activity-multiple-layout-types": sampleActivityMultipleLayoutTypes as Activity,
  "sample-activity-responsive-layout": sampleActivityResponsive as Activity,
  "sample-activity-single-page-layout": sampleActivitySinglePageLayout as Activity,
  "LARA-page-elements-full-width-off": sampleActivityFullWidthOff as Activity,
  "LARA-page-elements-full-width-on": sampleActivityFullWidthOn as Activity,
};

export default sampleActivities;
