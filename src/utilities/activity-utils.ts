import { Page, Activity, EmbeddableWrapper } from "../types";
import { SidebarConfiguration } from "../components/page-sidebar/sidebar-wrapper";
import { isQuestion as isEmbeddableQuestion } from "./embeddable-utils";
import { runningInCypress } from "./cypress";

export enum ActivityLayouts {
  MultiplePages = 0,
  SinglePage = 1,
}

export enum PageLayouts {
  FullWidth = "l-full-width",
  Responsive = "l-responsive",
  SixtyForty = "l-6040",
  FortySixty = "r-4060",
}

export enum EmbeddableSections {
  Interactive = "interactive_box",
  Introduction = "header_block",
  InfoAssessment = "", // stored as null in JSON
}

export interface VisibleEmbeddables {
  interactiveBox: EmbeddableWrapper[],
  headerBlock: EmbeddableWrapper[],
  infoAssessment: EmbeddableWrapper[],
}

export const isQuestion = (embeddableWrapper: EmbeddableWrapper) => isEmbeddableQuestion(embeddableWrapper.embeddable);

export interface PageSectionQuestionCount {
  Header: number;
  InfoAssessment: number;
  InteractiveBlock: number;
}

export const isEmbeddableSectionHidden = (page: Page, section: string | null) => {
  const isSectionHidden = ((section === EmbeddableSections.Introduction && !page.show_header)
    || (section === EmbeddableSections.Interactive && !page.show_interactive)
    || (!section && !page.show_info_assessment));
  return isSectionHidden;
};

export const getVisibleEmbeddablesOnPage = (page: Page) => {
  if(page.is_hidden) {
    return { interactiveBox: [], headerBlock: [], infoAssessment: [] };
  }
  const headerEmbeddables = isEmbeddableSectionHidden(page, EmbeddableSections.Introduction)
    ? []
    : page.embeddables.filter((e: any) => e.section === EmbeddableSections.Introduction && isVisibleEmbeddable(e));
  const interactiveEmbeddables = isEmbeddableSectionHidden(page, EmbeddableSections.Interactive)
    ? []
    : page.embeddables.filter((e: any) => e.section === EmbeddableSections.Interactive && isVisibleEmbeddable(e));
  const infoAssessEmbeddables = isEmbeddableSectionHidden(page, null)
    ? []
    : page.embeddables.filter((e: any) => (e.section !== EmbeddableSections.Interactive && e.section !== EmbeddableSections.Introduction && isVisibleEmbeddable(e)));

  return { interactiveBox: interactiveEmbeddables, headerBlock: headerEmbeddables, infoAssessment: infoAssessEmbeddables };
};

function isVisibleEmbeddable(e: EmbeddableWrapper) {
  return !e.embeddable.is_hidden && !e.embeddable.embeddable_ref_id && !isEmbeddableSideTip(e);
}

export const isEmbeddableSideTip = (e: EmbeddableWrapper) => {
  return (e.embeddable.type === "Embeddable::EmbeddablePlugin" && e.embeddable.plugin?.component_label === "sideTip");
};

export const getPageSideTipEmbeddables = (activity: Activity, currentPage: Page) => {
  if (activity.layout === ActivityLayouts.SinglePage) {
    const sidetips: EmbeddableWrapper[] = [];
    for (let page = 0; page < activity.pages.length - 1; page++) {
      for (let embeddableNum = 0; embeddableNum < activity.pages[page].embeddables.length; embeddableNum++) {
        const embeddableWrapper = activity.pages[page].embeddables[embeddableNum];
        if (isEmbeddableSideTip(embeddableWrapper)) {
          sidetips.push(embeddableWrapper);
        }
      }
    }
    return sidetips;
  } else {
    return currentPage.embeddables.filter((e: any) => isEmbeddableSideTip(e));
  }
};

export const getPageSideBars = (activity: Activity, currentPage: Page) => {
  const sidebars: SidebarConfiguration[] = activity.layout === ActivityLayouts.SinglePage
    ? activity.pages.filter((page) => page.show_sidebar).map((page) => (
        {content: page.sidebar, title: page.sidebar_title }
      ))
    : currentPage.show_sidebar? [{ content: currentPage.sidebar, title: currentPage.sidebar_title }]: [];
  return sidebars;
};

