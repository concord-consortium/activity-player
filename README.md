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

Merges into production are deployed to https://activity-player.concord.org/ (NOTE: production branch has not yet been created and deployment still needs to be configured).

Other branches are deployed to https://activity-player.concord.org/branch/<name>.

To deploy a production release:

1. Increment version number in package.json
2. Create new entry in CHANGELOG.md
3. Run `git log --pretty=oneline --reverse <last release tag>...HEAD | grep '#' | grep -v Merge` and add contents (after edits if needed to CHANGELOG.md)
4. Run `npm run build`
5. Copy asset size markdown table from previous release and change sizes to match new sizes in `dist`
6. Create `release-<version>` branch and commit changes, push to GitHub, create PR and merge
7. Checkout master and pull
8. Checkout production
9. Run `git merge master --no-ff`
10. Push production to GitHub
11. Use https://github.com/concord-consortium/activity-player/releases to create a new release tag

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
* portal-report:        sets the url of the student report

#### User data loading:
* firebaseApp={id}:  override default firebase app. https://activity-player.concord.org/ without a path, defaults to `report-service-pro` every other url `report-service-dev`. For example https://activity-player.concord.org/branch/foo will use `report-service-dev` by default.
* token={n}:         set by the portal when launching external activity, to authenticate with portal API
* domain={n}:        set by the portal when launching external activity
* report-source={id}: which source collection to save data to in firestore (defaults to own hostname)
* runkey={uuid}:     set by the app if we are running in anonymous datasaving mode
* preview:           prevent running in anonymous datasaving mode
* enableFirestorePersistence: uses local offline firestore cache only
* clearFirestorePersistence: clears local offline firestore cache

## Usage Notes

### Launch Lists

A launch list is a JSON file containing both a list of activities and a list of GET urls to cache offline.  It is used to enable offline use of the Activity Player.

### Using a Launch List

Launch lists are specified using a `launchList=` query parameter that points to the filename (without the `.json` extension) in the `src/public/launch-lists` folder which is published with each deploy of the Activity Player.

When running locally (after running `npm start`) load the following url:

http://localhost:11000/?launchList=smoke-test

#### Creating a Launch List

Launch lists can either be authored by hand or more easily by enabling "authoring more" and having the Activity Player itself record the activities loaded and the urls to cache.

To enable authoring mode launch the Activity Player with the `setLaunchListAuthoringId=` query parameter set to the launch list name.  As an example when running locally using `npm start` you would use the following url:

http://localhost:11000/?setLaunchListAuthoringId=example

to turn on authoring mode and to set the launch list name to `example`.  This setting is stored in localstorage so it persists across page loads so you **do not** need to keep the parameter in the query string to keep authoring mode enabled.

Once authoring mode is enabled a nav bar is added to the top of the site showing the number of activities and urls cached.  To add an activity use the `activity=` url parameter.  The activity will load and you should see the activity count in the authoring nav bar increase by 1 along with the cache list for any urls found as values in the downloaded activity json file.  You will then need to navigate through all the pages so ensure all the urls are cached as interactive in each page loads.  Note: you may need to use the interactive if it does not immediately load all of its assets - this needs to be determined in a case by case basis.

Once you have loaded all the activities you want to add to the launch list and navigated through their pages you can click the "Download JSON" link to download the launch list in your browser.  It will be named the same as the launch list id you set.  You can then save that json file in the `src/public/launch-list` folder and edit it to reorder the activity list if desired.

#### Editing a Launch List

If you have a launch list saved in the launch-lists folder named `example` you would load the following URL(after running `npm start`):

http://localhost:11000/?setLaunchListAuthoringId=example&launchList=example

At this point you can either add new activities by manually adding an `activity=` url parameter or update the current cache list by launching an existing activity in the launcher.  Once you have completed the edits you can download the json and replace the file in the `src/public/launch-lists` folder.

#### Exiting Launch List Authoring Mode

Once you have completed authoring you can click on the "Exit Authoring" button in the authoring nav.  This simply deletes the localstorage key set when the `setLaunchListAuthoringId=` query parameter was used.  It **does not** delete the data stored during authoring mode.  To delete that data (for the current launch list only) click the "Clear Authoring Data" button in the authoring nav.

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


## License

Activity Player is Copyright 2020 (c) by the Concord Consortium and is distributed under the [MIT license](http://www.opensource.org/licenses/MIT).

See license.md for the complete license text.
