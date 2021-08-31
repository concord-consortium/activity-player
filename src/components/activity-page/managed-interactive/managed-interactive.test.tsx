import { Credentials, Resource } from "@concord-consortium/token-service";
import { act, configure, render, screen } from "@testing-library/react";
import React from "react";
import { ManagedInteractive } from "./managed-interactive";
import { Embeddable } from "../../../types";
import { IAttachmentUrlRequest } from "@concord-consortium/lara-interactive-api";

configure({ testIdAttribute: "data-cy" });

const mockRawPortalJWT = "rawPortalJWT";
const mockRawFirebaseJWT = "rawFirebaseJWT";
const mockFirebaseAppName = jest.fn(() => "report-service-dev");
const mockFirebaseJwtRejectMessage = "No JWT for you!";
jest.mock("../../../portal-api", () => (
  {
    ...jest.requireActual("../../../portal-api"),
    firebaseAppName: () => mockFirebaseAppName(),
    getFirebaseJWT: (basePortalUrl: string, rawPortalJWT: string) => {
      if (rawPortalJWT === mockRawPortalJWT) {
        return Promise.resolve([mockRawFirebaseJWT]);
      }
      throw new Error(mockFirebaseJwtRejectMessage);
    }
  }
));

const mockFolderId = "folder-id";
const mockResourceType = "s3Folder";
const mockResourceBucket = "bucket";
const mockResourcePublicPath = "public-path";
const mockResource: Resource = {
    id: mockFolderId,
    name: "folder-name",
    type: mockResourceType,
    description: "description",
    tool: "attachments",
    bucket: mockResourceBucket,
    folder: "folder",
    region: "region",
    publicPath: mockResourcePublicPath,
    publicUrl: "public-url"
};
const mockGetResource = jest.fn((resourceId: string) => {
  const resource = { ...mockResource, id: resourceId };
  return Promise.resolve<Resource>(resource);
});
const mockCreateResource = jest.fn((interactiveId: string) => {
  return Promise.resolve<Resource>(mockResource);
});
const mockAccessKeyId = "access-key-id";
const mockExpiration = new Date();
const mockSecretAccessKey = "secret-access-key";
const mockSessionToken = "session-token";
const mockCredentials: Credentials = {
  accessKeyId: mockAccessKeyId,
  expiration: mockExpiration,
  secretAccessKey: mockSecretAccessKey,
  sessionToken: mockSessionToken
};
const mockGetCredentials = jest.fn(() => mockCredentials);
const mockReadWriteToken = "read-write-token";
const mockGetReadWriteToken = jest.fn(() => mockReadWriteToken);
const mockGetPublicS3Path = jest.fn(() => mockResourcePublicPath);
jest.mock("@concord-consortium/token-service", () => ({
  TokenServiceClient: jest.fn(() => ({
    getResource: mockGetResource,
    createResource: mockCreateResource,
    getCredentials: mockGetCredentials,
    getReadWriteToken: mockGetReadWriteToken,
    getPublicS3Path: mockGetPublicS3Path
  }))
}));

const mockHandleGetAttachmentUrl = jest.fn();
jest.mock("@concord-consortium/interactive-api-host", () => ({
  handleGetAttachmentUrl: (...args: any) => mockHandleGetAttachmentUrl(...args)
}));

const mockWatchAnswer = jest.fn((id: string, callback: (answer: any) => void) => callback({ meta: {} }));
jest.mock("../../../firebase-db", () => ({
  watchAnswer: (id: string, callback: (answer: any) => void) => mockWatchAnswer(id, callback)
}));

const mockHandleGetFirebaseJWT = jest.fn();
jest.mock("../../../portal-utils", () => ({
  handleGetFirebaseJWT: (...args: any) => mockHandleGetFirebaseJWT(...args)
}));

