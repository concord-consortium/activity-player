const enzyme = require("enzyme");
const Adapter = require("enzyme-adapter-react-16");
require("@testing-library/jest-dom");

enzyme.configure({ adapter: new Adapter() });
