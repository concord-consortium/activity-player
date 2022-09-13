import { defineConfig } from 'cypress'

export default defineConfig({
  viewportWidth: 1400,
  viewportHeight: 1000,
  video: false,
  fixturesFolder: 'src/data',
  defaultCommandTimeout: 8000,
  projectId: 'etatiy',
  chromeWebSecurity: false,
  env: {
    portal_domain: 'https://learn.staging.concord.org',
    portal_launch_path: '/users/5465/portal/offerings/2044.run_resource_html',
    portal_username: 'scypress',
    portal_password: 'cypress',
    answers_source_key: 'cypress-test',
    portal_collaborator_offering: 2083,
    portal_collaborator_1_username: 'ccollaborator1',
    portal_collaborator_1_password: 'cypress',
    portal_collaborator_1_student_id: 901,
    portal_collaborator_2_username: 'ccollaborator2',
    portal_collaborator_2_password: 'cypress',
    portal_collaborator_2_student_id: 902,
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.js')(on, config)
    },
    baseUrl: 'http://localhost:8080',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
  },
})
