import React from "react";
import { Sequence } from "../../types";
import { Footer } from "../activity-introduction/footer";
import { Header } from "../activity-header/header";
import { SequencePageContent } from "../sequence-introduction/sequence-page-content";

interface IProps {
  sequence: Sequence | undefined;
  username: string;
  onSelectActivity: (page: number) => void;
}

export const SequenceIntroduction: React.FC<IProps> = (props) => {
  const { sequence, username, onSelectActivity } = props;
  return (
    !sequence 
    ? <div>Loading</div>
    : <React.Fragment>
        <Header
          fullWidth={false}
          projectId={sequence.project_id}
          userName={username}
          activityName={sequence.display_title || sequence.title}
          singlePage={false}
          showSequence={true}
          sequenceLogo={sequence.logo}
        />
        <SequencePageContent
          sequence={sequence}
          onSelectActivity={onSelectActivity}
        />
        <Footer
          fullWidth={true}
          projectId={sequence.project_id}
        />
      </React.Fragment>
  );
};
