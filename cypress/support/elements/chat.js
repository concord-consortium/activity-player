class Chat {
  getLauncher() {
    return cy.get("[data-cy=chat-launcher]");
  }
  getSidebar() {
    return cy.get("[data-cy=chat-sidebar]");
  }
  getHeader() {
    return cy.get("[data-cy=chat-header]");
  }
  getCloseButton() {
    return cy.get("[data-cy=chat-close]");
  }
  getMessages() {
    return cy.get("[data-cy=chat-messages]");
  }
  getEmptyState() {
    return cy.get("[data-cy=chat-empty]");
  }
  getComposer() {
    return cy.get("[data-cy=chat-composer]");
  }
  getInput() {
    return cy.get("[data-cy=chat-input]");
  }
  // DebugTransport's seeded "what would be sent" turn. Its body is collapsed until the toggle is
  // clicked, so the segment text is absent from the DOM until then.
  getDebugToggle() {
    return cy.get("[data-cy=chat-debug-toggle]");
  }
  getDebugBody() {
    return cy.get("[data-cy=chat-debug-body]");
  }
  getUserRows() {
    return cy.get("[data-cy=chat-row-user]");
  }
}

export default Chat;
