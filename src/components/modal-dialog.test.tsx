import React from "react";
import { shallow } from "enzyme";
import { ModalDialog } from "./modal-dialog";

describe("Modal Dialog component", () => {
  it("renders Modal Dialog component", () => {
    const wrapper = shallow(<ModalDialog
                              title="test"
                              label="dialog test"
                              showModal={true}
                              setShowModal={() => { /* nop */ }}
                            />);
    expect(wrapper.find('[data-cy="modal-dialog-header"]').length).toBe(1);
    expect(wrapper.find('[data-cy="modal-dialog-header"]').text()).toContain("test");
    expect(wrapper.find('[data-cy="modal-dialog-label"]').length).toBe(1);
    expect(wrapper.find('[data-cy="modal-dialog-label"]').text()).toContain("dialog test");
  });
});
