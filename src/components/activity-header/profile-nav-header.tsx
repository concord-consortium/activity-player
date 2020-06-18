import React from "react";

import './profile-nav-header.scss';

interface IProps {
  name: string;
}

export class ProfileNavHeader extends React.PureComponent <IProps> {
  render() {
    return (
      <div className="profile-nav-header" data-cy="profile-nav-header">
        <div className="profile-name">
          <span>{`Welcome, `}</span>
          <span className="userName">{this.props.name}</span>
        </div>
      </div>
    );
  }
}
