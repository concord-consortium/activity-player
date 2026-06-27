import React from "react";
import { Sequence } from "../../types";
import { Footer } from "../activity-introduction/footer";
import { Header } from "../activity-header/header";
import { SequencePageContent } from "../sequence-introduction/sequence-page-content";
import { setQueryValue } from "../../utilities/url-query";
import { setAppBackgroundImage } from "../../utilities/activity-utils";

interface IProps {
  sequence?: Sequence;
  username: string;
  onSelectActivity: (page: number) => void;
}

export const SequenceIntroduction: React.FC<IProps> = (props) => {
  const { sequence, username, onSelectActivity } = props;
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
        {/* Skip-link focus target (WCAG 2.4.1). A plain <div>, not a <main>:
            SequencePageContent already renders its own single <main> landmark,
            so a <main> here would nest landmarks. */}
        <div id="main-content" tabIndex={-1}>
          <SequencePageContent
            sequence={sequence}
            onSelectActivity={onSelectActivity}
          />
        </div>
        <Footer
          fullWidth={true}
          project={sequence.project}
        />
      </React.Fragment>
  );
};
