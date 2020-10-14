import React from "react";
import { CustomSelect } from "./custom-select";
import { configure, fireEvent, render, waitForElementToBeRemoved } from "@testing-library/react";

describe("Custom Select component", () => {
  it("renders Custom Select component", () => {
    let selectedItem = "";
    const handleSelectItem = (item: string) => {
      selectedItem = item;
    };
    configure({ testIdAttribute: "data-cy" });
    const { container, getByTestId, getByText, queryByText } = render(
      <CustomSelect items={["Item 1", "Item 2", "Item 3"]} onSelectItem={handleSelectItem} />
    );
    // open menu and select an item
    fireEvent.click(getByTestId("custom-select-header"));
    expect(getByText("Item 2")).toBeVisible();
    fireEvent.click(getByText("Item 2"));
    expect(selectedItem).toBe("Item 2");
    // open menu and click outside
    fireEvent.click(getByTestId("custom-select-header"));
    expect(getByText("Item 3")).toBeVisible();
    fireEvent.mouseDown(container);
    waitForElementToBeRemoved(getByText("Item 3"))
      .then(() => {
        expect(queryByText("Item 3")).toBeNull();
      });
  });
});