export const getPageSectionQuestionCount = (page: Page) => {
  const pageSectionQuestionCount: PageSectionQuestionCount = { Header: 0, InfoAssessment: 0, InteractiveBlock: 0 };
  for (let embeddableNum = 0; embeddableNum < page.embeddables.length; embeddableNum++) {
    const embeddableWrapper = page.embeddables[embeddableNum];
    if (isQuestion(embeddableWrapper) && !embeddableWrapper.embeddable.is_hidden) {
      if (embeddableWrapper.section === EmbeddableSections.Introduction && !isEmbeddableSectionHidden(page, embeddableWrapper.section)) {
        pageSectionQuestionCount.Header++;
      } else if (!embeddableWrapper.section && !isEmbeddableSectionHidden(page, embeddableWrapper.section)) {
        pageSectionQuestionCount.InfoAssessment++;
      } else if (embeddableWrapper.section === EmbeddableSections.Interactive && !isEmbeddableSectionHidden(page, embeddableWrapper.section)) {
        pageSectionQuestionCount.InteractiveBlock++;
      }
    }
  }
  return pageSectionQuestionCount;
};

export const numQuestionsOnPreviousPages = (currentPage: number, activity: Activity) => {
  let numQuestions = 0;
  for (let page = 0; page < currentPage - 1; page++) {
    if (!activity.pages[page].is_hidden) {
      for (let embeddableNum = 0; embeddableNum < activity.pages[page].embeddables.length; embeddableNum++) {
        const embeddableWrapper = activity.pages[page].embeddables[embeddableNum];
        if (isQuestion(embeddableWrapper) && !embeddableWrapper.embeddable.is_hidden && !isEmbeddableSectionHidden(activity.pages[page], embeddableWrapper.section)) {
          numQuestions++;
        }
      }
    }
  }
  return numQuestions;
};

export const enableReportButton = (activity: Activity) => {
  const hasCompletionPage = activity.pages.find((page: any) => page.is_completion);
  return !hasCompletionPage && activity.student_report_enabled;
};

export const getLinkedPluginEmbeddable = (page: Page, id: string) => {
  const linkedPluginEmbeddable = page.embeddables.find((e: EmbeddableWrapper) => e.embeddable.embeddable_ref_id === id);
  return linkedPluginEmbeddable?.embeddable.type === "Embeddable::EmbeddablePlugin" ? linkedPluginEmbeddable.embeddable : undefined;
};

export const setAppBackgroundImage = (backgroundImageUrl?: string) => {
  const gradient = "linear-gradient(to bottom, #fff, rgba(255,255,255,0), rgba(255,255,255,0))";
  const el = document.querySelector(".app") as HTMLElement;
  el?.style.setProperty("background-image", backgroundImageUrl || gradient);
};

export const setDocumentTitle = (activity: Activity | undefined, pageNumber: number) => {
  if (activity) {
    document.title = pageNumber === 0
      ? activity.name
      : `Page ${pageNumber} ${activity.pages[pageNumber - 1].name || activity.name}`;
  }
};

export const getPagePositionFromQueryValue = (activity: Activity, pageQueryValue = "0"): number => {
  const pageId = pageQueryValue.startsWith("page_") ? parseInt(pageQueryValue.split("_")[1], 10) : NaN;

  if (!isNaN(pageId)) {
    for (const page of activity.pages) {
      if (page.id === pageId) {
        return page.position;
      }
    }

    // default to index page when id not found
    return 0;
  }

  // page should be in the range [0, <number of pages>].
  // note that page is 1 based for the actual pages in the activity.
  return Math.max(0, Math.min((parseInt(pageQueryValue, 10) || 0), activity.pages.length));
};

