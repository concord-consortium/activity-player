import React from "react";
import AccountOwnerIcon from "../../assets/svg-icons/account-circle-icon.svg";

import "./account-owner.scss";

interface IProps {
  userName: string;
  onClick?: () => void;
}
export class AccountOwner extends React.PureComponent <IProps> {
  render() {
    const clickHandler = this.props.onClick;
    return (
      <div className="account-owner" data-cy="account-owner" onClick={clickHandler}>
        <AccountOwnerIcon className="icon" />
        <div className="account-owner-name">{this.props.userName}</div>
      </div>
    );
  }
}
