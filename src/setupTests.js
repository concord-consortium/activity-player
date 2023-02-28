const enzyme = require("enzyme");
const Adapter = require("enzyme-adapter-react-16");
require("@testing-library/jest-dom");

enzyme.configure({ adapter: new Adapter() });

// import the abomination that is jQuery as it mocks any attempts to mock it
const $ = require("jquery");
window.$ = $;
window.jQuery = $;
window.jQuery.ui = {};
require("jquery-ui");
require("jquery-ui/ui/widget");
require("jquery-ui/ui/data");
require("jquery-ui/ui/disable-selection");
require("jquery-ui/ui/focusable");
require("jquery-ui/ui/form");
require("jquery-ui/ui/ie");
require("jquery-ui/ui/keycode");
require("jquery-ui/ui/labels");
require("jquery-ui/ui/plugin");
require("jquery-ui/ui/safe-active-element");
require("jquery-ui/ui/safe-blur");
require("jquery-ui/ui/scroll-parent");
require("jquery-ui/ui/tabbable");
require("jquery-ui/ui/unique-id");
require("jquery-ui/ui/version");

