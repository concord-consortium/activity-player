# [LARA] Activity Player

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/concord-consortium/activity-player)

This is a single page React and Typescript application intended to provide a platform for presenting "Lightweight" activities.

## Development

### Initial steps

1. Clone this repo and `cd` into it
2. Run `npm install` to pull dependencies
3. Run `npm start` to run `webpack-dev-server` in development mode with hot module replacement

### Building

If you want to build a local version run `npm run build`, it will create the files in the `dist` folder.
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

Deployment is handled by GitHub Actions using OIDC for AWS authentication. The `s3-deploy` job in
[`ci.yml`](.github/workflows/ci.yml) runs on every push, branches and tags alike, and writes to
`models-resources/activity-player/`. It `needs` the build and Cypress jobs, so a failing test stops
the deploy and nothing is published for that push. You do not need to build locally to deploy.

Branches are published at `https://activity-player.concord.org/branch/<name>/` and tags at
`https://activity-player.concord.org/version/<name>/`.

Note that a branch's `<name>` is not always the branch name. `s3-deploy-action` strips, in order, a
leading Jira-style `<letters>-<digits>-` prefix, a leading Pivotal-style run of 8 or more digits, or
the same digits as a *suffix*. So `AP-134-no-phone-for-blank-iframe` publishes to
`/branch/no-phone-for-blank-iframe/` and `173944477-completion-page-state` to
`/branch/completion-page-state/`, while `readme-release-process` keeps its full name, because
`readme` is not followed by digits. The suffix rule is the one nobody guesses. Check the
deployment's URL rather than assuming.

