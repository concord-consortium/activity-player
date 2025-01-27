import React, { useContext } from "react";
import { QuestionMap } from "../types";

type QuestionInfo = {
  questionMap?: QuestionMap;
  questionToScrollTo?: string;
}

export const QuestionInfoContext = React.createContext<QuestionInfo>({});
QuestionInfoContext.displayName = "QuestionInfoContext";

export const useQuestionInfoContext = () => useContext(QuestionInfoContext);
