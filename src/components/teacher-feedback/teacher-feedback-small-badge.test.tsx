import React from "react";
import { shallow } from "enzyme";
import { TeacherFeedbackSmallBadge } from "./teacher-feedback-small-badge";

describe("Teacher Feedback Small Badge component", () => {

  it("renders component for page-links location", () => {
    const wrapper = shallow(<TeacherFeedbackSmallBadge location="page-links" />);
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').length).toBe(1);
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').hasClass("teacher-feedback-small-badge")).toBe(true);
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').hasClass("page-links-badge")).toBe(true);
  });

  it("renders component for nav-pages location", () => {
    const wrapper = shallow(<TeacherFeedbackSmallBadge location="nav-pages" />);
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').length).toBe(1);
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').hasClass("teacher-feedback-small-badge")).toBe(true);
    expect(wrapper.find('[data-testid="teacher-feedback-small-badge"]').hasClass("nav-pages-badge")).toBe(true);
  });

  it("exposes the badge icon to assistive technology with an accessible name", () => {
    // The badge is the only indicator that feedback exists, so the icon must be a named
    // image for screen readers rather than hidden.
    const wrapper = shallow(<TeacherFeedbackSmallBadge location="page-links" />);
    const icon = wrapper.find('[role="img"]');
    expect(icon.length).toBe(1);
    expect(icon.prop("aria-label")).toBe("Your teacher left feedback on this page.");
    expect(icon.prop("aria-hidden")).toBeUndefined();
  });
});
