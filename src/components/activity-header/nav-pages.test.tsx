import React from "react";
import { NavPages } from "./nav-pages";
import { shallow } from "enzyme";
import { fireEvent, render, screen } from "@testing-library/react";
import { DefaultTestPage } from "../../test-utils/model-for-tests";
import IconHome from "../../assets/svg-icons/icon-home.svg";

const stubFunction = () => {
  // do nothing.
};
const activityPages = [
  {...DefaultTestPage, name: "1"},
  {...DefaultTestPage, name: "2"},
  {...DefaultTestPage, name: "3"},
  {...DefaultTestPage, name: "4"},
  {...DefaultTestPage, name: "5"},
  {...DefaultTestPage, name: "6"},
  {...DefaultTestPage, name: "7"},
  {...DefaultTestPage, name: "8"},
  {...DefaultTestPage, name: "9"},
  {...DefaultTestPage, name: "10"},
  {...DefaultTestPage, name: "11"},
  {...DefaultTestPage, name: "12"},
  {...DefaultTestPage, name: "13"},
  {...DefaultTestPage, name: "14"},
  {...DefaultTestPage, name: "15"},
];

jest.mock("../../firebase-db", () => ({
  watchActivityLevelFeedback: jest.fn(),
  watchQuestionLevelFeedback: jest.fn()
}));

describe("Nav Pages component", () => {
  it("renders nav pages content", () => {
    const wrapper = shallow(<NavPages
      activityId={1}
      pages={activityPages}
      currentPage={0}
      onPageChange={stubFunction}
    />);
    expect(wrapper.containsMatchingElement(<IconHome width={28} height={28}/>)).toEqual(true);
    expect(wrapper.find('[data-cy="nav-pages-button"]').length).toBe(11);
  });
  it("renders nav pages with disabled buttons", () => {
    const wrapper = shallow(<NavPages
      activityId={1}
      pages={activityPages}
      currentPage={5}
      onPageChange={stubFunction}
      lockForwardNav={true}
    />);
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(1).hasClass("disabled")).toBe(false); // first page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(4).hasClass("disabled")).toBe(false); // previous page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(5).hasClass("disabled")).toBe(true); // current page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(6).hasClass("disabled")).toBe(true); // next page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(10).hasClass("disabled")).toBe(true); // subsequent page
  });
  it("renders pagination near start page", () => {
    const wrapper = shallow(<NavPages
      activityId={1}
      pages={activityPages}
      currentPage={2}
      onPageChange={stubFunction}
    />);
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).text()).toContain("1"); // first page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(1).text()).toContain("2"); // second page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(9).text()).toContain("10"); // second to last page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(10).text()).toContain("11"); // last page
  });
  it("renders pagination in the middle", () => {
    const wrapper = shallow(<NavPages
      activityId={1}
      pages={activityPages}
      currentPage={7}
      onPageChange={stubFunction}
    />);
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).text()).toContain("2"); // first page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(1).text()).toContain("3"); // second page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(9).text()).toContain("11"); // second to last page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(10).text()).toContain("12"); // last page
  });
  it("renders pagination near end page", () => {
    const wrapper = shallow(<NavPages
      activityId={1}
      pages={activityPages}
      currentPage={13}
      onPageChange={stubFunction}
    />);
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).text()).toContain("5"); // first page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(1).text()).toContain("6"); // second page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(9).text()).toContain("14"); // second to last page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(10).text()).toContain("15"); // last page
  });
  it("blocks navigation after page change is requested", () => {
    const onPageChange = jest.fn();
    const wrapper = shallow(<NavPages
      activityId={1}
      pages={activityPages}
      currentPage={13}
      onPageChange={onPageChange}
    />);

    // Lock nav buttons after one of them has been clicked.
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).hasClass("disabled")).toEqual(false);
    wrapper.find('[data-cy="nav-pages-button"]').at(0).simulate("click");
    wrapper.update();
    expect(onPageChange).toHaveBeenCalled();
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).hasClass("disabled")).toEqual(true);

    // Unlock when new page is set.
    wrapper.setProps({
      currentPage: 1
    });
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).hasClass("disabled")).toEqual(false);
  });
  it("renders nav page correctly when page is hidden", () => {
    const activityHiddenPages = [
      {...DefaultTestPage, name: "1"},
      {...DefaultTestPage, name: "2", is_hidden: true},
      {...DefaultTestPage, name: "3", is_hidden: true},
      {...DefaultTestPage, name: "4"},
    ];
    render(
      <NavPages
        activityId={1}
        pages={activityHiddenPages}
        currentPage={0}
        onPageChange={stubFunction}
      />
    );
    // back and forward links, home link, 2 page links
    expect(screen.getAllByRole("link").length).toBe(5);
  });
});

