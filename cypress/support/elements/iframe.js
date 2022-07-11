export const getInIframe = (outerSelector, innerSelector) => {
  let $innerResult;

  return cy.get(outerSelector)
  // First make sure the innerSelector exists by wrapping the whole search
  // for it in a should function. If anything in the should function throws an
  // exception or fails a test then the should function will automatically re-run
  .should(($el) => {
    // direct jQuery is used here because the cypress command for wrap, find, and its
    // run asynchronously, and create confusing log message.

    // Get the body element of the first iframe
    const $firstIframe = $el.find("iframe");
    // This line might throw an exception because the iframe doesn't exist or isn't
    // loaded yet.  But in that case should will automatically retry
    const iframeBody = $firstIframe[0].contentDocument.body;
    $innerResult = Cypress.$(iframeBody).find(innerSelector);

    // Make sure the innerSelect actually finds something
    // this will print a message to the cypress log
    expect($innerResult).to.exist;
  })
  // Then return the result of that inner selector
  .then(() => {
    return $innerResult;
  });
};
