// The sizing preview's settings for the pages of the sample-sizing-parity activity. The parity
// Playwright tests open each page in App and these settings in the preview, and a Jest test checks
// that the preview builds the same sections from them as the sample has.
const kInteractiveSettings = "kind=library&aspect_ratio_method=DEFAULT&name=1&show_delete_data_button=0";

/** The sample's page_1: a full-width section on a fixed 1100px page. */
export const kParityFixedHash = `fixed_width_layout=1100px&layout=full-width&${kInteractiveSettings}`;

/** The sample's page_2: a responsive-50-50 section, the interactive in the primary column. */
export const kParityResponsiveHash =
  `fixed_width_layout=1100px&layout=responsive-50-50&column=primary&other_text=tall&${kInteractiveSettings}`;
