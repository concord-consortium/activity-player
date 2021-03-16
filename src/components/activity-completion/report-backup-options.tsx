import React from "react";
import IconFileDownload from "../../assets/svg-icons/icon-file-download.svg";
import IconFileUpload from "../../assets/svg-icons/icon-file-upload.svg";
import IconHelp from "../../assets/svg-icons/icon-help.svg";
import { getStorage } from "../../storage/storage-facade";

import "./report-backup-options.scss";

interface IProps {}

interface IState {
  activityJSON: string,
  filename: string
}

export class ReportBackupOptions extends React.PureComponent<IProps, IState> { 
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
    const storage = getStorage();
    const reportOptionClass = storage.canSyncData() ? "report-backup-option" : "report-backup-option disabled";
    const reportButtonDisabled = !storage.canSyncData();
    const reportAction = storage.canSyncData()
      ? () => storage.syncData()
      : () => null;
    
    return (
      <div className="report-backup-options" data-cy="report-backup-options">
        <h2>Reporting/Backing Up My Work</h2>
        <div className={reportOptionClass}>
          <button className="button" onClick={reportAction} disabled={reportButtonDisabled} data-cy="report-backup-upload-button"><IconFileUpload width={24} height={24} />Report My Work</button>
          <IconHelp width={24} height={24} className="help" />
          <p>Share any work you have done in this activity with your teacher. You will have to be connected to the internet.</p>
        </div>
        <div className="report-backup-option">
          <a className="button" href={activityLink} download={`${filename}.json`} data-cy="report-backup-download-button"><IconFileDownload width={24} height={24} />Back Up My Work</a>
          <IconHelp width={24} height={24} className="help" />
          <p>Back up your answers to create a desktop file that you can send to your teacher by email.</p>
        </div>
      </div>
    );
  }
}
