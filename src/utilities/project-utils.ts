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

export interface ProjectType {
  id: number;
  name: string;
  logo: any;
  url: string;
}

export const ProjectTypes: ProjectType[] = [
  {
    id: 1,
    name: "Molecular Workbench",
    logo: mwLogo,
    url: "http://mw.concord.org/nextgen/",
  },
  {
    id: 2,
    name: "High Adventure Science",
    logo: hasLogo,
    url: "http://has.concord.org/",
  },
  {
    id: 3,
    name: "RITES",
    logo: ritesLogo,
    url: "http://investigate.ritesproject.net/",
  },
  {
    id: 4,
    name: "Interactions",
    logo: interactionsLogo,
    url: "https://concord.org/our-work/research-projects/interactions/",
  },
  {
    id: 5,
    name: "UDL",
    logo: udlLogo,
    url: "https://learn.concord.org/udl",
  },
  {
    id: 6,
    name: "ITSI",
    logo: itsiLogo,
    url: "https://itsi.portal.concord.org/",
  },
  {
    id: 7,
    name: "InquirySpace",
    logo: undefined,
    url: "",
  },
  {
    id: 8,
    name: "NGSS Assessments",
    logo: ngssLogo,
    url: "http://nextgenscienceassessment.org/",
  },
  {
    id: 9,
    name: "Default",
    logo: undefined,
    url: "",
  },
  {
    id: 10,
    name: "GRASP",
    logo: graspLogo,
    url: "https://concord.org/our-work/research-projects/grasp/",
  },
  {
    id: 11,
    name: "Precipitating Change",
    logo: pcLogo,
    url: "",
  },
  {
    id: 12,
    name: "Geniventure",
    logo: geniLogo,
    url: "",
  },
  {
    id: 13,
    name: "ConnectedBio",
    logo: cbioLogo,
    url: "",
  },
  {
    id: 14,
    name: "GeoHazard",
    logo: undefined,
    url: "",
  },
  {
    id: 15,
    name: "GEODE",
    logo: undefined,
    url: "",
  },
  {
    id: 16,
    name: "WATERS",
    logo: watersLogo,
    url: "",
  },
];
