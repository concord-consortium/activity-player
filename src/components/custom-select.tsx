import React from "react";
import ArrowIcon from "../assets/svg-icons/arrow-icon.svg";
import CheckIcon from "../assets/svg-icons/check-icon.svg";
import { SvgIcon } from "../utilities/svg-icon";

import "./custom-select.scss";

interface IProps {
  items: string[];
  onSelectItem?: (value: string) => void;
  HeaderIcon?: SvgIcon;
  isDisabled?: boolean;
}

interface IState {
  current: string;
  showList: boolean;
}

export class CustomSelect extends React.PureComponent<IProps, IState> {
  private divRef = React.createRef<HTMLDivElement>();
  constructor(props: IProps) {
    super(props);
    this.state = {
      current: props.items[0],
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
      <div className="custom-select" ref={this.divRef}>
        { this.renderHeader() }
        { this.renderList() }
      </div>
    );
  }

  private renderHeader = () => {
    const { items, HeaderIcon, isDisabled } = this.props;
    const currentItem = items.find(i => i === this.state.current);
    const showListClass = this.state.showList ? "show-list" : "";
    const disabled = isDisabled ? "disabled" : "";
    return (
      <div className={`header ${showListClass} ${disabled}`} data-cy="custom-select-header"
            onClick={this.handleHeaderClick} tabIndex={0}>
        { HeaderIcon && <HeaderIcon className={`icon ${showListClass}`} /> }
        <div className="current">{currentItem && currentItem}</div>
        { <ArrowIcon className={`arrow ${showListClass} ${disabled}`} /> }
      </div>
    );
  }

  private renderList = () => {
    const { items } = this.props;
    return (
      <div className={`list ${(this.state.showList ?"show" : "")}`} data-cy="custom-select-list">
        { items?.map((item: string, i: number) => {
          const currentClass = this.state.current === item ? "selected" : "";
          return (
            <div
              key={`item ${i}`}
              className={`list-item ${currentClass}`}
              onClick={this.handleListClick(item)}
              data-cy={`list-item-${item.toLowerCase().replace(" ", "-")}`}
            >
              { <CheckIcon className={`check ${currentClass}`} /> }
              <div>{item}</div>
            </div>
          );
        }) }
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
    this.setState(state => ({ showList: !state.showList }));
  }

  private handleListClick = (current: string) => () => {
    this.props.onSelectItem?.(current);
    this.setState({
      current,
      showList: false
    });
  }
}
