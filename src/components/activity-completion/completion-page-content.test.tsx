// import React from "react";
// import { CompletionPageContent } from "./completion-page-content";
// import { shallow } from "enzyme";
// import { Activity } from "../../types";
// import _activityPlugins from "../../data/sample-activity-multiple-layout-types.json";

// const activityPlugins = _activityPlugins as Activity;

// describe("Completion Page Content component", () => {
//   it("renders component", () => {
//     const stubFunction = () => {
//       // do nothing.
//     };
//     const wrapperComplete = shallow(
//                               <CompletionPageContent activity={activityPlugins}
//                                                      activityName={"test"}
//                                                      onPageChange={stubFunction}
//                                                      showStudentReport={true}/>
//                             );
//     expect(wrapperComplete.find('[data-cy="completion-page-content"]').length).toBe(1);
//     expect(wrapperComplete.find('[data-cy="progress-container"]').length).toBe(1);
//     expect(wrapperComplete.find('[data-cy="completion-page-content"]').text()).toContain("Fetching your data");
//   });
// });
