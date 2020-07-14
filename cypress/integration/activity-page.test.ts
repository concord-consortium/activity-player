import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;

context("Test the overall app", () => {
  before(() => {
    cy.visit("?activity=sample-activity-multiple-layout-types");
    activityPage.getPage(2).click();
  });
  describe("Sidebar",() => {
    it("verify sidebar opens",()=>{
      const content="Sed vestibulum elit nulla, at convallis urna pretium vitae. Phasellus quis efficitur ipsum. Aliquam laoreet, ex pharetra facilisis volutpat, ante erat pretium sem, ac feugiat tortor metus vitae augue. Nulla orci arcu, elementum et dui eget, consequat elementum nisi. Donec sodales tempor libero at facilisis. Phasellus porta, arcu in pellentesque imperdiet, urna velit tristique enim, sed ultricies enim nunc vel urna. Suspendisse venenatis augue risus, vel euismod mi tincidunt id. Quisque a vehicula lacus. Sed elementum ornare purus id venenatis. Aenean enim velit, interdum eget tortor non, varius suscipit magna. Ut varius rutrum metus nec consequat. Sed tempus orci vitae dui elementum vulputate. Phasellus scelerisque purus id scelerisque sollicitudin. Morbi vehicula diam sit amet enim placerat efficitur. In hac habitasse platea dictumst. ";
      activityPage.getSidebarTab().click();
      activityPage.getSidebarContent().should("be.visible").and("contain", content);
    });
    it("verify sidebar closes when tab is clicked",()=>{
      activityPage.getSidebarTab().click();
      activityPage.getSidebarContent().should("not.be.visible");
    });
    it("verify sidebar closes when the close button is clicked",()=>{
      activityPage.getSidebarTab().click();
      activityPage.getSidebarContent().should("be.visible");
      activityPage.getSidebarCloseButton().click();
      activityPage.getSidebarContent().should("not.be.visible");
    });
  });
});
