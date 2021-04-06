import React from "react";
import IconFileDownload from "../../assets/svg-icons/icon-file-download.svg";
import IconFileUpload from "../../assets/svg-icons/icon-file-upload.svg";
import IconHelp from "../../assets/svg-icons/icon-help.svg";
import { getStorage } from "../../storage/storage-facade";
import IconComplete from "../../assets/svg-icons/icon-check-circle.svg";
import IconIncomplete from "../../assets/svg-icons/icon-unfinished-check-circle.svg";
import IconSpin from "../../assets/svg-icons/icon-clock-spin.svg";

import "./report-backup-options.scss";

interface IProps {}

interface IState {
  activityJSON: string,
  filename: string,
  sending: boolean,
  lastSend: null| true | false;
}

export class ReportBackupOptions extends React.PureComponent<IProps, IState> {
  public constructor(props: IProps) {
    super(props);
    this.state = {activityJSON: "", filename: "activity", sending: false, lastSend:null};
  }

  async componentDidMount() {
    const storage = await getStorage();
    const activityJSONComplete = await storage.exportActivityToJSON();
    const filename = activityJSONComplete.filename;
    this.setState({ activityJSON: JSON.stringify(activityJSONComplete), filename });
  }

  renderProgress() {
    return(
      <>
        <div className="sending-text">Sending ...</div>
        <div className="sending-icon"> <IconSpin className="progress"/> </div>
      </>
    );
  }
  
  renderButtons() {
    const { activityJSON, lastSend, filename, sending } = this.state;
    const bb = new Blob([activityJSON], { type: "text/plain" });
    const activityLink = window.URL.createObjectURL(bb);
    const storage = getStorage();
    const reportButtonDisabled = (!storage.canSyncData()) || sending;
    const reportOptionClass = reportButtonDisabled
      ? "report-backup-option disabled"
      : "report-backup-option";
    const reportAction = !reportButtonDisabled
      ? () => {
        this.setState({sending: true, lastSend: null});
        storage.syncData().then((success) => {
          this.setState({sending: false, lastSend: success});
        });
      }
      : () => null;

    const reportButtonLabel = sending
      ? <>Sending...  &nbsp; <IconSpin className="progress"/></>
      : <>Report My Work</>;
    const successLabel = lastSend != null
      ? lastSend ? <IconComplete className="complete"/> : <IconIncomplete className="incomplete"/>
      : "";
    return (
        <>
          <div className={reportOptionClass}>
            <button className="button" onClick={reportAction} disabled={reportButtonDisabled} data-cy="report-backup-upload-button"><IconFileUpload width={24} height={24} />{reportButtonLabel}{successLabel}</button>
            <IconHelp width={24} height={24} className="help" />
            <p>Share any work you have done in this activity with your teacher. You will have to be connected to the internet.</p>
          </div>
          <div className="report-backup-option">
            <a className="button" href={activityLink} download={`${filename}.json`} data-cy="report-backup-download-button"><IconFileDownload width={24} height={24} />Back Up My Work</a>
            <IconHelp width={24} height={24} className="help" />
            <p>Back up your answers to create a desktop file that you can send to your teacher by email.</p>
          </div>
        </>
    );
  }

  render(){
    const { sending } = this.state;
    return (
      <div className="report-backup-options" data-cy="report-backup-options">
        <h2>Reporting/Backing Up My Work</h2>
        { sending
          ? this.renderProgress()
          : this.renderButtons()
        }
      </div>
    );
  }
}
