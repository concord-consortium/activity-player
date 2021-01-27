import React from "react";
import { IdleWarning } from "./idle-warning";
import { shallow, mount } from "enzyme";
import { act } from "react-dom/test-utils";

describe("IdleWarning component", () => {
  describe("when user is logged in", () => {  
    const getProps = () => ({
      username: "test user",
      onTimeout: jest.fn(),
      onContinue: jest.fn(),
      onExit: jest.fn(),
      timeout: 2 * 60 * 1000,
      anonymous: false
    });

    it("renders user name and remaining time", () => {
      const props = getProps();
      const wrapper = shallow(<IdleWarning {...props} />);
      expect(wrapper.find('[data-cy="idle-warning"]').length).toBe(1);
      expect(wrapper.text()).toContain(props.username);
      expect(wrapper.text()).toContain("2 minutes");
      expect(wrapper.text()).toContain("and 0 seconds");
    });

    it("calls onTimeout after `timeout` time", () => {
      jest.useFakeTimers(); // mock timers  
      const props = getProps();
      props.timeout = 1;
      mount(<IdleWarning {...props} />);

      act(() => {
        jest.runOnlyPendingTimers();
        jest.runOnlyPendingTimers();
        jest.runOnlyPendingTimers();
      });

      expect(props.onTimeout).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it("calls onContinue when user clicks the continue button", () => {
      const props = getProps();
      const wrapper = shallow(<IdleWarning {...props} />);
      expect(wrapper.find('[data-cy="continue"]').length).toBe(1);
      wrapper.find('[data-cy="continue"]').simulate("click");
      expect(props.onContinue).toHaveBeenCalled();
    });

    it("redirects user to Portal when user clicks the exit button", () => {
      const props = getProps();
      const wrapper = shallow(<IdleWarning {...props} />);
      expect(wrapper.find('[data-cy="exit"]').length).toBe(1);
      wrapper.find('[data-cy="exit"]').simulate("click");
      expect(props.onExit).toHaveBeenCalled();
    });
  });

  describe("when user is anonymous", () => {
    const getProps = () => ({
      username: "Anonymous",
      onTimeout: jest.fn(),
      onContinue: jest.fn(),
      onExit: jest.fn(),
      timeout: 2 * 60 * 1000,
      anonymous: true
    });

    it("renders basic warning", () => {
      const props = getProps();
      const wrapper = shallow(<IdleWarning {...props} />);
      expect(wrapper.find('[data-cy="idle-warning"]').length).toBe(1);
      expect(wrapper.text()).toContain("You've been idle for too long.");
    });

    it("calls onContinue when user clicks the continue button", () => {
      const props = getProps();
      const wrapper = shallow(<IdleWarning {...props} />);
      expect(wrapper.find('[data-cy="continue"]').length).toBe(1);
      wrapper.find('[data-cy="continue"]').simulate("click");
      expect(props.onContinue).toHaveBeenCalled();
    });
  });
});
