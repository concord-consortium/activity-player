# [LARA] Activity Player

This is a single page React and Typescript application intended to provide a platform for presenting "Lightweight" activities.

## Development

### Initial steps

1. Clone this repo and `cd` into it
2. Run `npm install` to pull dependencies
3. Run `npm start` to run `webpack-dev-server` in development mode with hot module replacement

### Building

If you want to build a local version run `npm build`, it will create the files in the `dist` folder.
You *do not* need to build to deploy the code, that is automatic.  See more info in the Deployment section below.

### Notes

1. Make sure if you are using Visual Studio Code that you use the workspace version of TypeScript.
   To ensure that you are open a TypeScript file in VSC and then click on the version number next to
   `TypeScript React` in the status bar and select 'Use Workspace Version' in the popup menu.
2. When coding, use 2 spaces for indentation.
3. SVG icons are imported directly into the project in src/assets/. SVGR is used to convert SVGs to React components which can be directly imported into other React components (attributes such as fill can be styled using CSS classes).

### Locally Testing Reports

The activity player uses the portal-report code base to display a report of the students work.
Testing this is complicated. Here is one approach:
- create an activity player activity in authoring.staging.concord.org
- publish it to learn.staging.concord.org
  - this is necessary to send the activity structure to the report-service
  - it will create a new resource in learn staging, but you aren't going to use or modify that one
  - this new resource can't be modified because then changes to the activity in LARA authoring won't be published correctly because LARA will be looking for a matching resource in learn.staging.concord.org
- find the new created resourced in learn staging using advanced search and copy the URL it should be something like:
  `https://activity-player.concord.org/branch/master/index.html?activity=https://authoring.staging.concord.org/api/v1/123.json`
- create a new resource in learn staging using: https://learn.staging.concord.org/eresource/new
- set the URL of this resource:
  - replace the `activity-player.concord.org` with `localhost:11000`
  - add a new parameter `portal-report=https://localhost:8081` (or whatever your local server for the portal-report is)
  - the new url will be something like:
  `https://localhost:11000?activity=https://authoring.staging.concord.org/api/v1/123.json&portal-report=https://localhost:8081`
- assign this resource to a class
- run the resource as a student in this class

## Deployment

Production releases to S3 are based on the contents of the /dist folder and are built automatically by GitHub Actions for each branch pushed to GitHub and each merge into production.

The production branch is deployed to https://activity-player.concord.org/.

Other branches are deployed to https://activity-player.concord.org/branch/<name>.

To deploy a production release:

1. Copy CHANGES-template.md to CHANGES.md, and add a list of PT stories related to the release into temporary CHANGES.md
    - Run `git log --reverse <last release tag>...HEAD | grep '#'` to see a list of PR merges and stories that include PT ids in their message
    - In a PT workspace that includes Orange and Teal boards, search for the `label:"activity-player-<new version>" includedone:true`. You can select all, and export as CSV. Then copy the id and title columns.
    - Review recently merged PRs in GitHub UI
2. Compute asset sizes.
    1. Run `npm run build`
    2. Look at file sizes with `ls dist/assets`
    3. Add file sizes to CHANGES.md
    4. Look at previous version file sizes from previous version in GitHub and compute the percent change `(new - prev) / prev * 100`
3. Update package, commit, and tag
    - **Mac or Linux**:
        - Run `npm version -m "$(< CHANGES.md)" [new-version-string]`
        - This updates the version in package.json and package-lock.json and creates a commit with the comment from CHANGES.md, and creates a tag with the name `v[new-version-string]` that has a description based on CHANGES.md.
    - **Windows**: the command above that injects `CHANGES.md` as the message won't work in the standard windows command application.
        - git-bash: same as above
        - PowerShell: `npm version -m "(type CHANGES.md)" [new-version-string]` might work, I haven't tried it though.
        - Do the steps manually and use a git client so you can paste in the multi line message
            1. `npm version --no-git-tag-version [new-version-string]` (updates package.json and package-lock.json with the new version)
            2. create a new commit with the CHANGES.md message
            3. create a tag `v[new-version-string]` with the CHANGES.md message
