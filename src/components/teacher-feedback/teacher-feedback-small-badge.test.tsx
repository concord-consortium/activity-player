import React from "react";
import { shallow } from "enzyme";
import { TeacherFeedbackSmallBadge } from "./teacher-feedback-small-badge";

describe("Teacher Feedback Small Badge component", () => {

  it("renders component for page-links location", () => {
    const wrapper = shallow(<TeacherFeedbackSmallBadge location="page-links" />);
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').length).toBe(1);
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').prop("title")).toBe("Your teacher left feedback on this page.");
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').hasClass("teacher-feedback-small-badge")).toBe(true);
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').hasClass("page-links-badge")).toBe(true);
  });

  it("renders component for nav-pages location", () => {
    const wrapper = shallow(<TeacherFeedbackSmallBadge location="nav-pages" />);
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').length).toBe(1);
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').prop("title")).toBe("Your teacher left feedback on this page.");
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').hasClass("teacher-feedback-small-badge")).toBe(true);
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').hasClass("nav-pages-badge")).toBe(true);
  });
});
