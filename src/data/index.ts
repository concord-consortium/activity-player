
import { ActivityDefinition } from "../api";
import sampleActivity1 from "../data/sample-activity-1.json";
import sampleActivity2 from "../data/sample-activity-2.json";
import sampleActivityCbio from "../data/sample-activity-CBIO.json";
import sampleActivityHas from "../data/sample-activity-HAS.json";
import sampleActivityMultipleLayoutTypes from "../data/sample-activity-multiple-layout-types.json";
import sampleActivityResponsive from "../data/sample-activity-responsive-layout.json";

const sampleActivities: {[name: string]: ActivityDefinition} = {
  "sample-activity-1": sampleActivity1,
  "sample-activity-2": sampleActivity2,
  "sample-activity-cbio": sampleActivityCbio,
  "sample-activity-has": sampleActivityHas,
  "sample-activity-multiple-layout-types": sampleActivityMultipleLayoutTypes,
  "sample-activity-responsive-layout": sampleActivityResponsive,
};

export default sampleActivities;