4. Push current branch and tag to GitHub
5. Create a GitHub Release
    1. Find the new tag at https://github.com/concord-consortium/activity-player/tags open it, and edit it
    2. Copy the title from CHANGES.md
    3. Copy the content from CHANGES.md
6. QA the built version at `https://activity-player.concord.org/versions/v[new-version-string]``
7. Checkout production
8. Run `git reset --hard v[new-version-string]`
9. Push production to GitHub
10. Delete CHANGES.md to clean up your working directory

### Testing

Run `npm test` to run jest tests. Run `npm run test:full` to run jest and Cypress tests.

##### Cypress Run Options

Inside of your `package.json` file:
1. `--browser browser-name`: define browser for running tests
2. `--group group-name`: assign a group name for tests running
3. `--spec`: define the spec files to run
4. `--headed`: show cypress test runner GUI while running test (will exit by default when done)
5. `--no-exit`: keep cypress test runner GUI open when done running
6. `--record`: decide whether or not tests will have video recordings
7. `--key`: specify your secret record key
8. `--reporter`: specify a mocha reporter

##### Cypress Run Examples

1. `cypress run --browser chrome` will run cypress in a chrome browser
2. `cypress run --headed --no-exit` will open cypress test runner when tests begin to run, and it will remain open when tests are finished running.
3. `cypress run --spec 'cypress/integration/examples/smoke-test.js'` will point to a smoke-test file rather than running all of the test files for a project.

## Url Parameters
The configuration of the Activity Player is managed mostly by setting and checking URL parameters.

### Note: these are subject to change
Definitive source of valid URL parameter names can be found in: `src/utilities/url-query.ts`

#### Testing, development, and debugging:
* `__cypressLoggedIn`: trigger logged in code path for Cypress tests.
* `__forceOfflineData`: will force IndexedDB storage for answers, plugin data.
* `__maxIdleTime`: user will see the idle warning after kMaxIdleTime
* `__timeout`: user session will timeout after kMaxIdleTime + kTimeout
* `clearFirestorePersistence`: clear FireStore between Cypress tests
#### Content and behavior
* `activity={id|url}`: load sample-activity {id} or load json from specified url
* `contentUrl={url}`: override the activity parameter and load the activity content from this contentUrl instead. In this case the activity parameter is still used to make the resourceUrl which identifies the resource structure in the report-service. The computed resourceUrl is also used to identify the answers when running offline.
* `mode={mode}`: sets mode. Values: "teacher-edition"
* `page={n|"page_[id]"}`: load page n, where 0 is the activity introduction, 1 is the first page and [id] in "page_[id]" refers to an internal integer id of the page model exported from LARA.
* `portalReport`: override default base URL for the student report. `https://activity-player.concord.org/`, `https://activity-player-offline.concord.org/`, `https://activity-player.concord.org/version/*`, and `https://activity-player-offline.concord.org/version/*`, default to a versioned URL defined as a constant in the code `kProductionPortalReportUrl`. Every other url defaults to the master branch of the portal-report.
* `sequence={id|url}`: load sample-sequence {id} or load json from specified url
* `themeButtons`: whether to show theme buttons

#### Loading user and authentication data:
* `clearFirestorePersistence`: clears local offline firestore cache
* `domain={n}`: set by the portal when launching external activity
* `enableFirestorePersistence`: uses local offline firestore cache only
* `firebaseApp={id}`: override default firebase app. https://activity-player.concord.org/ and https://activity-player-offline.concord.org/ without a path, defaults to `report-service-pro` every other url defaults to `report-service-dev`. For example https://activity-player.concord.org/branch/foo will use `report-service-dev` by default.
* `preview`: prevent running in anonymous datasaving mode
* `runkey={uuid}`: set by the app if we are running in anonymous datasaving mode
* `sourceKey={id}`: which source collection to save data to in firestore (defaults to canonical hostname)
* `token={n}`: set by the portal when launching external activity, to authenticate with portal API
## Usage Notes

