import React from "react";
import AccountOwnerIcon from "../../assets/svg-icons/account-circle-icon.svg";

import "./account-owner.scss";

interface IProps {
  userName: string;
}
export class AccountOwnerDiv extends React.PureComponent <IProps> {
  render() {
    return (
      <div className={`accountOwner`} data-cy="account-owner">
        <AccountOwnerIcon className={`icon`} />
        <div className={`accountOwnerName`}>{this.props.userName}</div>
      </div>
    );
  }
}