const mockPost = jest.fn();
const mockListeners: Record<string, (data?: any) => void> = {};
const mockAddListener = jest.fn((message: string, callback: (data?: any) => void) => {
  mockListeners[message] = callback;
});
const dispatchMessageFromChild = (message: string, data: any) => {
  const listener = mockListeners[message];
  listener?.(data);
};
const mockDisconnect = jest.fn();
jest.mock("iframe-phone", () => ({
  ParentEndpoint: jest.fn((targetIframe, afterConnectedCallback) => {
    // setTimeout allows phone initialization to complete
    setTimeout(() => afterConnectedCallback());
    return {
      post: mockPost,
      addListener: mockAddListener,
      disconnect: mockDisconnect
    };
  })
}));

const mockSetSupportedFeatures = jest.fn();
const mockSetSendCustomMessage = jest.fn();
const mockSetNavigation = jest.fn();

describe("ManagedInteractive component", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders component", async () => {
    const sampleEmbeddable: Embeddable = {
      name: "mc question",
      url_fragment: null,
      authored_state: "{\"version\":1,\"questionType\":\"multiple_choice\",\"multipleAnswers\":false,\"layout\":\"vertical\",\"choices\":[{\"id\":\"1\",\"content\":\"Choice A\",\"correct\":false},{\"id\":\"2\",\"content\":\"Choice B\",\"correct\":false},{\"id\":\"3\",\"content\":\"Choice C\",\"correct\":false}],\"prompt\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>\",\"hint\":\"<p>this is a hint</p>\"}",
      is_hidden: false,
      is_full_width: true,
      show_in_featured_question_report: true,
      inherit_aspect_ratio_method: true,
      custom_aspect_ratio_method: "DEFAULT",
      inherit_native_width: true,
      custom_native_width: 576,
      inherit_native_height: true,
      custom_native_height: 435,
      inherit_click_to_play: true,
      custom_click_to_play: false,
      inherit_full_window: true,
      custom_full_window: false,
      inherit_click_to_play_prompt: true,
      custom_click_to_play_prompt: null,
      inherit_image_url: true,
      custom_image_url: null,
      library_interactive: {
        hash: "af5d1860b2d4a037ae01e3d86931a30886fcb42d",
        data: {
          aspect_ratio_method: "DEFAULT",
          authoring_guidance: "",
          base_url: "https://models-resources.concord.org/question-interactives/branch/master/multiple-choice/",
          click_to_play: false,
          click_to_play_prompt: null,
          description: "A basic multiple choice interactive. This is pointing to the master branch and is in development so it shouldn't be used by real activities. \r\n",
          enable_learner_state: true,
          full_window: false,
          has_report_url: false,
          image_url: null,
          name: "Multiple Choice (master)",
          native_height: 435,
          native_width: 576,
          no_snapshots: false,
          show_delete_data_button: false,
          thumbnail_url: "",
          customizable: true,
          authorable: true
        }
      },
      type: "ManagedInteractive",
      ref_id: "314-ManagedInteractive"
    };
    render(<ManagedInteractive
              embeddable={sampleEmbeddable}
              questionNumber={1}
              setSupportedFeatures={mockSetSupportedFeatures}
              setSendCustomMessage={mockSetSendCustomMessage}
              setNavigation={mockSetNavigation}
              />);
    expect(screen.getByTestId("managed-interactive")).toBeInTheDocument();
    // allow initialization to complete
    jest.runAllTimers();

    act(() => {
      dispatchMessageFromChild("hint", "new-hint");
    });

    act(() => {
      dispatchMessageFromChild("supportedFeatures", { features: {} });
    });
    expect(mockSetSupportedFeatures).toHaveBeenCalled();

    act(() => {
      dispatchMessageFromChild("getFirebaseJWT", {});
    });
    expect(mockHandleGetFirebaseJWT).toHaveBeenCalled();

    act(() => {
      dispatchMessageFromChild("navigation", {});
    });
    expect(mockSetNavigation).toHaveBeenCalled();

    await act(async () => {
      const writeAttachmentRequest: IAttachmentUrlRequest = {
        requestId: 1,
        name: "attachment-name",
        operation: "write"
      };
      dispatchMessageFromChild("getAttachmentUrl", writeAttachmentRequest);
    });
    expect(mockHandleGetAttachmentUrl).toHaveBeenCalled();
  });
});
