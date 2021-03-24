import React from "react";
import { getStorage } from "../../storage/storage-facade";

import "./completion-export-answers.scss";

interface IProps { }
interface IState {
  activityJSON: string,
  filename: string
}

export class CompletionExportAnswers extends React.PureComponent<IProps, IState> {

  public constructor(props: IProps) {
    super(props);
    this.state = {activityJSON: "", filename: "activity"};
  }
  async componentDidMount() {
    const storage = await getStorage();
    const activityJSONComplete = await storage.exportActivityToJSON();
    const filename = activityJSONComplete.filename;
    this.setState({ activityJSON: JSON.stringify(activityJSONComplete), filename });
  }

  render() {
    const { activityJSON, filename } = this.state;
    const bb = new Blob([activityJSON], { type: "text/plain" });
    const activityLink = window.URL.createObjectURL(bb);

    return (
      <div className={"activity-export-download"}>
        <a href={activityLink} download={`${filename}.json`}>
          <div className={"button"}>Save My Work</div>
        </a>
      </div>
    );
  }
}
