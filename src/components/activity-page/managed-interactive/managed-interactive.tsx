import React from "react";
import { IframeRuntime } from "./iframe-runtime";

import "./managed-interactive.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class ManagedInteractive extends React.PureComponent<IProps>  {
  render() {
    const { embeddable, questionNumber } = this.props;
    return (
      <div>
        { questionNumber && <div className="header">Question #{questionNumber}</div> }
        <IframeRuntime
          url={embeddable.library_interactive.data.base_url}
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
