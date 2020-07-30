import mwLogo from "../assets/project-images/mw-logo.png";
import hasLogo from "../assets/project-images/has-logo.png";
import ritesLogo from "../assets/project-images/rites-logo.png";
import interactionsLogo from "../assets/project-images/interactions-logo.png";
import udlLogo from "../assets/project-images/udl-logo.png";
import itsiLogo from "../assets/project-images/itsi-logo.png";
import ngssLogo from "../assets/project-images/ngss-logo.png";
import graspLogo from "../assets/project-images/grasp-logo.png";
import pcLogo from "../assets/project-images/pc-logo.png";
import geniLogo from "../assets/project-images/geni-logo.png";
import cbioLogo from "../assets/project-images/connectedbio-logo.png";
import watersLogo from "../assets/project-images/waters-logo.png";
import codapLogo from "../assets/project-images/CODAP.png";
import ccFooterLogo from "../assets/concord-footer-logo.png";
//partner logos
import natgeoLogo from "../assets/partner-logos/natgeo-logo.png";
import ucscLogo from "../assets/partner-logos/ucsc-logo.png";
import nsfLogo from "../assets/partner-logos/nsf-logo.png";
import stemCreateLogo from "../assets/partner-logos/stem-create.png";
import ipumsLogo from "../assets/partner-logos/IPUMS-generic.png";
import ipumsUsaLogo from "../assets/partner-logos/IPUMS-logo-usa.png";
import msuWoodmarkLogo from "../assets/partner-logos/MSU-Wordmark-Green-CMYK.png";
import pennStateLogo from "../assets/partner-logos/PennStateLogo.png";
import argonneLogo from "../assets/partner-logos/argonne.png";
import millersvilleLogo from "../assets/partner-logos/millersville.png";
import uicLogo from "../assets/partner-logos/uic.png";

export interface ProjectType {
  id: number;
  name: string;
  headerLogo: any;
  url: string;
  footer: string;
  footerLogo: Array<any>;
}

export const DefaultFooter = "<p><span>Copyright &copy; 2020 <a href=\"https://concord.org\" title=\"The Concord Consortium\" rel=\"noreferrer\" target=\"_blank\">The Concord Consortium</a>. All rights reserved. This material is licensed under a <a href=\"https://creativecommons.org/licenses/by/4.0/\" rel=\"noreferrer\" target=\"_blank\">Creative Commons Attribution 4.0 License</a>. The software is licensed under <a href=\"http://opensource.org/licenses/BSD-2-Clause\" rel=\"noreferrer\" target=\"_blank\">Simplified BSD</a>, <a href=\"http://opensource.org/licenses/MIT\" rel=\"noreferrer\" target=\"_blank\">MIT</a> or <a href=\"http://opensource.org/licenses/Apache-2.0\" rel=\"noreferrer\" target=\"_blank\">Apache 2.0</a> licenses. Please provide attribution to the Concord Consortium and the URL <a href=\"https://concord.org/\" title=\"The Concord Consortium\" rel=\"noreferrer\" target=\"_blank\">http://concord.org</a>.</span></p>";

