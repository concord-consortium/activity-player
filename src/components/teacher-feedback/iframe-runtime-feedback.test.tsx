import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { IframeRuntimeFeedback } from "./iframe-runtime-feedback";
import { QuestionFeedback } from "../../types";

describe("IframeRuntimeFeedback", () => {
  const feedback: QuestionFeedback = {
    content: "Great job!",
    timestamp: "2021-08-10T14:00:00Z",
    questionId: "q1"
  };
  const embeddableRefId = "embeddable_1";

  it("renders the feedback button initially", () => {
    render(<IframeRuntimeFeedback feedback={feedback} embeddableRefId={embeddableRefId} />);
    expect(screen.getByText("Show Teacher Feedback")).toBeInTheDocument();
  });

  it("shows the feedback content when the button is clicked", () => {
    render(<IframeRuntimeFeedback feedback={feedback} embeddableRefId={embeddableRefId} />);
    fireEvent.click(screen.getByText("Show Teacher Feedback"));
    expect(screen.getByText("Teacher Feedback: Great job!")).toBeInTheDocument();
  });

  it("hides the feedback content when the feedback content changes", () => {
    const { rerender } = render(<IframeRuntimeFeedback feedback={feedback} embeddableRefId={embeddableRefId} />);
    fireEvent.click(screen.getByText("Show Teacher Feedback"));
    expect(screen.getByText("Teacher Feedback: Great job!")).toBeInTheDocument();

    const newFeedback = { ...feedback, content: "Needs improvement." };
    rerender(<IframeRuntimeFeedback feedback={newFeedback} embeddableRefId={embeddableRefId} />);
    expect(screen.queryByText("Teacher Feedback: Great job!")).not.toBeInTheDocument();
    expect(screen.getByText("Show Teacher Feedback")).toBeInTheDocument();
  });
});
