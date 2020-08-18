import React from "react";
import AccountOwnerIcon from "../../assets/svg-icons/account-circle-icon.svg";

import "./account-owner.scss";

interface IProps {
  userName: string;
}
export class AccountOwner extends React.PureComponent <IProps> {
  render() {
    return (
      <div className="account-owner" data-cy="account-owner">
        <AccountOwnerIcon className="icon" />
        <div className="account-owner-name">{this.props.userName}</div>
      </div>
    );
  }
}