// Look for Json structures (array, object) in value
export const walkObject = (activityNode: any, stringCallback: (s: string, key?: string) => string) => {

  const tryToWalkJsonString = (key:string) => {
    const jsonRegex = /^\s*[{[]/;
    const stringValue = activityNode[key];
    if(jsonRegex.test(stringValue)) {
      try {
        const jsonData = JSON.parse(activityNode[key]);
        walkObject(jsonData, stringCallback);
        activityNode[key] = JSON.stringify(jsonData);
        return true;
      } catch (e) {} // eslint-disable-line no-empty
    }
    return false;
  };

  if (!activityNode) {
    return;
  }
  if (activityNode instanceof Array) {
    for (const i in activityNode) {
      walkObject(activityNode[i], stringCallback);
    }
  } else if (typeof activityNode === "object" ) {
    Object.keys(activityNode).forEach(key => {
      switch (typeof activityNode[key]) {
        case "string":
          if(tryToWalkJsonString(key)) { break; }
          // Its just a plain string:
          activityNode[key] = stringCallback(activityNode[key], key);
          break;
        case "object":
          walkObject(activityNode[key], stringCallback);
          break;
      }
    });
  } else if (typeof activityNode === "string") {
    if(!tryToWalkJsonString(activityNode)) {
      activityNode = stringCallback(activityNode);
    }
  }
};

export const rewriteModelsResourcesUrl = (oldUrl: string) => {
  const httpRegex = /https?:\/\//;
  if (httpRegex.test(oldUrl)) {
    const serverRewrite = oldUrl
      .replace(/https?:\/\/models-resources\.concord\.org/, "models-resources")
      .replace(/https?:\/\/models-resources\.s3\.amazonaws\.com/, "models-resources");

    // NP: 2021-03-29 S3 resources without terminal slashes seem to fail. regexr.com/5pkc0
    // SC: 2021-04-02 Only do this if they have been modified to go through the proxy
    if (serverRewrite !== oldUrl) {
      const missingSlashRegex = /\/[^./"]+$/; // URLS with extensions are fine eg *.png
      if(missingSlashRegex.test(serverRewrite)) {
        return `${serverRewrite}/`; // Add a slash to URLs missing them.
      }
    }
    return serverRewrite;
  }
  return oldUrl;
};

export const processIframeUrls = (activity: Activity, stringCallback: (s: string) => string) => {
  activity.pages.forEach(page => {
    page.embeddables.forEach(embeddableWrapper => {
      const embeddable = embeddableWrapper.embeddable;
      if (embeddable.type === "ManagedInteractive" && embeddable?.library_interactive?.data) {
        const data = embeddable.library_interactive.data;
        data.base_url = stringCallback(data.base_url);
      }
      if (embeddable.type === "MwInteractive" && embeddable.url) {
        embeddable.url = stringCallback(embeddable.url);
      }
    });
  });
};

export const rewriteProxiableIframeUrls = (activity: Activity) => {
  // do not rewrite urls when running in Cypress, otherwise the sample activity iframes do not load causing timeouts
  if (runningInCypress) { return activity;}

  processIframeUrls(activity, rewriteModelsResourcesUrl);

  return activity;
};

export const isExternalOrModelsResourcesUrl = (url: string) => /^(\s*https?:\/\/|models-resources\/)/.test(url);

export const removeDuplicateUrls = (urls: string[]) => urls.filter((url, index) => urls.indexOf(url) === index);

export const matchAllFirstGroup = (stringToSearch: string, regExp: RegExp): string[] => {
  const results: string[] = [];
  let match;

  while ((match = regExp.exec(stringToSearch)) !== null) {
    results.push(match[1]);
  }
  return results;
};


export const getUrlsInString = (stringToSearch: string): string[] => {
  return matchAllFirstGroup(stringToSearch, /"(https?:\/\/[^"]*)"/g);
};

// Find nonCSS assets
// These are heuristics based on our limited set of files
export const getAssetsInHtml = (htmlString: string): string[] => {

  // <script src="../video-player/assets/index.4625e4716a2dfe8f0462.js"
  const scriptAssets = matchAllFirstGroup(htmlString, /<script src="([^"]*)"/g);

  // import-drawing "./ak-base-map-with-rose.png"
  // Note the use of the m flag so we are using multi-line mode
  const netlogoImports = matchAllFirstGroup(htmlString, /^\s*import-drawing\s+"([^"]*)"/gm);

  // fetch:url-async ("https://s3.amazonaws.com/cc-project-resources/precipitatingchange/images-2021/ak-w-cities.png")
  // Note the use of the m flag so we are using multi-line mode
  const netlogoFetches = matchAllFirstGroup(htmlString, /^\s*fetch:url-async\s*\(\s*"([^"]*)"/gm);

  return scriptAssets.concat(netlogoImports).concat(netlogoFetches);
};

export const getCssLinksInHtml = (htmlString: string): string[] => {
  // <link href="../video-player/assets/index.4625e4716a2dfe8f0462.css"
  // <link href="https://fonts.googleapis.com/css?family=Lato"
  return matchAllFirstGroup(htmlString, /<link href="([^"]*)"/g);
};