export const ProjectTypes: ProjectType[] = [
  {
    id: 1,
    name: "Molecular Workbench",
    headerLogo: mwLogo,
    url: "http://mw.concord.org/nextgen/",
    footer:
    "<p class=\"footer-txt\">This open educational resource from the Concord Consortium is free for use under the Creative Commons Attribution International license (<a title=\"\" href=\"http://creativecommons.org/licenses/by/4.0/\" target=\"\">CC-BY 4.0</a>) and powered by open source software packages. For info about our licenses, please see our <a title='' href='http://concord.org/software-license' target=''>licenses page</a>. When sharing this resource, include attribution to the Concord Consortium and links to <a title='' href='http://concord.org/' target=''>concord.org</a> and the CC-BY-4.0 license. Copyright &copy; 2017 The Concord Consortium.</p><p class='footer-txt'>This Next-Generation Molecular Workbench activity was developed with a grant from <a href='http://www.google.org/'>Google.org</a>. The original <a href='http://mw.concord.org/modeler/'>Classic Molecular Workbench</a> was supported by a series of grants from the <a href='http://nsf.gov/'>National Science Foundation</a>.</p><p class='footer-txt'>Questions? Comments? You can reach us at <a href='mailto:nextgenmw@concord.org'>nextgenmw@concord.org</a>.</p>",
    footerLogo: [],
  },
  {
    id: 2,
    name: "High Adventure Science",
    headerLogo: hasLogo,
    url: "http://has.concord.org/",
    footer:
    "<p>This <a title=\"High-Adventure Science | The Concord Consortium\" href=\"http://has.concord.org\">High-Adventure Science</a> activity was developed under a series of grants from the <a title=\"nsf.gov - National Science Foundation - US National Science Foundation (NSF)\" href=\"http://nsf.gov/\">National Science Foundation</a> (DRL-0929774, DRL-1220756 ) in partnership with the <a title=\"University of California, Santa Cruz\" href=\"http://www.ucsc.edu/\">University of California, Santa Cruz</a> and <a title=\"Teachers Homepage - National Geographic Education\" href=\"http://education.nationalgeographic.com/\">National Geographic Society</a>.</p><p>Copyright 2018 <a title=\"The Concord Consortium | Revolutionary digital learning for science, math and engineering\" href=\"http://concord.org/\">The Concord Consortium</a>. All rights reserved. This is licensed under a Creative Commons Attribution-NonCommercial-NoDerivs 3.0 Unported License. Please provide attribution to The Concord Consortium and the URL http://concord.org.</p><p>Questions? Comments? You can reach us at <a href=\"mailto:HAS@concord.org\">HAS@concord.org</a>.</p>",
    footerLogo: [ ccFooterLogo, natgeoLogo, ucscLogo, nsfLogo ],
  },
  {
    id: 3,
    name: "RITES",
    headerLogo: ritesLogo,
    url: "http://investigate.ritesproject.net/",
    footer: "",
    footerLogo: [],
  },
  {
    id: 4,
    name: "Interactions",
    headerLogo: interactionsLogo,
    url: "https://concord.org/our-work/research-projects/interactions/",
    footer: "<p>The Interactions Project materials are being developed and researched with funding from the National Science Foundation (DRL-1232388) in partnership with Michigan State University.</p><p>This open educational resource is free for use under the Creative Commons Attribution International license (<a title=\"CC BY-NC-SA 4.0\" href=\"https://creativecommons.org/licenses/by-nc-sa/4.0/\" target=\"_blank\" rel=\"noopener\">CC BY-NC-SA 4.0</a>) and powered by open source software packages. When sharing this resource, please include attribution to the Concord Consortium and the CREATE for STEM Institute at MSU, and the CC BY-NC-SA 4.0 license.&nbsp;</p><p>Questions? Comments? You can reach us at&nbsp;<a title=\"\" href=\"mailto:interactions@concord.org\" target=\"\">interactions@concord.org.</a></p>",
    footerLogo: [ ccFooterLogo, stemCreateLogo ],
  },
  {
    id: 5,
    name: "UDL",
    headerLogo: udlLogo,
    url: "https://learn.concord.org/udl",
    footer: "",
    footerLogo: [],
  },
  {
    id: 6,
    name: "ITSI",
    headerLogo: itsiLogo,
    url: "https://itsi.portal.concord.org/",
    footer: "<p><span>Copyright &copy; 2017 The Concord Consortium. All rights reserved. This activity is licensed under a Creative Commons Attribution 3.0 Unported License. The software is licensed under Simplified BSD , MIT or Apache 2.0 licenses. Please provide attribution to the Concord Consortium and the URL <a title=\"\" href=\"http://authoring.concord.org\" target=\"http://concord.org\">http://concord.org</a>.</span></p>",
    footerLogo: [],
  },
  {
    id: 7,
    name: "InquirySpace",
    headerLogo: undefined,
    url: "",
    footer: "<p>The <a title=\"The Concord Consortium: InquirySpace\" href=\"http://concord.org/inquiryspace\" target=\"\">InquirySpace</a>&nbsp;materials were developed and researched with funding from the <a title=\"National Science Foundation\" href=\"http://nsf.gov\" target=\"\">National Science Foundation</a> (IIS-1147621) in partnership with <a title=\"Northwestern University\" href=\"http://www.northwestern.edu/\" target=\"\">Northwestern University</a>.</p><p>This open educational resource from&nbsp;<a title=\"The Concord Consortium\" href=\"http://concord.org/\" target=\"\">The Concord Consortium</a>&nbsp;is free for use under the&nbsp;Creative Commons Attribution International license (<a title=\"\" href=\"http://creativecommons.org/licenses/by/4.0/\" target=\"\">CC-BY 4.0</a>) and powered by open source software packages. When sharing this resource, please include attribution to the Concord Consortium and links to <a title=\"\" href=\"http://concord.org\" target=\"\">concord.org</a>&nbsp;and the CC-BY-4.0 license (see&nbsp;<a title=\"\" href=\"http://concord.org/licenses\" target=\"\">licensing details</a>). Copyright 2017 The Concord Consortium.</p><p><br />Questions? Comments? You can reach us at <a href=\"mailto:inquiryspace@concord.org\">inquiryspace@concord.org</a>.</p>",
    footerLogo: [ ccFooterLogo, nsfLogo ],
  },
  {
    id: 8,
    name: "NGSS Assessments",
    headerLogo: ngssLogo,
    url: "http://nextgenscienceassessment.org/",
    footer: "<p style=\"font-size: 9pt;\"><a href=\"https://creativecommons.org/licenses/by-nc/3.0/us/\" target=\"blank\"><img style=\"float: left; padding-right: 15px; padding-top: 5px; padding-bottom: 5px;\" src=\"https://nextgenscience.wpengine.com/wp-content/uploads/2015/12/by-nc.png\" width=\"105px\" /></a>All content on our website, except for photos, logos and publications, is licensed under a <a title=\"\" href=\"https://creativecommons.org/licenses/by-nc/4.0/\" target=\"blank\">Creative Commons Attribution-NonCommercial 4.0 International license</a>. This license permits you to copy, distribute, and display such content so long as you attribute the Next Generation Science Assessment Project and do not use it commercially.</p><p style=\"font-size: 9pt; margin-top: 10px;\"><img class=\"logo\" style=\"float: left; padding-right: 15px;\" src=\"https://nextgenscience.wpengine.com/wp-content/uploads/2015/12/funder-v2.png\" /></p><div style=\"padding-top: 10px; font-size: 9pt;\"><em>Next Generation Science Assessment</em> is a collaboration among <a href=\"http://create4stem.msu.edu\" target=\"blank\">Michigan State University,</a>&nbsp;<a href=\"https://wested.org\" target=\"blank\">WestEd</a>, <a href=\"https://www.uic.edu/\" target=\"blank\">University of Illinois at Chicago</a>, and the <a href=\"http://concord.org/\" target=\"blank\">Concord Consortium</a>. Past partnership included work with SRI International. This work is supported by grants from the Gordon and Betty Moore Foundation (grant #4482) and the National Science Foundation (grants DRL-1316874, DRL-1316903, DRL-1316908, and DRL-1903103). Views expressed are not necessarily those of the funders.</div><p>&nbsp;</p><center><img src=\"https://ngss-assessment-resources.concord.org/footer-logos-ngsa-2018.png\" /></center><p>&nbsp;</p>",
    footerLogo: [],
  },
  {
    id: 9,
    name: "Default",
    headerLogo: undefined,
    url: "",
    footer: "",
    footerLogo: [],
  },
  {
    id: 10,
    name: "GRASP",
    headerLogo: graspLogo,
    url: "https://concord.org/our-work/research-projects/grasp/",
    footer: "",
    footerLogo: [],
  },
  {
    id: 11,
    name: "Precipitating Change",
    headerLogo: pcLogo,
    url: "",
    footer: "<p>This <a title=\"Precipitating Change | The Concord Consortium\" href=\"http://concord.org/precipitating-change\">Precipitating Change</a> activity was developed under a grant from the <a title=\"nsf.gov - National Science Foundation - US National Science Foundation (NSF)\" href=\"http://nsf.gov/\">National Science Foundation</a> (DRL-1640088) in partnership with <a title=\"Argonne National Laboratory\" href=\"https://www.anl.gov/\">Argonne National Laboratory</a>, <a title=\"Millersville University\" href=\"http://www.millersville.edu/\">Millersville University</a>, and the <a title=\"University of Illinois at Chicago\" href=\"http://www.uic.edu/\">University of Illinois at Chicago</a>.</p>",
    footerLogo: [ argonneLogo, millersvilleLogo, uicLogo ],
  },
  {
    id: 12,
    name: "Geniventure",
    headerLogo: geniLogo,
    url: "",
    footer: "<p>Copyright &copy; 2018 The Concord Consortium. This open educational resource is free for use under the Creative Commons Attribution International license (<a href=\"https://creativecommons.org/licenses/by/4.0/\" target=\"_blank\" rel=\"noopener\">CC BY 4.0</a>) and powered by open source software packages. When sharing this resource, please include attribution to the Concord Consortium and the URL <a href=\"http://concord.org\" target=\"_blank\" rel=\"noopener\">http://concord.org</a> and the CC-BY-4.0 license.</p>",
    footerLogo: [],
  },
  {
    id: 13,
    name: "ConnectedBio",
    headerLogo: cbioLogo,
    url: "",
    footer: "<p>Copyright &copy; 2020 The Concord Consortium. All rights reserved. This activity is licensed under a&nbsp;Creative Commons Attribution 3.0 Unported License. The software is licensed under&nbsp;Simplified BSD,&nbsp;MIT&nbsp;or&nbsp;Apache 2.0&nbsp;licenses. Please provide attribution to the Concord Consortium and the URL&nbsp;http://concord.org.</p><p>This ConnectedBio activity was developed with a grant from the National Science Foundation (DRL-1620910) in collaboration with Michigan State University.</p>",
    footerLogo: [],
  },
  {
    id: 14,
    name: "GeoHazard",
    headerLogo: undefined,
    url: "",
    footer: "",
    footerLogo: [],
  },
  {
    id: 15,
    name: "GEODE",
    headerLogo: undefined,
    url: "",
    footer: "<p>This <a title=\"GEODE Project\" href=\"http://concord.org/geode\" target=\"\">GEODE</a> activity was developed under a grant from the <a title=\"nsf.gov - National Science Foundation - US National Science Foundation (NSF)\" href=\"http://nsf.gov/\">National Science Foundation</a> (DRL-1621176) in partnership with <a title=\"Penn State\" href=\"http://www.psu.edu/\" target=\"\">Pennsylvania State University</a>.</p><p>Copyright 2018 <a title=\"The Concord Consortium | Revolutionary digital learning for science, math and engineering\" href=\"http://concord.org/\">The Concord Consortium</a>. All rights reserved. This is licensed under a <a href=\"https://creativecommons.org/licenses/by/4.0/\"> Creative Commons Attribution 4.0 International License</a>. Please provide attribution to The Concord Consortium and the URL http://concord.org.</p><p>Questions? Comments? You can reach us at <a title=\"\" href=\"mailto:GEODE@concord.org\" target=\"\">GEODE@concord.org</a>.</p>",
    footerLogo: [ ccFooterLogo, pennStateLogo, nsfLogo ],
  },
  {
    id: 16,
    name: "WATERS",
    headerLogo: watersLogo,
    url: "",
    footer: "",
    footerLogo: [],
  },
  {
    id: 17,
    name: "IPUMS",
    headerLogo: ipumsLogo,
    url: "https://www.terrapop.org/",
    footer: "<div style=\"text-align: center;\"><p>This open educational resource is free for use under the Creative Commons Attribution International license (<a title=\"CC BY 4.0\" href=\"https://creativecommons.org/licenses/by/4.0/\" target=\"\"><strong>CC BY 4.0</strong></a>) and powered by open source software packages. When sharing this resource, please include attribution to the Minnesota Population Center, the Concord Consortium, and the CC-BY-4.0 license.&nbsp;</p><p>&nbsp;</p><div style=\"text-align: center;\">Questions? Comments? You can reach us at&nbsp;<a title=\"\" href=\"mailto:ipums@umn.edu\" target=\"\">ipums@umn.edu</a>.</div>",
    footerLogo: [ ipumsUsaLogo ],
  },
  {
    id: 18,
    name: "CODAP",
    headerLogo: codapLogo,
    url: "https://concord.org/projects/codap",
    footer: "<p>The CODAP&nbsp;Project materials are being developed and researched with funding from the National Science Foundation (DRL-1435470).</p><p>Copyright 2017 The Concord Consortium. All rights reserved.</p>",
    footerLogo: [ nsfLogo ],
  },
  {
    id: 19,
    name: "SEPA",
    headerLogo: undefined,
    url: "http://learn.concord.org",
    footer: "<p>The SEPA Project materials are being developed and researched with funding from the National Institutes of Health in partnership with Michigan State University.</p><p>Copyright 2017 The Concord Consortium. All rights reserved.</p>",
    footerLogo: [ ccFooterLogo, msuWoodmarkLogo],
  },
  {
    id: 20,
    name: "Teaching Teamwork",
    headerLogo: undefined,
    url: "",
    footer: "<p>This <strong><a title=\"Teaching Teamwork\" href=\"http://concord.org/projects/teaching-teamwork\" target=\"\">Teaching Teamwork</a>&nbsp;</strong>activity was developed under a grant from the&nbsp;<a title=\"nsf.gov - National Science Foundation - US National Science Foundation (NSF)\" href=\"http://nsf.gov/\">National Science Foundation</a>&nbsp;(DUE-1400545).</p><p>Copyright 2017&nbsp;<strong><a title=\"The Concord Consortium | Revolutionary digital learning for science, math and engineering\" href=\"http://concord.org/\">The Concord Consortium</a>.</strong> All rights reserved.&nbsp;</p><p>Questions? Comments? You can reach us at&nbsp;<a title=\"Teaching-Teamwork@concord.org\" href=\"mailto:Teaching-Teamwork@concord.org\" target=\"\">Teaching-Teamwork@concord.org</a>.</p>",
    footerLogo: [],
  },
  {
    id: 21,
    name: "Building Models",
    headerLogo: undefined,
    url: "",
    footer: "<p>The <a title=\"Building Models\" href=\"http://concord.org/projects/building-models\" target=\"_blank\" rel=\"noopener\"><strong>Building Models</strong></a> materials were developed in partnership with the <strong>CREATE for STEM Institute</strong> at Michigan State University with funding from the National Science Foundation (grants DRL-1417809 and DRL-1417900).</p><p>This open educational resource is free for use under the Creative Commons Attribution International license (<a title=\"CC BY-NC-SA 4.0\" href=\"https://creativecommons.org/licenses/by-nc-sa/4.0/\" target=\"_blank\" rel=\"noopener\">CC BY-NC-SA 4.0</a>) and powered by open source software packages. When sharing this resource, please include attribution to the Concord Consortium and the CREATE for STEM Institute at MSU, and the CC BY-NC-SA 4.0 license (see <a title=\"licensing details\" href=\"http://concord.org/software-license\" target=\"_blank\" rel=\"noopener\">licensing details</a>).&nbsp;</p><p>Questions? Comments? You can reach us at <a href=\"mailto:building-models@concord.org\">building-models@concord.org.</a></p>",
    footerLogo: [ nsfLogo, ccFooterLogo, stemCreateLogo ],
  },
  {
    id: 22,
    name: "Measuring Collaboration",
    headerLogo: undefined,
    url: "",
    footer: "<p>This activity was developed under a grant from the&nbsp;<a title=\"nsf.gov - National Science Foundation - US National Science Foundation (NSF)\" href=\"http://nsf.gov/\">National Science Foundation</a>&nbsp;(DUE-1535224).</p>",
    footerLogo: [ nsfLogo ],
  },
  {
    id: 23,
    name: "Evolution Readiness",
    headerLogo: undefined,
    url: "",
    footer: "<p>This material is based upon work supported by the National Science Foundation under Grant No. DRL-0822213. Any opinions, findings, and conclusions or recommendations expressed in this material are those of the author(s) and do not necessarily reflect the views of the National Science Foundation.</p>",
    footerLogo: [],
  },
  {
    id: 24,
    name: "InSPECT",
    headerLogo: undefined,
    url: "",
    footer: "<p>These <a title=\"The Concord Consortium: InSPECT\" href=\"http://concord.org/inspect\" target=\"\">InSPECT</a>&nbsp;materials were developed and researched with funding from the&nbsp;<a title=\"National Science Foundation\" href=\"http://nsf.gov/\" target=\"\">National Science Foundation</a>&nbsp;(DRL-1640054).</p><p>This open educational resource from&nbsp;<a title=\"The Concord Consortium\" href=\"http://concord.org/\" target=\"\">The Concord Consortium</a>&nbsp;is free for use under the&nbsp;Creative Commons Attribution International license (<a title=\"\" href=\"http://creativecommons.org/licenses/by/4.0/\" target=\"\">CC-BY 4.0</a>) and powered by open source software packages. When sharing this resource, please include attribution to the Concord Consortium and links to&nbsp;<a title=\"\" href=\"http://concord.org/\" target=\"\">concord.org</a>&nbsp;and the CC-BY-4.0 license (see&nbsp;<a title=\"\" href=\"http://concord.org/licenses\" target=\"\">licensing details</a>). Copyright 2018 The Concord Consortium.</p><p><br />Questions? Comments? You can reach us at&nbsp;<a href=\"mailto:inspect@concord.org\">inspect@concord.org</a>.</p>",
    footerLogo: [ ccFooterLogo, nsfLogo ],
  },
  {
    id: 25,
    name: "CodeR4MATH",
    headerLogo: undefined,
    url: "",
    footer: "<p>Copyright &copy; 2020 <a href=\"https://concord.org/\">The Concord Consortium</a>. All rights reserved. This activity is licensed under a <a href=\"https://creativecommons.org/licenses/by/4.0/\"> Creative Commons Attribution 4.0 License </a>. The software is licensed under <a href=\"https://opensource.org/licenses/BSD-2-Clause\"> Simplified BSD </a>, <a href=\"https://opensource.org/licenses/MIT\">MIT</a> or <a href=\"https://opensource.org/licenses/Apache-2.0\">Apache 2.0</a> licenses. Please provide attribution to the Concord Consortium and the URL <a href=\"https://concord.org\">https://concord.org</a>.</p>",
    footerLogo: [],
  },
];
