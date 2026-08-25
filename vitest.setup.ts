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
