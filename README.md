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

Production releases to S3 are based on the contents of the /dist folder and are built automatically by GitHub Actions for each branch pushed to GitHub and each merge into production.

The production branch is deployed to https://activity-player.concord.org/

Other branches are deployed to https://activity-player.concord.org/branch/<name>.

To deploy a production release:

1. Copy CHANGES-template.md to CHANGES.md, and add a list of PT stories related to the release into temporary CHANGES.md
    - Run `git log --reverse <last release tag>...HEAD | grep '#'` to see a list of PR merges and stories that include PT ids in their message
    - In a PT workspace that includes Orange and Teal boards, search for the `label:"activity-player-<new version>" includedone:true`. You can select all, and export as CSV. Then copy the id and title columns.
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
            1. update package.json with the new version
            2. run `npm install` to update package-lock.json
            3. create a new commit with the CHANGES.md message
            4. create a tag `v[new-version-string]` with the CHANGES.md message
4. Push current branch and tag to GitHub
5. Create a GitHub Release
    1. Find the new tag at https://github.com/concord-consortium/activity-player/tags open it, and edit it
    2. Copy the title from CHANGES.md
    3. Copy the content from CHANGES.md
6. QA the built version at `https://activity-player.concord.org/versions/v[new-version-string]``
7. Checkout production
8. Run `git reset --hard [version]`
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
### Note: these are subject to change

* activity={id|url}:    load sample-activity {id} or load json from specified url
* sequence={id|url}:    load sample-sequence {id} or load json from specified url
* page={n|"page_[id]"}: load page n, where 0 is the activity introduction, 1 is the first page and [id] in "page_[id]" refers to an internal integer id of the page model exported from LARA.
* themeButtons:         whether to show theme buttons
* mode={mode}:          sets mode. Values: "teacher-edition"
* portalReport:         override default base URL for the student report. https://activity-player.concord.org/ and https://activity-player.concord.org/version/*, default to a versioned URL defined as a constant in the code `kProductionPortalReportUrl`. Every other url defaults to the master branch of the portal-report.

#### User data loading:
* firebaseApp={id}:  override default firebase app. https://activity-player.concord.org/ without a path, defaults to `report-service-pro` every other url `report-service-dev`. For example https://activity-player.concord.org/branch/foo will use `report-service-dev` by default.
* token={n}:         set by the portal when launching external activity, to authenticate with portal API
* domain={n}:        set by the portal when launching external activity
* report-source={id}: which source collection to save data to in firestore (defaults to own hostname)
* runkey={uuid}:     set by the app if we are running in anonymous datasaving mode
* preview:           prevent running in anonymous datasaving mode
* enableFirestorePersistence: uses local offline firestore cache only
* clearFirestorePersistence: clears local offline firestore cache

## License

Activity Player is Copyright 2020 (c) by the Concord Consortium and is distributed under the [MIT license](http://www.opensource.org/licenses/MIT).

See license.md for the complete license text.
