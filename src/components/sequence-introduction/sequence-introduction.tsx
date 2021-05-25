import React from "react";
import { Sequence } from "../../types";
import { Footer } from "../activity-introduction/footer";
import { Header } from "../activity-header/header";
import { SequencePageContent } from "../sequence-introduction/sequence-page-content";
import { setQueryValue } from "../../utilities/url-query";

interface IProps {
  sequence: Sequence | undefined;
  username: string;
  onSelectActivity: (page: number) => void;
}

export const SequenceIntroduction: React.FC<IProps> = (props) => {
  const { sequence, username, onSelectActivity } = props;
  setQueryValue("sequenceActivity", "0");
  return (
    !sequence
    ? <div data-cy="sequence-loading">Loading</div>
    : <React.Fragment>
        <Header
          fullWidth={false}
          projectId={sequence.project_id}
          userName={username}
          contentName={sequence.display_title || sequence.title || ""}
          showSequence={true}
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
