(function () {
  const script = document.currentScript;
  const systemId = script && script.dataset.app;
  if (!systemId) return;

  if (window.parent === window) {
    document.documentElement.style.visibility = "hidden";
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        document.title = "Acesso pelo portal";
        document.body.innerHTML =
          '<main style="max-width:560px;margin:12vh auto;padding:24px;font:16px Arial,sans-serif;line-height:1.5"><h1>Acesso pelo portal</h1><p>Entre no portal UPA Central para acessar este sistema.</p></main>';
        document.documentElement.style.visibility = "visible";
      },
      { once: true },
    );
    return;
  }

  const prefix = `upa:${systemId}:`;
  const storage = window.localStorage;
  const prototype = Storage.prototype;
  const originalGetItem = prototype.getItem;
  const originalSetItem = prototype.setItem;
  const originalRemoveItem = prototype.removeItem;
  const originalClear = prototype.clear;
  const originalKey = prototype.key;
  const lengthDescriptor = Object.getOwnPropertyDescriptor(prototype, "length");

  function isPageStorage(target) {
    return target === storage;
  }

  function scopedKey(key) {
    const value = String(key);
    return value.startsWith(prefix) ? value : `${prefix}${value}`;
  }

  prototype.getItem = function (key) {
    return originalGetItem.call(
      this,
      isPageStorage(this) ? scopedKey(key) : key,
    );
  };

  prototype.setItem = function (key, value) {
    return originalSetItem.call(
      this,
      isPageStorage(this) ? scopedKey(key) : key,
      value,
    );
  };

  prototype.removeItem = function (key) {
    return originalRemoveItem.call(
      this,
      isPageStorage(this) ? scopedKey(key) : key,
    );
  };

  prototype.clear = function () {
    if (!isPageStorage(this)) return originalClear.call(this);

    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = originalKey.call(storage, index);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => originalRemoveItem.call(storage, key));
  };

  prototype.key = function (index) {
    if (!isPageStorage(this)) return originalKey.call(this, index);

    const keys = [];
    for (let current = 0; current < storage.length; current += 1) {
      const key = originalKey.call(storage, current);
      if (key && key.startsWith(prefix)) keys.push(key.slice(prefix.length));
    }
    return keys[index] || null;
  };

  if (lengthDescriptor && lengthDescriptor.get) {
    Object.defineProperty(prototype, "length", {
      configurable: lengthDescriptor.configurable,
      enumerable: lengthDescriptor.enumerable,
      get() {
        if (!isPageStorage(this)) return lengthDescriptor.get.call(this);

        let count = 0;
        for (let index = 0; index < storage.length; index += 1) {
          const key = originalKey.call(storage, index);
          if (key && key.startsWith(prefix)) count += 1;
        }
        return count;
      },
    });
  }

  function getFormControls(form) {
    return Array.from(form.querySelectorAll("input[id], select[id], textarea[id]"))
      .filter(
        (control) =>
          !["password", "file", "button", "submit", "reset"].includes(
            control.type,
          ),
      );
  }

  function saveForm(form) {
    const state = {};
    getFormControls(form).forEach((control) => {
      state[control.id] =
        control.type === "checkbox" || control.type === "radio"
          ? control.checked
          : control.value;
    });
    storage.setItem(`${prefix}__form_state`, JSON.stringify(state));
  }

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      const form =
        document.querySelector("#saeForm") ||
        document.querySelector(".form");
      if (!form) return;

      const saved = storage.getItem(`${prefix}__form_state`);
      if (saved) {
        let state;
        try {
          state = JSON.parse(saved);
        } catch (error) {
          alert("Não foi possível restaurar os campos salvos deste sistema.");
          throw error;
        }
        if (!state || typeof state !== "object" || Array.isArray(state)) {
          throw new Error("Os campos salvos deste sistema estão inválidos.");
        }
        getFormControls(form).forEach((control) => {
          if (!Object.prototype.hasOwnProperty.call(state, control.id)) return;

          if (control.type === "checkbox" || control.type === "radio") {
            control.checked = Boolean(state[control.id]);
          } else {
            control.value = state[control.id];
          }
          control.dispatchEvent(new Event("input", { bubbles: true }));
          control.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }

      form.addEventListener("input", () => saveForm(form), true);
      form.addEventListener("change", () => saveForm(form), true);
    },
    { once: true },
  );
})();
