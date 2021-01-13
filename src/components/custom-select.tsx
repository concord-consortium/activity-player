import React from "react";
import ArrowIcon from "../assets/svg-icons/arrow-icon.svg";
import CheckIcon from "../assets/svg-icons/check-icon.svg";
import { SvgIcon } from "../utilities/svg-icon";

import "./custom-select.scss";

interface IProps {
  items: string[];
  value?: string;
  onSelectItem?: (value: string) => void;
  HeaderIcon?: SvgIcon;
  isDisabled?: boolean;
}

interface IState {
  value: string;
  showList: boolean;
}

export class CustomSelect extends React.PureComponent<IProps, IState> {
  private divRef = React.createRef<HTMLDivElement>();
  constructor(props: IProps) {
    super(props);
    this.state = {
      value: props.value || props.items[0],
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
    const { items, HeaderIcon, isDisabled, value } = this.props;
    const currentValue = value || this.state.value;
    const currentItem = items.find(i => i === currentValue);
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
    const { items, value } = this.props;
    const currentValue = value || this.state.value;
    return (
      <div className="list-container">
        <div className={`list ${(this.state.showList ?"show" : "")}`} data-cy="custom-select-list">
          { items?.map((item: string, i: number) => {
            const currentClass = currentValue === item ? "selected" : "";
            return (
              <div
                key={`item ${i}`}
                className={`list-item ${currentClass}`}
                onClick={this.handleChange(item)}
                data-cy={`list-item-${item.toLowerCase().replace(" ", "-")}`}
              >
                { <CheckIcon className={`check ${currentClass}`} /> }
                <div className="label">{item}</div>
              </div>
            );})
          }
        </div>
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

  private handleChange = (value: string) => () => {
    this.props.onSelectItem?.(value);
    this.setState({
      value,
      showList: false
    });
  }
}
