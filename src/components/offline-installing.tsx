import React from "react";
import { ServiceWorkerStatus } from "../types";

interface IProps {
  serviceWorkerStatus: ServiceWorkerStatus;
}

interface IState {
}

export class OfflineInstalling extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
    };
  }

  render() {
    const { serviceWorkerStatus } = this.props;
    if (serviceWorkerStatus !== "activated") {
      return (
        <div>
          Activity Player Offline is installing.<br/>
          Current status is: {serviceWorkerStatus}
        </div>
      );
    } else {
      return (
        <div>
          Activity Player Offline is installed.<br/>
          Reload the page to continue.
        </div>
      );
    }
  }
}
