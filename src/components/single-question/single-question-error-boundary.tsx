// src/components/single-question/single-question-error-boundary.tsx

import React, { Component, ErrorInfo, ReactNode } from "react";
import "./single-question-error-boundary.scss";

interface IProps {
  children: ReactNode;
  slideLabel: string;
  onRetry?: () => void;
}

interface IState {
  hasError: boolean;
}

export class SingleQuestionErrorBoundary extends Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): IState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging/monitoring
    console.error("Slide render error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="single-question-error-boundary" role="alert">
          <div className="single-question-error-boundary__content">
            <h3 className="single-question-error-boundary__title">
              Unable to load content
            </h3>
            <p className="single-question-error-boundary__message">
              There was a problem displaying &ldquo;{this.props.slideLabel}&rdquo;.
              You can try again or continue to the next slide.
            </p>
            <button
              className="single-question-error-boundary__retry-button"
              onClick={this.handleRetry}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
