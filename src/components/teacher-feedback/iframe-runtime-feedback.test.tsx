import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DynamicTextContext } from "@concord-consortium/dynamic-text";
import { IframeRuntimeFeedback } from "./iframe-runtime-feedback";
import { QuestionFeedback } from "../../types";

describe("IframeRuntimeFeedback", () => {
  const mockFeedback: QuestionFeedback = {
    content: "Great job!",
    timestamp: "2021-08-10T14:00:00Z",
    questionId: "q1"
  };
  const embeddableRefId = "embeddable_1";

  const mockDynamicTextContextValue = {
    registerComponent: jest.fn(),
    unregisterComponent: jest.fn(),
    selectComponent: jest.fn()
  };

  const renderComponent = () => {
    return render(
      <DynamicTextContext.Provider value={mockDynamicTextContextValue}>
        <IframeRuntimeFeedback feedback={mockFeedback} embeddableRefId={embeddableRefId} />
      </DynamicTextContext.Provider>
    );
  };

  it("renders the feedback button initially", () => {
    renderComponent();

    expect(screen.getByTestId("feedback-button")).toBeInTheDocument();
    expect(screen.queryByTestId("teacher-feedback")).not.toBeInTheDocument();
  });

  it("shows the feedback content when the button is clicked", () => {
    renderComponent();

    expect(screen.queryByTestId("teacher-feedback")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("feedback-button"));
    expect(screen.getByTestId("teacher-feedback")).toBeInTheDocument();
    expect(screen.getByText("Teacher Feedback:")).toBeInTheDocument();
    expect(screen.getByText("Great job!")).toBeInTheDocument();
    expect(screen.queryByTestId("feedback-button")).not.toBeInTheDocument();
  });

  it("hides the feedback content when the feedback content changes", () => {
    const { rerender } = renderComponent();

    fireEvent.click(screen.getByTestId("feedback-button"));
    expect(screen.getByTestId("teacher-feedback")).toBeInTheDocument();
    expect(screen.getByText("Great job!")).toBeInTheDocument();
    const newFeedback = { ...mockFeedback, content: "Needs improvement." };
    rerender(
      <DynamicTextContext.Provider value={mockDynamicTextContextValue}>
        <IframeRuntimeFeedback feedback={newFeedback} embeddableRefId={embeddableRefId} />
      </DynamicTextContext.Provider>
    );
    expect(screen.queryByTestId("teacher-feedback")).not.toBeInTheDocument();
    expect(screen.getByTestId("feedback-button")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("feedback-button"));
    expect(screen.getByTestId("teacher-feedback")).toBeInTheDocument();
    expect(screen.getByText("Needs improvement.")).toBeInTheDocument();
  });
});
