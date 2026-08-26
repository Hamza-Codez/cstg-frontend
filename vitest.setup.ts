import "@testing-library/jest-dom/vitest";

/**
 * jsdom implements `<dialog>` as an element but not its methods, so any
 * component using `ui/modal` throws "dialog.showModal is not a function" the
 * moment it mounts — which would push every confirmation flow out of reach of
 * tests, exactly the flows worth testing.
 *
 * The shim keeps the one behaviour assertions depend on: `open` reflects
 * whether the dialog is showing, so `toBeVisible()` and queries inside it work.
 */
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  }
}

/**
 * jsdom implements no layout, so `scrollIntoView` does not exist on Element.
 * Any component that keeps an active option in view — the Select listbox, the
 * Combobox — throws on mount without this, which would put both widgets and
 * their whole keyboard contract out of reach of tests.
 *
 * A no-op is the honest shim: there is nothing to scroll, and the assertions
 * are about which option is active, not where it sits on screen.
 */
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {
    /* no layout in jsdom; nothing to do */
  };
}
