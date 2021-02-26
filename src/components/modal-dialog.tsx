import React, { Component } from "react";
import Modal from "react-modal";

import "./modal-dialog.scss";

/**
 * Modal can be a simple close or an OK / Cancel popup
 * @param label can set the text on the modal or be used as a prompt for any child element input
 * @param onAccept can be passed to change this to OK / Cancel style modal
 * @param onClose can simple "close the modal"
 * @param acceptButtonText change the text displayed for an accept condition (Save, OK, Accept, etc)
 * @param closeButtonText sets the close modal button text (Close, Cancel, etc)
 */
interface IProps {
  title?: string;
  label: string;
  onClose: () => void;
  showModal: boolean;
  onAccept?: (result: any) => void;
  acceptButtonText?: string;
  closeButtonText?: string;
}

export class ModalDialog extends Component <IProps> {
  render() {
    const { title, label, showModal, onClose, onAccept, acceptButtonText, closeButtonText} = this.props;
    const handleClose = () => {
      onClose();
    };
    const handleAccept = (result: any) => {
      if (onAccept) {
        onAccept(result);
      }
    };
    const okText = acceptButtonText ? acceptButtonText : "OK";
    const closeText = closeButtonText ? closeButtonText : (onAccept ? "Cancel" : "Close");
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
          {onAccept && <button onClick={handleAccept} data-cy="modal-dialog-accept">{okText}</button>}
          <button onClick={handleClose} data-cy="modal-dialog-close">{closeText}</button>
        </div>
      </Modal>
    );
  }
}
