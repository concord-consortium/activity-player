import React, { Component } from "react";
import Modal from "react-modal";

import "./modal-dialog.scss";

interface IProps {
  title?: string;
  label: string;
  onClose: () => void;
  showModal: boolean;
}

export class ModalDialog extends Component <IProps> {
  render() {
    const { title, label, showModal, onClose } = this.props;
    const handleClose = () => {
      onClose();
    };
    return (
      <Modal
        isOpen={showModal}
        contentLabel={title || "Alert"}
        className={"modal-dialog"}
      >
        <div className="header" data-cy="modal-dialog-header">{title || "Alert"}</div>
        <div data-cy="modal-dialog-label">{label}</div>
        {this.props.children}
        <div className="footer">
          <button onClick={handleClose} data-cy="modal-dialog-close">Close</button>
        </div>
      </Modal>
    );
  }
}
