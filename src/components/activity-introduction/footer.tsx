import React from "react";

import "./footer.scss";

function Footer() {

  const concordURL = "https://concord.org/";
  const creativeCommonsURL = "https://creativecommons.org/licenses/by/4.0/";
  const openSourceBSDURL = "http://opensource.org/licenses/BSD-2-Clause";
  const openSourceMITURL = "http://opensource.org/licenses/MIT";
  const openSourceApacheURL = "http://opensource.org/licenses/Apache-2.0";

  const concordLink = <a href={concordURL} title="The Concord Consortium" rel="noreferrer" target="_blank">The Concord Consortium</a>;
  const concordLink2 = <a href={concordURL} title="The Concord Consortium" rel="noreferrer" target="_blank">http://concord.org</a>;
  const creativeCommonsLink = <a href={creativeCommonsURL} rel="noreferrer" target="_blank">Creative Commons Attribution 4.0 License</a>;
  const openSourceBSDLink = <a href={openSourceBSDURL} rel="noreferrer" target="_blank">Simplified BSD</a>;
  const openSourceMITLink = <a href={openSourceMITURL} rel="noreferrer" target="_blank">MIT</a>;
  const openSourceApacheLink = <a href={openSourceApacheURL} rel="noreferrer" target="_blank">Apache 2.0</a>;

  return (
    <div className="footer" data-cy="footer">
      <span>{"Copyright © 2020 "}</span>
      {concordLink}
      <span>{". All rights reserved. This material is licensed under a "}</span>
      {creativeCommonsLink}
      <span>{". The software is licensed under "}</span>
      {openSourceBSDLink}
      <span>{", "}</span>
      {openSourceMITLink}
      <span>{" or "}</span>
      {openSourceApacheLink}
      <span>{" licenses. Please provide attribution to the Concord Consortium and the URL "}</span>
      {concordLink2}
      <span>{"."}</span>
    </div>
  );
}

export default Footer;
