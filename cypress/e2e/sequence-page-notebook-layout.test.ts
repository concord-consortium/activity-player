import ActivityPage from "../support/elements/activity-page";
import { getInIframe, getInIframeWithIndex } from "../support/elements/iframe";
import ReadAloud from "../support/elements/read-aloud";
import Notebook from "../support/elements/notebook";

const activityPage = new ActivityPage;
const readAloud = new ReadAloud;
const fontFamily = "Andika";
const noteBook = new Notebook;

context("Test activity layout override set to Notebook", () => {
  before(() => {
    cy.visit("?preview&sequence=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Fsequences%2F31.json&sequenceActivity=0");
    activityPage.getSequenceTitle().should("contain", "Automation Sequence For Notebook Layout");
  });
  describe("Sequence Home Page",() => {
    it("verify sequence home page in notebook layout",()=>{
      noteBook.getNotebookHeader().should("exist");
      activityPage.getSequenceActivityTitle().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getAccountOwnerName().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getSequenceTitle().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getSequenceDescription().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getSequenceEstimate().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getSequenceThumb().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getFooterText().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getVersionInfo().invoke("css", "font-family").should("contain", fontFamily);
    });
  });
  describe("Activity Home Page",() => {
    it("verify home page in notebook layout activity",()=>{
      activityPage.getSequenceThumb().click();
      activityPage.getActivityTitle().should("contain", "Automation Activity For Notebook Layout");
      activityPage.getPreviousPageButton().should("not.exist");
      activityPage.getNextPageButton().should("not.exist");
      activityPage.getActivityNavHeader().eq(0).should("exist");
      activityPage.getActivityNavHeader().eq(1).should("not.exist");
      activityPage.getHomeButton().should("contain", "Home");
      activityPage.getNavPageButton(0).should("contain", "Page 1");
      activityPage.getNavPageButton(1).should("contain", "Page 2");
      noteBook.verifyNotebookHeaderNotDisplayed();
      activityPage.getHeaderActivityTitle().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getActivityTitle().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getReadAloudToggle().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getIntroText().invoke("css", "font-family").should("contain", fontFamily);
    });
  it("verify home page in multipage layout activity",()=>{
      activityPage.getSequenceActivityTitle().click();
      activityPage.clickSequenceThumb(3);
      activityPage.getActivityTitle().should("contain", "Automation Activity For Multipage Layout");
      activityPage.getPreviousPageButton().should("not.exist");
      activityPage.getNextPageButton().should("not.exist");
      activityPage.getActivityNavHeader().eq(0).should("exist");
      activityPage.getActivityNavHeader().eq(1).should("not.exist");
      activityPage.getHomeButton().should("contain", "Home");
      activityPage.getNavPageButton(0).should("contain", "Page 1");
      activityPage.getNavPageButton(1).should("contain", "Page 2");
      noteBook.verifyNotebookHeaderNotDisplayed();
    });
    it("verify home page in singlepage layout activity",()=>{
      activityPage.getSequenceActivityTitle().click();
      activityPage.clickSequenceThumb(5);
      activityPage.getActivityTitle().should("contain", "Automation Activity For SinglePage Layout");
      activityPage.getPreviousPageButton().should("not.exist");
      activityPage.getNextPageButton().should("not.exist");
      activityPage.getActivityNavHeader().eq(0).should("exist");
      activityPage.getActivityNavHeader().eq(1).should("not.exist");
      activityPage.getHomeButton().should("contain", "Home");
      activityPage.getNavPageButton(0).should("contain", "Page 1");
      activityPage.getNavPageButton(1).should("contain", "Page 2");
      noteBook.verifyNotebookHeaderNotDisplayed();
      });
  });
});
context("Test activity layout override set to None", () => {
  before(() => {
    cy.visit("?preview&sequence=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Fsequences%2F32.json&sequenceActivity=0");
    activityPage.getSequenceTitle().should("contain", "Automation Sequence For Notebook Layout Override To None");
  });
  describe("Sequence Home Page",() => {
    it("verify sequence home page in normal layout",()=>{
      noteBook.verifyNotebookHeaderNotDisplayed();
      activityPage.getSequenceActivityTitle().invoke("css", "font-family").should("contain", "Lato");
    });
  });
  describe("Activity Home Page",() => {
    it("verify home page in notebook layout activity",()=>{
      activityPage.getSequenceThumb().click();
      activityPage.getPreviousPageButton().should("not.exist");
      activityPage.getNextPageButton().should("not.exist");
      activityPage.getActivityNavHeader().eq(0).should("exist");
      activityPage.getActivityNavHeader().eq(1).should("not.exist");
      activityPage.getHomeButton().should("contain", "Home");
      activityPage.getNavPageButton(0).should("contain", "Page 1");
      activityPage.getNavPageButton(1).should("contain", "Page 2");
      noteBook.verifyNotebookHeaderNotDisplayed();
      activityPage.getHeaderActivityTitle().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getActivityTitle().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getReadAloudToggle().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getIntroText().invoke("css", "font-family").should("contain", fontFamily);
    });
    it("verify home page in multipage layout activity",()=>{
      activityPage.getSequenceActivityTitle().click();
      activityPage.clickSequenceThumb(3);
      activityPage.getActivityTitle().should("contain", "Automation Activity For Multipage Layout");
      activityPage.getPreviousPageButton().should("exist");
      activityPage.getNextPageButton().should("exist");
      activityPage.getActivityNavHeader().eq(0).should("exist");
      activityPage.getActivityNavHeader().eq(1).should("exist");
      activityPage.getHomeButton().should("not.contain", "Home");
      activityPage.getNavPageButton(0).should("not.contain", "Page 1");
      activityPage.getNavPageButton(1).should("not.contain", "Page 2");
      activityPage.getHeaderActivityTitle().invoke("css", "font-family").should("contain", "Lato");
    });
    it("verify home page in singlepage layout activity",()=>{
      activityPage.getSequenceActivityTitle().click();
      activityPage.clickSequenceThumb(5);
      activityPage.getPreviousPageButton().should("not.exist");
      activityPage.getNextPageButton().should("not.exist");
      activityPage.getHomeButton().should("not.exist");
    });
  });
});
context("Test activity layout override set to Multipage", () => {
  before(() => {
    cy.visit("?preview&sequence=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Fsequences%2F33.json&sequenceActivity=0");
    activityPage.getSequenceTitle().should("contain", "Automation Sequence For Notebook Layout Override To Multipage");
  });
  describe("Sequence Home Page",() => {
    it("verify sequence home page in normal layout",()=>{
      noteBook.verifyNotebookHeaderNotDisplayed();
      activityPage.getSequenceActivityTitle().invoke("css", "font-family").should("contain", "Lato");
    });
  });
  describe("Activity Home Page",() => {
    it("verify home page in notebook layout activity",()=>{
      activityPage.getSequenceThumb().click();
      activityPage.getActivityTitle().should("contain", "Automation Activity For Notebook Layout");
      activityPage.getPreviousPageButton().should("exist");
      activityPage.getNextPageButton().should("exist");
      activityPage.getActivityNavHeader().eq(0).should("exist");
      activityPage.getActivityNavHeader().eq(1).should("exist");
      activityPage.getHomeButton().should("not.contain", "Home");
      activityPage.getNavPageButton(0).should("not.contain", "Page 1");
      activityPage.getNavPageButton(1).should("not.contain", "Page 2");
      activityPage.getHeaderActivityTitle().invoke("css", "font-family").should("contain", "Lato");
    });
    it("verify home page in multipage layout activity",()=>{
      activityPage.getSequenceActivityTitle().click();
      activityPage.clickSequenceThumb(3);
      activityPage.getActivityTitle().should("contain", "Automation Activity For Multipage Layout");
      activityPage.getPreviousPageButton().should("exist");
      activityPage.getNextPageButton().should("exist");
      activityPage.getActivityNavHeader().eq(0).should("exist");
      activityPage.getActivityNavHeader().eq(1).should("exist");
      activityPage.getHomeButton().should("not.contain", "Home");
      activityPage.getNavPageButton(0).should("not.contain", "Page 1");
      activityPage.getNavPageButton(1).should("not.contain", "Page 2");
      activityPage.getHeaderActivityTitle().invoke("css", "font-family").should("contain", "Lato");
    });
    it("verify home page in singlepage layout activity",()=>{
      activityPage.getSequenceActivityTitle().click();
      activityPage.clickSequenceThumb(5);
      activityPage.getActivityTitle().should("contain", "Automation Activity For SinglePage Layout");
      activityPage.getPreviousPageButton().should("exist");
      activityPage.getNextPageButton().should("exist");
      activityPage.getActivityNavHeader().eq(0).should("exist");
      activityPage.getActivityNavHeader().eq(1).should("exist");
      activityPage.getHomeButton().should("not.contain", "Home");
      activityPage.getNavPageButton(0).should("not.contain", "Page 1");
      activityPage.getNavPageButton(1).should("not.contain", "Page 2");
      activityPage.getHeaderActivityTitle().invoke("css", "font-family").should("contain", "Lato");
    });
  });
});
context("Test activity layout override set to SinglePage", () => {
  before(() => {
    cy.visit("?preview&sequence=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Fsequences%2F34.json&sequenceActivity=0");
    activityPage.getSequenceTitle().should("contain", "Automation Sequence For Notebook Layout Override To SinglePage");
  });
  describe("Sequence Home Page",() => {
    it("verify sequence home page in normal layout",()=>{
      noteBook.verifyNotebookHeaderNotDisplayed();
      activityPage.getSequenceActivityTitle().invoke("css", "font-family").should("contain", "Lato");
    });
  });
  describe("Activity Single Page",() => {
    it("verify notebook layout activity",()=>{
      activityPage.getSequenceThumb().click();
      activityPage.getPreviousPageButton().should("not.exist");
      activityPage.getNextPageButton().should("not.exist");
      activityPage.getHomeButton().should("not.exist");
    });
    it("verify multipage layout activity",()=>{
      activityPage.getSequenceActivityTitle().click();
      activityPage.clickSequenceThumb(5);
      activityPage.getPreviousPageButton().should("not.exist");
      activityPage.getNextPageButton().should("not.exist");
      activityPage.getHomeButton().should("not.exist");
    });
    it("verify singlepage layout activity",()=>{
      activityPage.getSequenceActivityTitle().click();
      activityPage.clickSequenceThumb(5);
      activityPage.getPreviousPageButton().should("not.exist");
      activityPage.getNextPageButton().should("not.exist");
      activityPage.getHomeButton().should("not.exist");
    });
  });
});