describe("Nav Pages accessibility", () => {
  // Pages with distinct ids/positions so hrefs resolve to specific pages.
  const pagesWithIds = [
    {...DefaultTestPage, name: "1", id: 101, position: 1},
    {...DefaultTestPage, name: "2", id: 102, position: 2},
    {...DefaultTestPage, name: "3", id: 103, position: 3},
  ];

  it("renders the controls as a list of links", () => {
    const { container } = render(
      <NavPages activityId={1} pages={pagesWithIds} currentPage={2} onPageChange={stubFunction} />
    );
    const list = container.querySelector("ul.nav-pages");
    expect(list).not.toBeNull();
    // previous + home + 3 page links + next, each an <a> inside an <li>
    expect(container.querySelectorAll("li.page-button-container").length).toBe(6);
    expect(container.querySelectorAll("li.page-button-container > a.page-button").length).toBe(6);
    expect(screen.getAllByRole("link").length).toBe(6);
  });

  it("gives each control a page href, with home carrying no page param", () => {
    render(
      <NavPages activityId={1} pages={pagesWithIds} currentPage={2} onPageChange={stubFunction} />
    );
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("?");
    expect(screen.getByRole("link", { name: "Page 1" }).getAttribute("href")).toBe("?page=page_101");
    expect(screen.getByRole("link", { name: "Page 2" }).getAttribute("href")).toBe("?page=page_102");
    expect(screen.getByRole("link", { name: "Previous page" }).getAttribute("href")).toBe("?page=page_101");
    expect(screen.getByRole("link", { name: "Next page" }).getAttribute("href")).toBe("?page=page_103");
  });

  it("marks only the current page with aria-current", () => {
    render(
      <NavPages activityId={1} pages={pagesWithIds} currentPage={2} onPageChange={stubFunction} />
    );
    expect(screen.getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Page 1" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("marks Home with aria-current on the home page", () => {
    render(
      <NavPages activityId={1} pages={pagesWithIds} currentPage={0} onPageChange={stubFunction} />
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });

  it("sets aria-disabled on previous at home and next at the last page", () => {
    const { rerender } = render(
      <NavPages activityId={1} pages={pagesWithIds} currentPage={0} onPageChange={stubFunction} />
    );
    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "Next page" })).not.toHaveAttribute("aria-disabled");

    rerender(
      <NavPages activityId={1} pages={pagesWithIds} currentPage={3} onPageChange={stubFunction} />
    );
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "Previous page" })).not.toHaveAttribute("aria-disabled");
  });

  it("points hard-disabled prev/next at the current page rather than an out-of-range destination", () => {
    // Next is hard-disabled on the last page: its href should be the current
    // page (page 3), not the home page it would otherwise resolve to.
    const { rerender } = render(
      <NavPages activityId={1} pages={pagesWithIds} currentPage={3} onPageChange={stubFunction} />
    );
    expect(screen.getByRole("link", { name: "Next page" }).getAttribute("href")).toBe("?page=page_103");

    // Previous is hard-disabled on the home page: its href stays at home.
    rerender(
      <NavPages activityId={1} pages={pagesWithIds} currentPage={0} onPageChange={stubFunction} />
    );
    expect(screen.getByRole("link", { name: "Previous page" }).getAttribute("href")).toBe("?");
  });

  it("does not request a page change when a hard-disabled control is activated", () => {
    // Hard-disabled controls remain keyboard-activatable (pointer-events:none
    // only blocks the mouse), so activating them must be inert to avoid
    // requesting an out-of-range page and locking navigation.
    const onPageChange = jest.fn();
    const { rerender } = render(
      <NavPages activityId={1} pages={pagesWithIds} currentPage={0} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByRole("link", { name: "Previous page" }));
    expect(onPageChange).not.toHaveBeenCalled();

    rerender(
      <NavPages activityId={1} pages={pagesWithIds} currentPage={3} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByRole("link", { name: "Next page" }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("hides decorative icons from assistive technology", () => {
    const { container } = render(
      <NavPages activityId={1} pages={pagesWithIds} currentPage={2} onPageChange={stubFunction} />
    );
    // SVGs are stubbed in Jest, so assert the icon element carries aria-hidden
    // rather than matching an <svg> tag.
    ["previous-page-button", "next-page-button", "home-button"].forEach((dataCy) => {
      const icon = container.querySelector(`[data-cy="${dataCy}"] > *`);
      expect(icon).not.toBeNull();
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });
});
