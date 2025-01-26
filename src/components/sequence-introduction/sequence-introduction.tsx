import React from "react";
import { QuestionMap, Sequence } from "../../types";
import { Footer } from "../activity-introduction/footer";
import { Header } from "../activity-header/header";
import { SequencePageContent } from "../sequence-introduction/sequence-page-content";
import { setQueryValue } from "../../utilities/url-query";
import { setAppBackgroundImage } from "../../utilities/activity-utils";

interface IProps {
  sequence?: Sequence;
  questionMap?: QuestionMap;
  username: string;
  onSelectActivity: (page: number) => void;
}

export const SequenceIntroduction: React.FC<IProps> = (props) => {
  const { sequence, username, questionMap, onSelectActivity } = props;
  setQueryValue("sequenceActivity", "0");
  const backgroundImage = sequence?.background_image;
  if (backgroundImage) {
    setAppBackgroundImage(backgroundImage);
  }
  return (
    !sequence
    ? <div data-cy="sequence-loading">Loading</div>
    : <React.Fragment>
        <Header
          fullWidth={false}
          project={sequence.project}
          userName={username}
          contentName={sequence.display_title || sequence.title || ""}
          showSequence={true}
        />
        <SequencePageContent
          sequence={sequence}
          questionMap={questionMap}
          onSelectActivity={onSelectActivity}
        />
        <Footer
          fullWidth={true}
          project={sequence.project}
        />
      </React.Fragment>
  );
};
