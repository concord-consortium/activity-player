import React from "react";

import "./image-video-interactive.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class ImageVideoInteractive extends React.PureComponent<IProps>  {
  render () {
    const { embeddable } =this.props;
    return(
      <div className="image" data-cy="image-video-interactive">
        <div className="content">
          { embeddable.type ==="VideoInteractive" ?
            this.renderVideo(embeddable)
              : <img src={this.props.embeddable.url} />
          }
          <div className="caption">{embeddable.caption}</div>
          <div className="credit">
            {embeddable.credit_url ? <a href={embeddable.credit_url}>{embeddable.credit}</a> : `${embeddable.credit}`}
          </div>
        </div>
      </div>
    );
  }

  private renderVideo(embeddable: any) {
    return (
      <video controls height={embeddable.height} width={embeddable.width}>
        <source src={embeddable.sources[0].url} type={this.props.embeddable.sources[0].format} /> 
      </video>
    );
  }
}