### Offline Manifests

An offline manifest is a JSON file containing both a list of activities and a list of GET urls to cache offline.  It is used to enable offline use of the Activity Player.  Offline manifests can only be used, created or edited when the activity player is run in offline mode, which is determined by the window.location.host value.  To run in offline mode in development use the `npm run start:offline` script.

### Using an Offline Manifest

Offline manifests are specified using a `offlineManifest=` query parameter that points to the filename (without the `.json` extension) in the `src/public/offline-manifests` folder which is published with each deploy of the Activity Player.

When running locally (after running `npm start`) load the following url:

http://localhost:11002/?offlineManifest=smoke-test-v1

#### Creating an Offline Manifest

Offline manifests can either be authored by hand or more easily by enabling "authoring mode" and having the Activity Player itself record the activities loaded and the urls to cache.

To enable authoring mode launch the Activity Player with the `setOfflineManifestAuthoringId=` query parameter set to the offline manifest name.  As an example when running locally using `npm start` you would use the following url:

http://localhost:11002/?setOfflineManifestAuthoringId=example

to turn on authoring mode and to set the offline manifest name to `example`.  This setting is stored in localstorage so it persists across page loads so you **do not** need to keep the parameter in the query string to keep authoring mode enabled.

Once authoring mode is enabled a nav bar is added to the top of the site showing the number of activities and urls cached.  To add an activity use the `activity=` url parameter.  The activity will load and you should see the activity count in the authoring nav bar increase by 1 along with the cache list for any urls found as values in the downloaded activity json file.  You will then need to navigate through all the pages so ensure all the urls are cached as interactive in each page loads.  Note: you may need to use the interactive if it does not immediately load all of its assets - this needs to be determined in a case by case basis.

Once you have loaded all the activities you want to add to the offline manifest and navigated through their pages you can click the "Download JSON" link to download the offline manifest in your browser.  It will be named the same as the offline manifest id you set.  You can then save that json file in the `src/public/offline-manifests` folder and edit it to reorder the activity list if desired.

#### Editing an Offline Manifest

If you have a offline manifest saved in the offline-manifests folder named `example` you would load the following URL(after running `npm start`):

http://localhost:11002/?setOfflineManifestAuthoringId=example&offlineManifest=example

At this point you can either add new activities by manually adding an `activity=` url parameter or update the current cache list by launching an existing activity from the offline activity list.  Once you have completed the edits you can download the json and replace the file in the `src/public/offline-manifests` folder.

#### Exiting Offline Manifest Authoring Mode

Once you have completed authoring you can click on the "Exit Authoring" button in the authoring nav.  This simply deletes the localstorage key set when the `setOfflineManifestAuthoringId=` query parameter was used.  It **does not** delete the data stored during authoring mode.  To delete that data (for the current offline manifest only) click the "Clear Authoring Data" button in the authoring nav.

#### Frozen activity content

It is safest to freeze the activity content managed by LARA and refer to that frozen activity content in the manifest. Otherwise the resources referenced by activity can change after the manifest was generated, and then when a user goes to install the manifest's files some of them will not be available anymore.

A specific example are the library interactives used for open response and multiple choice in LARA. When a new version of these interactives (question-interactives) is released, the library interactive referenced by most activities in LARA gets updated. Now when the activity content is downloaded by the AP it refers to the new version of this interactive. If the manifest was created with the old version it might record a url of `/models-resources/question-interactives/version/v1.1.0`, but after the new release, LARA might now send down an activity json file that refers to `/models-resources/question-interactives/version/v1.2.0`.  Because the manifest only initially "installs" what is listed in the manifest file, the v1.2.0 interactive would not be cached. Now when the activity is run offline it would not find v1.2.0 and the activity won't run correctly. By freezing the activity json, changes to LARA won't affect this frozen content so the manifest will continue to be valid.

