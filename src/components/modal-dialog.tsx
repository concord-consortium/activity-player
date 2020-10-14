import React from "react";
import Modal from "react-modal";

import "./modal-dialog.scss";

interface IProps {
  title?: string;
  label: string;
  setShowModal: (show: boolean) => void;
  showModal: boolean;
}

export class ModalDialog extends React.PureComponent <IProps> {
  render() {
    const { title, label, showModal, setShowModal } = this.props;
    const handleClose = () => {
      setShowModal(false);
    };
    return (
      <Modal
        isOpen={showModal}
        contentLabel={title || "Alert"}
        className={"modal-dialog"}
      >
        <div className="header" data-cy="modal-dialog-header">{title || "Alert"}</div>
        <div data-cy="modal-dialog-label">{label}</div>
        <div className="footer">
          <button onClick={handleClose} data-cy="modal-dialog-close">Close</button>
        </div>
      </Modal>
    );
  }
}
