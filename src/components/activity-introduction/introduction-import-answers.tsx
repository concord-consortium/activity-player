import React, { ChangeEvent } from "react";
import { getStorage } from "../../storage/storage-facade";

import "./introduction-import-answers.scss";

export class ImportAnswers extends React.PureComponent {

  private handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    event.persist();

    const getFileFromInput = (file: File): Promise<any> => {
      return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = function () { resolve(reader.result); };
        reader.readAsBinaryString(file); // here the file can be read in different way Text, DataUrl, ArrayBuffer
      });
    };

    if (event.target.files) {
      Array.from(event.target.files).forEach(file => {
        getFileFromInput(file)
          .then((binary) => {
            const storage = getStorage();
            storage.importStudentAnswersFromJSONFile(binary, file.name);
          }).catch(function (reason) {
            console.log(`Error during upload ${reason}`);
            event.target.value = ""; // to allow upload of same file if error occurs
          });
      });
    }
  }

  render() {
    return (
      <div className={"activity-import-upload"}>
        <div className="instructions">Import Work From File</div>
        <input accept=".json" id="activity-import" multiple={false} type="file"
                        onChange={this.handleImportFile} />
      </div>
    );
  }
}
