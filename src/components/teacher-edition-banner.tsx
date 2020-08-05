import React from "react";
import IconTeacherEdition from "../assets/svg-icons/icon-teacher-edition.svg";

import "./teacher-edition-banner.scss";

export const TeacherEditionBanner: React.FC = () => {
  return (
    <div className="teacher-edition-banner" data-cy="teacher-edition-banner">
      <IconTeacherEdition height={32} width={32}/>
      Teacher Edition
    </div>
  );
};