You can view the status of all the branch and tag deploys [here](https://github.com/concord-consortium/activity-player/actions).

Pushes to `master` additionally publish `https://activity-player.concord.org/index-master.html`,
which is the master build at the top level rather than under `/branch/`.

The production release is available at `https://activity-player.concord.org`, which serves
`models-resources/activity-player/` — the paths above and the `s3://` paths below are the same files.
Deploying a tag does not change production; see [Releasing](#releasing) below.

See the CLUE [docs/deploy.md](https://github.com/concord-consortium/collaborative-learning/blob/master/docs/deploy.md) for more details (it uses the same process).

## Releasing

Four steps. The release notes live in the [GitHub releases](https://github.com/concord-consortium/activity-player/releases);
`CHANGES-template.md` is an unused template and is not part of this process.

The version number comes from the release's Jira fix version rather than from semver applied to what
merged. Check the unreleased version in the AP project and use that, even when the release contains
only bug fixes: `2.16.1` and `2.17.1` were patches, but the number is whatever Jira already says.

1. Verify, then bump the version in `package.json` and `package-lock.json` and commit to `master`.

   Verify before you push, not after: `master` is unprotected and the bump goes straight to it, so
   there is no PR gate to catch a bad release commit once it is public.

   ```sh
   npm run lint && npm run build && npm test
   npm version <version> --no-git-tag-version
   git commit package.json package-lock.json -m "build: Update version to v<version>"
   git push origin master
   ```

   CI repeats the build and the jest tests on the push, and runs Cypress, but it never runs
   `npm run lint`: the only linting it does is the `lint:build` step inside `npm run build`, which is
   scoped to `src` and uses the build eslint configs. `npm run lint` additionally covers `cypress/**`,
   so skipping it locally means nothing checks those files.

   There is no `release-<version>` branch and no PR. The commit message is a bare subject with no
   body and no ticket id.

2. Tag that commit, annotated, and push the tag:

   ```sh
   git tag -a v<version> -m "Version v<version>"
   git push origin v<version>
   ```

   Create the tag locally rather than from the GitHub releases UI, which produces a lightweight tag.

3. Generate the release notes with
   [`release-notes-jira.mjs`](https://github.com/concord-consortium/dev-templates/blob/main/scripts/release-notes-jira.mjs)
   from [dev-templates](https://github.com/concord-consortium/dev-templates), rather than by hand:

   ```sh
   # from inside dev-templates/scripts, not the repo root
   npm install                                  # once; the deps are declared here, not at the root
   npm run release-notes-jira AP "<version>"    # e.g. "2.18.0" — the bare version, no "AP v" prefix
   ```

   Run it from `scripts/`. `JIRA_USER` and `JIRA_TOKEN` are read from a `.env` in that folder, and
   `dotenv` loads it relative to the working directory, so invoking the script by path from the repo
   root fails with "Both the JIRA_USER and JIRA_TOKEN environment variables are required". Pull
   dev-templates first: the script's query has changed, and a stale checkout behaves differently.

   Stories become *Features & Improvements*, bugs become *Bug Fixes*, and chores, tasks and anything
   labeled `under-the-hood` become *Under the Hood*. It queries
   `project=AP AND fixVersion in ("<version>") AND issuetype in (Story, Bug, Chore, Task)`, so the
   release's issues have to carry the fix version, and the per-release *Release* tracking issue is
   skipped by the issue-type filter rather than appearing in the notes. With no matching issues the
   script reports "No stories found" and exits.

   **There is no status filter**, so an issue carrying the fix version is written into the notes
   whatever state it is in. The script surfaces two things for you to resolve rather than dropping
   them silently: it ends with `⚠️ N story(ies) not yet done: <keys>`, and it marks an issue that
   carries both the fix version and a `no-release` label inline with
   `⚠️ (has no-release label — conflict)`. Read the output before pasting it.

   Paste the output into a new GitHub release on the tag, titled
   `Version <version> - released <Month> <D>, <YYYY>`. Pass `slack` as a third argument for a
   Slack-formatted version to share.

4. Publish it. Pushing the tag in step 2 triggered a second CI run, because
   [`ci.yml`](.github/workflows/ci.yml) is `on: push` and that matches tags, and that run deployed
   the build to `.../activity-player/version/v<version>/`. **Nothing is live yet**: promoting that
   build to the top-level `index.html` is a separate manual step.

   Wait for that run to finish **successfully**. The deploy needs the build and Cypress jobs, so a
   failed run publishes nothing and the copy below has no source to read.

   From the CLI:

   ```sh
   gh workflow run release_production.yml -f version=v<version>
   ```

   Or from the web UI: **Actions** tab, **Release Production** workflow in the left sidebar,
   **Run workflow**, enter the tag (e.g. `v2.17.1`) in the *version* field, **Run workflow**.

   Either way it copies `s3://models-resources/activity-player/version/v<version>/index-top.html`
   over `s3://models-resources/activity-player/index.html`.

   Then load https://activity-player.concord.org and confirm the version in the footer. Both files
   are served `cache-control: no-cache, max-age=0`, so the change is visible immediately with no
   cache to wait out.

There is also a [Release Staging](.github/workflows/release-staging.yml) workflow, which writes
`index-staging.html` for testing at https://activity-player.concord.org/index-staging.html. It has
never been run and is not part of the process above.

## Testing

Run `npm test` to run jest tests. Run `npm run test:full` to run jest and Cypress tests.

### Cypress Run Options

Inside of your `package.json` file:
1. `--browser browser-name`: define browser for running tests
2. `--group group-name`: assign a group name for tests running
3. `--spec`: define the spec files to run
4. `--headed`: show cypress test runner GUI while running test (will exit by default when done)
5. `--no-exit`: keep cypress test runner GUI open when done running
6. `--record`: decide whether or not tests will have video recordings
7. `--key`: specify your secret record key
8. `--reporter`: specify a mocha reporter

### Cypress Run Examples

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
* override.{key}={value}:             rewrite interactive iframe URLs matching the rule named `{key}` in the override registry. Used to test a new branch or version of an interactive without editing the activity JSON or releasing a new Activity Player. Example: `?override.qi=toolbar-accessibility` rewrites question-interactives URLs to `/branch/toolbar-accessibility/`. When at least one `override.*` parameter is active, a banner across the top of the page lists the active overrides. The set of available `{key}` rules is defined in the [`runtime-config` repository](https://github.com/concord-consortium/runtime-config) (separate repo); add an entry there to make a new key available. See [specs/AP-115-interactive-url-overrides.md](specs/AP-115-interactive-url-overrides.md) for the full design.
* override.{key}.{param}={value}:     same as above for parameterized registry entries. Example: `?override.mr.tectonic-explorer=fix-bug-42` uses the generic `mr` rule (covering anything under `models-resources.concord.org`) with the project segment `tectonic-explorer`.

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
