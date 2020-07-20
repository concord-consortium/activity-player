import React from "react";
import { IframeRuntime } from "./iframe-runtime";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class ManagedInteractive extends React.PureComponent<IProps>  {
  render() {
    const { embeddable, questionNumber } = this.props;
    const questionName = embeddable.name ? `: ${embeddable.name}` : "";
    const url = embeddable.url
                ? embeddable.url
                : (embeddable.library_interactive.data.base_url ? embeddable.library_interactive.data.base_url : "");
    return (
      <div>
        { questionNumber && <div className="header">Question #{questionNumber}{questionName}</div> }
        <IframeRuntime
          url={url}
          authoredState={embeddable.authored_state}
          interactiveState={null}
          setInteractiveState={this.handleNewInteractiveState}
        />
      </div>
    );
  }

  private handleNewInteractiveState = (state: any) => {
    // TODO: handle interactive state
  };
}
