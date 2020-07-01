import React from "react";

import './profile-nav-header.scss';

interface IProps {
  name: string;
  fullWidth?: boolean;
}

export class ProfileNavHeader extends React.PureComponent <IProps> {
  render() {
    const { fullWidth, name } = this.props;
    return (
      <div className={`profile-nav-header ${fullWidth ? "full" : ""}`} data-cy="profile-nav-header">
        <div className="profile-name">
          <span>{`Welcome, `}</span>
          <span className="userName">{name}</span>
        </div>
      </div>
    );
  }
}
