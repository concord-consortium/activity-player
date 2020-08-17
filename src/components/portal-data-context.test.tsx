import React, { useContext } from "react";
import { render } from "@testing-library/react";
import { PortalDataContext } from "./portal-data-context";
import { IPortalData } from "../portal-api";

const fauxPortalData: IPortalData = {
  platformId: "https://hogwarts.edu",
  platformUserId: "123456",
  contextId: "potions1234",
  resourceLinkId: "654321",
  type: "authenticated",
  offering: {
    id: 654321,
    activityUrl: "https://hogwarts.edu/activity/654321",
    rubricUrl: ""
  },
  userType: "learner",
  database: {
    appName: "report-service-dev",
    sourceKey: "",
    rawFirebaseJWT: "rawFirebaseJWT"
  },
  toolId: "",
  resourceUrl: "",
  learnerKey: "",
  basePortalUrl: "https://hogwarts.edu",
  rawPortalJWT: "rawPortalJWT"
};

const PortalDataContextProvider: React.FC = ({ children }: { children: any }) => {
  return (
    <PortalDataContext.Provider value={fauxPortalData}>
      {children}
    </PortalDataContext.Provider>
  );
};

let consumedPortalData: IPortalData | undefined;

const PortalDataContextConsumer: React.FC = () => {
  consumedPortalData = useContext(PortalDataContext);
  return <div>PortalDataContextConsumer</div>;
};

describe("PortalDataContext", () => {

  it("contents should be accessible from useContext hook", () => {
    const { getByText } = render(
      <PortalDataContextProvider>
        <PortalDataContextConsumer/>
      </PortalDataContextProvider>
    );
    expect(getByText("PortalDataContextConsumer")).toBeDefined();
    expect(consumedPortalData).toEqual(fauxPortalData);
  });

});
