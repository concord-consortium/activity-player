import React from "react";

// import "./image-video-interactive.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class GenericInteractive extends React.PureComponent<IProps>  {
  render() {
    const { embeddable, questionNumber } = this.props;
    const interactiveUrl = embeddable.url_fragment ? 
                            embeddable.library_interactive.data.base_url + `?` + embeddable.url_fragment 
                            : embeddable.library_interactive.data.base_url;
    const isClickToPlay = embeddable.library_interactive.data.click_to_play;
    return (
      <React.Fragment>
        <div className="header">Question #{questionNumber}</div>
        <div className="interactive-container">
          {isClickToPlay &&
            <div className="click-to-play-image">
              <img src={embeddable.library_interactive.data.image_url} />
            </div>
          }
          <iframe className="interactive" src={interactiveUrl} />
        </div>
      </React.Fragment>
    );
  }
}
