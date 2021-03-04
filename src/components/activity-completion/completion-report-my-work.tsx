import React from "react";
import { Storage } from "../../storage/storage-facade";

import "./completion-report-my-work.scss";

interface IProps { }
interface IState { }

export class CompletionReportMyWork extends React.PureComponent<IProps, IState> {

  readonly ReportHelpText = `
    Share any work you have done in this activity with your teacher.
    You will have to be connected to the internet.`;

  public constructor(props: IProps) {
    super(props);
  }

  async componentDidMount() {
    // const activityJSONComplete = await Storage.exportActivityToJSON();
    // const filename = activityJSONComplete.filename;
    // this.setState({ activityJSON: JSON.stringify(activityJSONComplete), filename });
  }

  render() {

    const className = Storage.canSyncData() ? "enabled" : "disabled";
    const clickAction = Storage.canSyncData()
      ? () => Storage.syncData()
      : () => null;
    return (
      <div className={"completion-report-my-work"}>
        <button
          className={className}
          onClick={clickAction}>
          Report My Work
        </button>
        <div className="report-help">
          {this.ReportHelpText}
        </div>
      </div>
    );
  }
}
