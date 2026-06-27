import React from "react";
import { ActivityPageLinks } from "./activity-page-links";
import { shallow } from "enzyme";
import { fireEvent, render, screen } from "@testing-library/react";
import { DefaultTestPage } from "../../test-utils/model-for-tests";
import { DynamicTextTester } from "../../test-utils/dynamic-text";
import { Page } from "../../types";

const noop = () => {
  // do nothing.
};

const renderPageLinks = (activityPages: Page[], onPageChange: (page: number) => void = noop) =>
  render(
    <DynamicTextTester>
      <ActivityPageLinks activityPages={activityPages} onPageChange={onPageChange} />
    </DynamicTextTester>
  );

jest.mock("../../firebase-db", () => ({
  watchActivityLevelFeedback: jest.fn(),
  watchQuestionLevelFeedback: jest.fn()
}));

describe("Activity Page Links component", () => {
  it("renders activity page links", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const activityPages = [
      {...DefaultTestPage, name: "Page 1"},
      {...DefaultTestPage, name: "Page 2"},
      {...DefaultTestPage, name: "Page 3"},
    ];

    const wrapper = shallow(<ActivityPageLinks activityPages={activityPages} onPageChange={stubFunction} />);
    expect(wrapper.containsMatchingElement(<span>Page 1</span>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<span>Page 2</span>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<span>Page 3</span>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<button>Begin Activity</button>)).toEqual(true);
  });
});

describe("Activity Page Links accessibility", () => {
  // Pages with distinct ids so each link's href resolves to a specific page.
  const pagesWithIds = [
    {...DefaultTestPage, name: "Page One", id: 101, position: 1},
    {...DefaultTestPage, name: "Page Two", id: 102, position: 2},
    {...DefaultTestPage, name: "Page Three", id: 103, position: 3},
  ];

  it("renders the page list as a <ul> of <li> wrapping native <a> links", () => {
    const { container } = renderPageLinks(pagesWithIds);
    expect(container.querySelector("ul.page-list")).not.toBeNull();
    expect(container.querySelectorAll("li.page-item-container > a.page-item").length).toBe(3);
    expect(screen.getAllByRole("link").length).toBe(3);
  });

  it("builds each link href from the page id", () => {
    renderPageLinks(pagesWithIds);
    expect(screen.getByRole("link", { name: "1: Page One" }).getAttribute("href")).toBe("?page=page_101");
    expect(screen.getByRole("link", { name: "2: Page Two" }).getAttribute("href")).toBe("?page=page_102");
    expect(screen.getByRole("link", { name: "3: Page Three" }).getAttribute("href")).toBe("?page=page_103");
  });

  it("includes the index prefix in each link's accessible name", () => {
    // The trailing space after the index keeps the name as "1: Page One" rather
    // than "1:Page One"; getByRole would not match the name without it.
    renderPageLinks(pagesWithIds);
    expect(screen.getByRole("link", { name: "1: Page One" })).toBeTruthy();
  });

  it("omits hidden pages from the list", () => {
    const pages = [
      {...DefaultTestPage, name: "Visible", id: 201, position: 1},
      {...DefaultTestPage, name: "Hidden", id: 202, position: 2, is_hidden: true},
      {...DefaultTestPage, name: "Also Visible", id: 203, position: 3},
    ];
    renderPageLinks(pages);
    expect(screen.getAllByRole("link").length).toBe(2);
    expect(screen.queryByRole("link", { name: /Hidden/ })).toBeNull();
  });

  it("navigates by 1-based visible page index while linking by page id", () => {
    // The app renders pages by visible index (pagesVisible[currentPage - 1]), so
    // onPageChange must receive that index, not page.position. A hidden page does
    // not get a link, so the second *visible* page is index 2 even though its
    // page.position is 3. The href, by contrast, is built from the page id.
    const onPageChange = jest.fn();
    const pages = [
      {...DefaultTestPage, name: "First", id: 301, position: 1},
      {...DefaultTestPage, name: "Hidden", id: 302, position: 2, is_hidden: true},
      {...DefaultTestPage, name: "Third", id: 303, position: 3},
    ];
    renderPageLinks(pages, onPageChange);
    const thirdLink = screen.getByRole("link", { name: "2: Third" });
    expect(thirdLink.getAttribute("href")).toBe("?page=page_303");
    fireEvent.click(thirdLink);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("requests the page change on a plain click", () => {
    const onPageChange = jest.fn();
    renderPageLinks(pagesWithIds, onPageChange);
    fireEvent.click(screen.getByRole("link", { name: "2: Page Two" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("defers modified clicks to the browser without requesting a page change", () => {
    // cmd/ctrl/shift/alt-clicks should open the page natively (e.g. new tab) via
    // the anchor href, not trigger an in-app page change.
    const onPageChange = jest.fn();
    renderPageLinks(pagesWithIds, onPageChange);
    const link = screen.getByRole("link", { name: "1: Page One" });
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { shiftKey: true });
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("renders no stray text nodes inside the list", () => {
    const { container } = renderPageLinks(pagesWithIds);
    const list = container.querySelector("ul.page-list")!;
    const textNodes = Array.from(list.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE);
    expect(textNodes).toHaveLength(0);
    Array.from(list.children).forEach((child) => expect(child.tagName).toBe("LI"));
  });

  it("requests the first page from the Begin Activity button", () => {
    const onPageChange = jest.fn();
    renderPageLinks(pagesWithIds, onPageChange);
    fireEvent.click(screen.getByRole("button", { name: "Begin Activity" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
