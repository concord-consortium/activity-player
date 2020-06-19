import React from "react";
import IconHamburger from "../../assets/svg-icons/icon-hamburger.svg";

import './nav-menu.scss';

interface IProps {
  activityList: string[];
}

interface IState {
  current: string;
  showList: boolean;
}

export class NavMenu extends React.PureComponent <IProps, IState> {
  private divRef = React.createRef<HTMLDivElement>();
  constructor(props: IProps) {
    super(props);
    this.state = {
      current: props.activityList[0],
      showList: false
    };
  }

  public componentDidMount() {
    document.addEventListener("mousedown", this.handleClick, false);
  }

  public componentWillUnmount() {
    document.removeEventListener("mousedown", this.handleClick, false);
  }

  public render() {
    return (
      <div className="nav-menu" ref={this.divRef} data-cy="nav-menu">
        { this.renderHeader() }
        { this.renderList() }
      </div>
    );
  }

  private renderHeader = () => {
    return (
      <div className="header" onClick={this.handleHeaderClick}>
        <div className="label">Menu</div>
        <IconHamburger
          width={18}
          height={18}
          fill={"white"}
        />
      </div>
    );
  }

  private renderList = () => {
    const { activityList } = this.props;
    return (
      <div className={`list ${(this.state.showList ? "show" : "")}`}>
        { activityList && activityList.map((item: string, i: number) => {
            const currentClass = this.state.current === item ? "selected" : "";
            return (
              <div
                key={`item ${i}`}
                className={`item ${currentClass}`}
                onClick={this.handleListClick(item)}
              >
                {item}
              </div>
            );
          })
        }
      </div>
    );
  }

  private handleClick = (e: MouseEvent) => {
    if (this.divRef.current && e.target && !this.divRef.current.contains(e.target as Node)) {
      this.setState({
        showList: false
      });
    }
  }

  private handleHeaderClick = () => {
    this.setState({
      showList: !this.state.showList
    });
  }

  private handleListClick = (current: string) => () => {
    this.setState({
      current,
      showList: false
    });
  }
}
