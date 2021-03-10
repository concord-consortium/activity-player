import React from "react";
import IconFileDownload from "../../assets/svg-icons/icon-file-download.svg";
import IconFileUpload from "../../assets/svg-icons/icon-file-upload.svg";
import IconHelp from "../../assets/svg-icons/icon-help.svg";
import { Sequence, Activity } from "../../types";

import "./report-backup-options.scss";

interface IProps {
  activity: Activity;
  activityName: string;
  sequence?: Sequence;
  activityIndex?: number;
}

export const ReportBackupOptions: React.FC<IProps> = (props) => {
  const { activity, activityName, sequence, activityIndex } = props;

  const handleReportMyWork = () => {
    console.log("Report my work.");
  };

  const handleBackUpMyWork = () => {
    console.log("Back up my work.");
  };

  return (
    <div className="report-backup-options" data-cy="report-backup-options">
      <h2>Reporting/Backing Up My Work</h2>
      <button className="button" onClick={handleReportMyWork}><IconFileUpload width={24} height={24} />Report My Work</button>
      <IconHelp width={24} height={24} className="help" />
      <p>Share any work you have done in this activity with your teacher. You will have to be connected to the internet.</p>
      <button className="button" onClick={handleBackUpMyWork}><IconFileDownload width={24} height={24} />Back Up My Work</button>
      <IconHelp width={24} height={24} className="help" />
      <p>Back up your answers to create a desktop file that you can send to your teacher by email.</p>
    </div>
  );
};
