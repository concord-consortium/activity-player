import React from "react";
import { SocialMediaLinks } from "./social-media-links";
import { shallow } from "enzyme";

describe("Social Media Links component", () => {
  it("renders social media links", () => {
    const wrapper = shallow(<SocialMediaLinks shareURL="https://concord.org/" />);
    expect(wrapper.find('[data-cy="share-facebook"]').length).toBe(1);
    expect(wrapper.find('[data-cy="share-twitter"]').length).toBe(1);
  });
});
