import React from "react";
import { Storage } from "../../storage-facade";

import "./completion-export-answers.scss";

interface IProps { }
interface IState {
  activityJSON: string
}

export class CompletionExportAnswers extends React.PureComponent<IProps, IState> {

  public constructor(props: IProps) {
    super(props);
    this.state = {activityJSON: ""};
  }
  async componentDidMount() {
    const activityJSON = await Storage.exportActivityToJSON();
    this.setState({ activityJSON });
  }

  render() {
    const { activityJSON } = this.state;
    const bb = new Blob([activityJSON], { type: "text/plain" });
    const activityLink = window.URL.createObjectURL(bb);

    return (
      <div className={"activity-export-download"}>
        <a href={activityLink} download={"allmyanswers.json"}>
          <div className={"button"}>Save My Work</div>
        </a>
      </div>
    );
  }
}
