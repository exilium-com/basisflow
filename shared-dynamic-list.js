(() => {
  function bindField(control, itemId, onPatch) {
    const field = control.dataset.field;
    if (!field) {
      return;
    }

    const isCheckbox = control instanceof HTMLInputElement && control.type === "checkbox";
    const isRadio = control instanceof HTMLInputElement && control.type === "radio";
    const eventName = isCheckbox || isRadio || control.tagName === "SELECT" ? "change" : "input";

    control.addEventListener(eventName, () => {
      onPatch(itemId, { [field]: isCheckbox ? control.checked : control.value }, control.dataset.rerender === "true");
    });
  }

  function render(options) {
    const {
      container,
      template,
      items,
      prepareRow,
      onPatch,
      onRemove
    } = options;

    container.innerHTML = "";

    items.forEach((item, index) => {
      const fragment = template.content.cloneNode(true);
      const row = fragment.querySelector("[data-item-row]");

      if (!row) {
        throw new Error("Dynamic list template is missing [data-item-row].");
      }

      row.dataset.itemId = item.id;

      if (typeof prepareRow === "function") {
        prepareRow({ fragment, row, item, index });
      }

      row.querySelectorAll("[data-field]").forEach((control) => {
        bindField(control, item.id, onPatch);
      });

      const details = row.querySelector("[data-options]");
      if (details) {
        details.addEventListener("toggle", () => {
          onPatch(item.id, { detailsOpen: details.open }, false);
        });
      }

      const removeButton = row.querySelector('[data-action="remove-item"]');
      if (removeButton) {
        removeButton.addEventListener("click", () => {
          onRemove(item.id);
        });
      }

      container.appendChild(fragment);
    });
  }

  window.FinanceDynamicList = { render };
})();
