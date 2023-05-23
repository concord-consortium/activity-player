import ActivityPage from "./activity-page";

const activityPage = new ActivityPage;

class ReadAloud {
  verifyHeaderHintReadAloud() {
    activityPage.getPageContentHeader().click().should('have.css', 'background-color', "rgb(248, 255, 0)");
    activityPage.getQuestionHeader().click().should('have.css', 'background-color', "rgb(248, 255, 0)");
    activityPage.openHint();
    activityPage.getHintText().parent().click().should('have.css', 'background-color', "rgb(248, 255, 0)");
  }

}
export default ReadAloud;
