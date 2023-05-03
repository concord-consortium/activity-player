import React from "react";
import Modal from "react-modal";

import "./modal-dialog.scss";

interface IProps {
  title?: string;
  label: string;
  onClose: () => void;
  showModal: boolean;
}

export class ModalDialog extends React.PureComponent <IProps> {
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
        <div className="modal-header" data-cy="modal-dialog-header">{title || "Alert"}</div>
        <div data-cy="modal-dialog-label">{label}</div>
        <div className="modal-footer">
          <button onClick={handleClose} data-cy="modal-dialog-close">Close</button>
        </div>
      </Modal>
    );
  }
}
