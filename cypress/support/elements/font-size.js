import ActivityPage from "./activity-page";

const activityPage = new ActivityPage;

class FontSize {
  verifyHeaderHintLargeFont(pageHeader, questionHeader) {
    activityPage.verifyPageContentHeader(pageHeader);
    activityPage.getPageContentHeader().should('have.css', 'font-size', "33px");
    activityPage.verifyQuestionHeader(questionHeader);
    activityPage.getQuestionHeader().should('have.css', 'font-size', "22px");
    activityPage.openHint();
    activityPage.getHintText().should('have.css', 'font-size', "19.8px");
  }
  verifyHeaderHintNormalFont(pageHeader, questionHeader) {
    activityPage.verifyPageContentHeader(pageHeader);
    activityPage.getPageContentHeader().should('have.css', 'font-size', "24px");
    activityPage.verifyQuestionHeader(questionHeader);
    activityPage.getQuestionHeader().should('have.css', 'font-size', "16px");
    activityPage.openHint();
    activityPage.getHintText().should('have.css', 'font-size', "14.4px");
  }

}
export default FontSize;