There are still cases where a frozen activity.json won't help. Here is an example:
If the activity uses a master branch version of question-interactives. The manifest will record a reference to the html, javascript, and css of this master branch. The index file name will always be the same `/models-resources/question-interactivs/branch/master/index.html`, but it will refer to js and css files that include a hash in them. So the manifest will record something like:
- `/models-resources/question-interactives/branch/master/index.html`
- `/models-resources/question-interactives/branch/master/index.abc123.js`

When new code is added to the master branch the old files are deleted and new files are added so now the master branch question-interactive index.html will refer to a different js file such as: `/models-resources/question-interactivs/branch/master/index.def456.js`.  This file will not have been cached during the manifest installation process so when running offline the question-interactives won't be able to find its javascript.  Because of this it is always best to refer to versioned interactives which we know will not be modified, so the list of files in the manifest will always be correct.

#### Assignments to support Offline Manifests

The student or teacher will need to install the files from the offline manifest before the student goes offline.
They'll likely do that with a URL like this one:

    https://activity-player-offline.concord.org/branch/offline-mode/?confirmOfflineManifestInstall=true&offlineManifest=staging-precipitating-change-v1

Then when they run they need to open the url like:

    https://activity-player-offline.concord.org/branch/offline-mode/

They can just bookmark that URL, or they can install a PWA app icon which will open that URL. The PWA installation should increase the stickiness of the application cache.

An author needs to setup assignments for each resources (activities) in the manifest so the student can upload their work on that resource back to the report-service. Because we are using frozen content and we want the portal-report to be able to find the report-structure for the activity. These URLs need to include both an `activity` parameter and a `contentUrl` parameter. An example of this is:

    https://activity-player-offline.concord.org/branch/offline-mode/?activity=https://authoring.staging.concord.org/activities/20926&contentUrl=offline-activities%2Fprecipitatingchange-test-v1.json

The `activity` parameter is used by the AP and the portal-report to compute the resourceUrl. This resourceUrl is used to find the student's answers in the offline indexedDb. It is also used by the portal-report to find the report-structure the report-service. 

## Models-Resources Proxying

In order for the interactive iframe contents to be cached by the Activity Player service worker the iframes must load content under the same Activity Player domain.  To do this in production a CloudFront origin and behavior were added to proxy any url containing `models-resources` to the models-resources S3 bucket.  This is also done locally with a proxy setup in the webpack-dev-server configuration.

NOTE: this proxying works by renaming all characters in the url up to and including the `models-resources` string.  This is done to allow for branches to not break when using absolute path references.  So the following urls all will resolve to the same resource:

* https://activity-player.concord.org/models-resources/glossary-plugin/plugin.js
* https://activity-player.concord.org/branch/master/models-resources/glossary-plugin/plugin.js
* https://activity-player.concord.org/version/1.0.0/models-resources/glossary-plugin/plugin.js

The Activity Player json loader code rewrites any urls it finds that fit the following regexs (note the lack of leading slash):

* https?:\/\/models-resources\.concord\.org/ => "models-resources"
* https?:\/\/models-resources\.s3\.amazonaws\.com/ => "models-resources"
* https?:\/\/((.+)-plugin)\.concord\.org/ => "models-resources/$1"

### Offline Mode

The application can be placed in "offline" mode by running it from an offline host.  The production offline host is https://activity-player-offline.concord.org/ and the development host is https://localhost:11002.  To run in offline mode in development use the `npm run start:offline` script.

Offline mode currently causes a header nav to display.  In the future this flag will also control how student data is saved and sent to the portal.

The installed PWA will use `/?offline=true` as its start_url in the `manifest.json` file.  This will cause all desktop launches to run in offline mode.  In order to use the PWA version an offline manifest must first be installed using the following combinations of query parameters: `?offline=true&offlineManifest=<id>`.  An optional parameter of `confirmOfflineManifestInstall=true` can also be used to not auto close the loading dialog and instead show a message that everything is installed once all the assets are downloaded into the cache.

## License

Activity Player is Copyright 2020 (c) by the Concord Consortium and is distributed under the [MIT license](http://www.opensource.org/licenses/MIT).

See license.md for the complete license text.
