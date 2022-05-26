import React from "react";

import "./page-change-notification.scss";

export const PageChangeNotificationStartTimeout = 500;
export const PageChangeNotificationErrorTimeout = 3000;

interface IPageChangeNotificationStarted {
  state: "started";
}
interface IPageChangeNotificationErrored {
  state: "errored";
  message: string;
}
export type IPageChangeNotification = IPageChangeNotificationStarted | IPageChangeNotificationErrored;

interface IProps {
  pageChangeNotification: IPageChangeNotification | undefined;
}

export class PageChangeNotification extends React.PureComponent<IProps> {
  render() {
    if (this.props.pageChangeNotification) {
      switch (this.props.pageChangeNotification.state) {
        case "started":
          return (
            <div className="page-change-notification" data-cy="page-change-notification">
              Please wait, your work is being saved...
            </div>
          );

        case "errored":
          return (
            <div className="page-change-notification page-change-notification-errored" data-cy="page-change-notification">
              {this.props.pageChangeNotification.message}
            </div>
          );
      }
    }

    return null;
  }
}