export const getAllUrlsInActivity = async (activity: Activity, urls: string[] = []) => {
  const addExternalUrls = (object: any) => {
    walkObject(object, (s) => {
      if (isExternalOrModelsResourcesUrl(s)) {
        urls.push(s);
      }

      // Warning if there are links in the content to other pages this is going to
      // pick them up. However for offline content we wouldn't want these links
      // anyhow
      const urlsInString = getUrlsInString(s);
      if (urlsInString.length > 0) {
        urls.push(...urlsInString);
      }
      return s;
    });
  };

  addExternalUrls(activity);

  // cache the glossary urls
  const glossaryPlugin = activity.plugins.find(plugin => plugin.approved_script_label === "glossary");
  if (glossaryPlugin) {
    try {
      const authorData = JSON.parse(glossaryPlugin.author_data);
      if (authorData?.s3Url) {
        const response = await fetch(authorData.s3Url);
        const glossaryJson = await response.json();
        addExternalUrls(glossaryJson);
      }
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error("Error caching glossary urls:", e);
    }
  }

  // cache basic references from proxied iframes
  // collect the urls
  const proxiedIframeUrls: string[] = [];
  processIframeUrls(activity, (iframeUrl) => {
    // The content should already have been processed to replace proxiable urls
    // currently those urls will always start with models-resources/
    if (/^models-resources\//.test(iframeUrl)) {
      const path = iframeUrl.replace("models-resources/", "");
      const actualUrl = `https://models-resources.concord.org/${path}`;
      proxiedIframeUrls.push(actualUrl);
    }

    // return the url because we don't want to modify the content
    return iframeUrl;
  });

  const uniqueIframeUrls = removeDuplicateUrls(proxiedIframeUrls);

  const cssLinksToFetch: string[] = [];

  for (const iframeUrl of uniqueIframeUrls) {
    const response = await fetch(iframeUrl);
    const body = await response.text();

    // look for specific items in the html
    // this approach was tested with our current content and seems to work
    const assets = getAssetsInHtml(body);
    const cssLinks = getCssLinksInHtml(body);
    assets.concat(cssLinks).forEach(asset => {
      // construct an absolute url based on the iframeURl
      // note this won't handle baseUrl in the html, but this is just a
      // a quick way to find assets from our built interactives

      if (/^https?:\/\//.test(asset)) {
        // If the asset is absolute it will not be proxied even if it is in
        // models resources, this is because we aren't rewriting urls in the iframes
        urls.push(asset);
      } else {
        // If the asset is relative then it will be proxied because the iframe
        // is proxied
        // Because we constructed the iframeUrl above we know it will always start
        // with the fixed string https://models-resources.concord.org
        const assetUrl = new URL(asset, iframeUrl);
        const relativeUrl = assetUrl.href.replace("https://models-resources.concord.org","models-resources");
        urls.push(relativeUrl);
      }
    });

    // look at the css for urls too, this might be a problem
    cssLinks.forEach(cssLink => {
      // resolve any relaive urls
      const linkUrl = new URL(cssLink, iframeUrl);
      cssLinksToFetch.push(linkUrl.href);
    });
  }

  // This might not be worth it. It is to pick up images or fonts referenced by css
  // and this is mainly need for google fonts. However google changes its the css
  // reerencing these font faces regularly, so we can't safely cache this using
  // our current approach
  const uniqueCssLinksToFetch = removeDuplicateUrls(cssLinksToFetch);
  for (const cssLink of uniqueCssLinksToFetch) {
    console.log("fetching: ", cssLink);
    const response = await fetch(cssLink);
    const body = await response.text();

    // match url(https://fonts.gstatic.com/s/lato/v17/S6uyw4BMUTPHjx4wXiWtFCc.woff2)
    // NOTE there are many other types of urls that we aren't matching here
    const cssUrls = matchAllFirstGroup(body, /url\((https:\/\/[^)'"]*)\)/g);

    // NOTE we are only matching absolute urls so we don't need to resolve them
    urls.push(...cssUrls);
  }

  // remove duplicate urls
  return removeDuplicateUrls(urls);
};

export const orderedQuestionsOnPage = (page:Page) => {
  const embeddables = getVisibleEmbeddablesOnPage(page);
  let questions = embeddables.headerBlock.filter( (e) => isQuestion(e));
  questions = questions.concat(embeddables.infoAssessment.filter( (e) => isQuestion(e)));
  questions = questions.concat(embeddables.interactiveBox.filter( (e) => isQuestion(e)));
  return questions;
};

export const isNotSampleActivityUrl = (url: string) => /https?:\/\//.test(url) || /^offline-activities\//.test(url);
