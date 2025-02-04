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
  - replace the `activity-player.concord.org` with `localhost:8080` (or whatever your local server for the activity player is)
  - add a new parameter `portal-report=https://localhost:8081` (or whatever your local server for the portal-report is)
  - the new url will be something like:
  `https://localhost:8080?activity=https://authoring.staging.concord.org/api/v1/123.json&portal-report=https://localhost:8081`
- assign this resource to a class
- run the resource as a student in this class

## Deployment

Deployments are based on the contents of the /dist folder and are built automatically by GitHub Actions for each branch and tag pushed to GitHub.

Branches are deployed to `https://activity-player.concord.org/branch/<name>/`.

Tags are deployed to `https://activity-player.concord.org/version/<name>/`

You can view the status of all the branch and tag deploys [here](https://github.com/concord-consortium/activity-player/actions).

The production release is available at `https://activity-player.concord.org`.

Production releases are done using a manual GitHub Actions workflow. You specify which tag you want to release to production and the workflow copies that tag's `index-top.html` to `https://activity-player.concord.org/index.html`.

See the CLUE [docs/deploy.md](https://github.com/concord-consortium/collaborative-learning/blob/master/docs/deploy.md) for more details (it uses the same process).

To deploy a production release:

1. Update the version number in `package.json` and `package-lock.json`
    - `npm version --no-git-tag-version [patch|minor|major]`
1. Update the `CHANGELOG.md` with a description of the new version
1. Verify that everything builds correctly
    - `npm run lint && npm run build && npm run test`
1. Copy asset size markdown table from previous release and change sizes to match new sizes in `dist`
    - `cd dist`
    - `ls -lhS *.js | awk '{print "|", $9, "|", $5, "|"}'`
    - `ls -lhS *.css | awk '{print "|", $9, "|", $5, "|"}'`
1. Create `release-<version>` branch and commit changes, push to GitHub, create PR and merge
1. Test the master build at: https://activity-player.concord.org/index-master.html
1. Push a version tag to GitHub and/or use https://github.com/concord-consortium/activity-player/releases to create a new GitHub release
1. Stage the release by running the [Release Staging Workflow](https://github.com/concord-consortium/activity-player/actions/workflows/release-staging.yml) and entering the version tag you just pushed.
1. Test the staged release at https://activity-player.concord.org/index-staging.html
1. Update production by running the [Release Workflow](https://github.com/concord-consortium/activity-player/actions/workflows/release.yml) and entering the release version tag.

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
### Note: these are subject to change

* activity={id|url}:                  load sample-activity {id} or load json from specified url
* sequence={id|url}:                  load sample-sequence {id} or load json from specified url
* sequenceActivity={n|activity_[id]}: load activity n where n corresponds to the activity's placement in the order of sequenced activities (1 = first activity, 2 = second activity, etc.), or by the activity's unique ID
* page={n|"page_[id]"}:               load page n, where 0 is the activity introduction, 1 is the first page and [id] in "page_[id]" refers to an internal integer id of the page model exported from LARA.
* themeButtons:                       whether to show theme buttons
* mode={mode}:                        sets mode. Values: "teacher-edition"
* portalReport:                       override default base URL for the student report. `https://activity-player.concord.org/`, `https://activity-player-offline.concord.org/`, `https://activity-player.concord.org/version/*`, and `https://activity-player-offline.concord.org/version/*`, default to a versioned URL defined as a constant in the code `kProductionPortalReportUrl`. Every other url defaults to the master branch of the portal-report.
* override:locked                     When set to "true" the offering is locked, independent of the portal data value.  Useful for development/testing.

#### User data loading:
* firebaseApp={id}:  override default firebase app. https://activity-player.concord.org/ and https://activity-player-offline.concord.org/ without a path, defaults to `report-service-pro` every other url defaults to `report-service-dev`. For example https://activity-player.concord.org/branch/foo will use `report-service-dev` by default.
* token={n}:         set by the portal when launching external activity, to authenticate with portal API
* auth-domain={url}: root URL for the portal which can authenticate the current user. This parameter can be
                    used instead of the `token` param. Activity Player will do an OAuth2 request to the auth-domain
                    in order to get an access-token. It doesn't follow camelCase naming convetion to be consistent with other applications that also use
                    `auth-domain` param (eg [Portal Report](https://github.com/concord-consortium/portal-report/blob/master/docs/launch.md#url-parameters))
* domain={n}:        set by the portal when launching external activity
* answersSourceKey={id}: which source collection to save data to in firestore (defaults to own hostname)
* runkey={uuid}:     set by the app if we are running in anonymous datasaving mode
* preview:           prevent running in anonymous datasaving mode
* enableFirestorePersistence: uses local offline firestore cache only
* clearFirestorePersistence: clears local offline firestore cache

#### Internal parameters (used in Cypress tests)
* __cypressLoggedIn:  triggers logged in code path for Cypress tests
* __skipGetApRun:     skip the ap run load when loading a page

## License

Activity Player is Copyright 2020 (c) by the Concord Consortium and is distributed under the [MIT license](http://www.opensource.org/licenses/MIT).

See license.md for the complete license text.
