import React from "react";
import { DynamicTextContext, DynamicTextInterface } from "@concord-consortium/dynamic-text";

export const dynamicTextTester: DynamicTextInterface = {
  registerComponent: jest.fn(),
  unregisterComponent: jest.fn(),
  selectComponent: jest.fn()
};

export const DynamicTextTester: React.FC = ({children}) => {
  return (
    <DynamicTextContext.Provider value={dynamicTextTester}>
      {children}
    </DynamicTextContext.Provider>
  );
};
