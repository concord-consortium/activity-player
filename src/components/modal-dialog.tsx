import React from "react";
import Modal from "react-modal";

import "./modal-dialog.scss";

interface IProps {
  title?: string;
  label: string;
  setShowModal: (show: boolean) => void;
  showModal: boolean;
}

Modal.setAppElement("#app");

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
        <div className="header">{title || "Alert"}</div>
        <div>{label}</div>
        <div className="footer">
          <button onClick={handleClose}>Close</button>
        </div>
      </Modal>
    );
  }
}
