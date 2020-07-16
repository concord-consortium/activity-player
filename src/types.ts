export type Mode = "runtime" | "authoring" | "report";

export interface IframePhone {
  post: (type: string, data: any) => void;
  addListener: (type: string, handler: (data: any) => void) => void;
  initialize: () => void;
  disconnect: () => void;
}
