import React, { ChangeEvent, Component } from "react";
// import Modal from "react-modal";
import {ModalDialog} from "./modal-dialog";
import {StudentInfo} from "../student-info";

import "./student-info-modal.scss";

interface IProps {
  studentInfo: StudentInfo;
  showModal: boolean;
  onClose: (newName?: string) => void;
}

interface IState {
  studentName: string;
}

export class StudentInfoModal extends Component <IProps, IState> {
  public constructor(props: IProps) {
    super(props);
    this.state = {
      studentName: this.props.studentInfo.name
    };
  }


  render() {
    const { studentInfo, showModal, onClose } = this.props;
    const changeName = (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (studentInfo.setName(value)) {
        this.setState({studentName: studentInfo.name});
      }
    };

    const _onSave = () => {
      onClose(this.state.studentName);
    };

    const _onClose = () => {
      onClose();
    };

    return (
      <ModalDialog
        label="Name:"
        showModal={showModal}
        onAccept={_onSave}
        onClose={_onClose}
        acceptButtonText="Save"
        closeButtonText="Cancel"
      >
        <input
          type="text"
          readOnly={!studentInfo.canChangeName()}
          value={this.state.studentName}
          onChange={changeName}/>
      </ModalDialog>
    );
  }
}
