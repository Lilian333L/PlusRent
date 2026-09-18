/**
 * Gallery uploads in the dashboard: pick several photos, pick more later, and drag
 * them into the order they should appear in.
 *
 * Two things were broken. Each preview was written with `innerHTML +=` from inside
 * a FileReader callback, so when several photos were read at once the callbacks
 * overwrote each other and some previews vanished. And choosing files a second time
 * replaced the input's list rather than adding to it, so only the last selection was
 * ever uploaded. Both are fixed by keeping the chosen files in an array here and
 * rebuilding the input from it.
 *
 * Existing images on a car can be dragged too; their order is sent back as
 * gallery_images_order when the car is saved.
 */
(function () {
  "use strict";

  var staged = {}; // input id -> File[]

  function css() {
    if (document.getElementById("admin-gallery-css")) return;
    var st = document.createElement("style");
    st.id = "admin-gallery-css";
    st.textContent =
      ".ag-grid{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}" +
      ".ag-item{position:relative;width:112px;border:1px solid #e2e8f0;border-radius:8px;" +
      "background:#fff;padding:5px;cursor:grab;user-select:none}" +
      ".ag-item.dragging{opacity:.45}" +
      ".ag-item.over{outline:2px dashed #f59e0b;outline-offset:2px}" +
      ".ag-item img{display:block;width:100%;height:74px;object-fit:cover;border-radius:5px;background:#f1f5f9}" +
      ".ag-pos{position:absolute;top:-8px;left:-8px;min-width:22px;height:22px;border-radius:50%;" +
      "background:#0f172a;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}" +
      ".ag-del{position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;border:0;" +
      "background:#dc2626;color:#fff;font-size:13px;line-height:1;cursor:pointer;padding:0}" +
      ".ag-name{display:block;font-size:10px;color:#64748b;margin-top:3px;overflow:hidden;" +
      "text-overflow:ellipsis;white-space:nowrap}" +
      ".ag-hint{font-size:12px;color:#64748b;margin-top:6px}";
    document.head.appendChild(st);
  }

  function grid(preview) {
    var g = preview.querySelector(".ag-grid");
    if (!g) {
      g = document.createElement("div");
      g.className = "ag-grid";
      preview.innerHTML = "";
      preview.appendChild(g);
      var hint = document.createElement("div");
      hint.className = "ag-hint";
      hint.textContent = "Trage imaginile ca să le schimbi ordinea. Prima este cea principală în galerie.";
      preview.appendChild(hint);
    }
    return g;
  }

  function syncInput(input) {
    var files = staged[input.id] || [];
    if (typeof DataTransfer === "undefined") return;
    var dt = new DataTransfer();
    files.forEach(function (f) { dt.items.add(f); });
    input.files = dt.files;
  }

  function renumber(g) {
    var items = g.querySelectorAll(".ag-item");
    for (var i = 0; i < items.length; i++) {
      var badge = items[i].querySelector(".ag-pos");
      if (badge) badge.textContent = i + 1;
    }
  }

  function orderFromDom(g) {
    return Array.prototype.map.call(g.querySelectorAll(".ag-item"), function (el) {
      return el.dataset.url || el.dataset.name;
    });
  }

  function reorderStaged(input, g) {
    if (!input || !staged[input.id]) return;
    var names = Array.prototype.map.call(g.querySelectorAll('.ag-item[data-kind="file"]'), function (el) {
      return el.dataset.name;
    });
    staged[input.id].sort(function (a, b) {
      return names.indexOf(a.name) - names.indexOf(b.name);
    });
    syncInput(input);
  }

  function makeDraggable(g, input) {
    if (g.dataset.dnd) return;
    g.dataset.dnd = "1";
    var dragged = null;
    g.addEventListener("dragstart", function (e) {
      var item = e.target.closest(".ag-item");
      if (!item) return;
      dragged = item;
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", ""); } catch (err) {}
    });
    g.addEventListener("dragend", function () {
      if (dragged) dragged.classList.remove("dragging");
      Array.prototype.forEach.call(g.querySelectorAll(".ag-item"), function (el) { el.classList.remove("over"); });
      dragged = null;
      renumber(g);
      reorderStaged(input, g);
      g.dispatchEvent(new CustomEvent("ag:reordered", { bubbles: true }));
    });
    g.addEventListener("dragover", function (e) {
      e.preventDefault();
      var over = e.target.closest(".ag-item");
      if (!over || !dragged || over === dragged) return;
      Array.prototype.forEach.call(g.querySelectorAll(".ag-item"), function (el) { el.classList.remove("over"); });
      over.classList.add("over");
      var rect = over.getBoundingClientRect();
      var after = e.clientX > rect.left + rect.width / 2;
      g.insertBefore(dragged, after ? over.nextSibling : over);
    });
    g.addEventListener("drop", function (e) { e.preventDefault(); });
  }

  function addTile(g, opts) {
    var item = document.createElement("div");
    item.className = "ag-item";
    item.draggable = true;
    item.dataset.kind = opts.kind;
    if (opts.url) item.dataset.url = opts.url;
    if (opts.name) item.dataset.name = opts.name;
    item.innerHTML =
      '<span class="ag-pos"></span>' +
      '<button type="button" class="ag-del" aria-label="Remove">&times;</button>' +
      '<img alt="">' +
      (opts.name ? '<span class="ag-name">' + opts.name + "</span>" : "");
    item.querySelector("img").src = opts.src;
    g.appendChild(item);
    renumber(g);
    return item;
  }

  function wireInput(input, preview) {
    if (!input || !preview || input.dataset.agWired) return;
    input.dataset.agWired = "1";
    css();
    staged[input.id] = staged[input.id] || [];

    input.addEventListener("change", function () {
      var picked = Array.prototype.slice.call(input.files || []);
      if (!picked.length) return;
      var g = grid(preview);
      makeDraggable(g, input);

      var queue = picked.map(function (file) {
        return Promise.resolve()
          .then(function () {
            return typeof window.convertHeicToJpeg === "function"
              ? window.convertHeicToJpeg(file)
              : file;
          })
          .then(function (usable) {
            return new Promise(function (resolve) {
              var reader = new FileReader();
              reader.onload = function (ev) { resolve({ file: usable, src: ev.target.result }); };
              reader.onerror = function () { resolve(null); };
              reader.readAsDataURL(usable);
            });
          })
          .catch(function (err) {
            if (typeof window.showCustomAlert === "function") {
              window.showCustomAlert(err && err.message ? err.message : "Nu am putut citi imaginea.", "error");
            }
            return null;
          });
      });

      // one write to the DOM per photo, in the order chosen, after each is read
      Promise.all(queue).then(function (results) {
        results.forEach(function (r) {
          if (!r) return;
          var already = staged[input.id].some(function (f) {
            return f.name === r.file.name && f.size === r.file.size;
          });
          if (already) return;
          staged[input.id].push(r.file);
          addTile(g, { kind: "file", name: r.file.name, src: r.src });
        });
        syncInput(input);
      });
    });

    preview.addEventListener("click", function (e) {
      var btn = e.target.closest(".ag-del");
      if (!btn) return;
      e.preventDefault();
      var item = btn.closest(".ag-item");
      var g = item.parentElement;
      if (item.dataset.kind === "file") {
        staged[input.id] = (staged[input.id] || []).filter(function (f) { return f.name !== item.dataset.name; });
        item.remove();
        syncInput(input);
      } else if (item.dataset.url && typeof window.removeGalleryImageByUrl === "function") {
        window.removeGalleryImageByUrl(item.dataset.url);
        item.remove();
      } else {
        item.remove();
      }
      renumber(g);
    });
  }

  /** Render the images a car already has, so they can be reordered before saving. */
  function showExisting(previewId, urls, base) {
    var preview = document.getElementById(previewId);
    if (!preview) return;
    css();
    var input = document.getElementById(previewId.replace("Preview", "Input"));
    if (input) {
      staged[input.id] = []; // photos staged for a different car must not carry over
      input.value = "";
    }
    preview.innerHTML = "";
    var g = grid(preview);
    makeDraggable(g, input);
    (urls || []).forEach(function (u) {
      addTile(g, { kind: "url", url: u, src: u.indexOf("http") === 0 ? u : (base || "") + u });
    });
  }

  /** The order currently shown, for gallery_images_order on save. */
  function currentOrder(previewId) {
    var preview = document.getElementById(previewId);
    if (!preview) return [];
    var g = preview.querySelector(".ag-grid");
    if (!g) return [];
    return Array.prototype.map.call(g.querySelectorAll('.ag-item[data-kind="url"]'), function (el) {
      return el.dataset.url;
    });
  }

  function start() {
    [["addGalleryImagesInput", "addGalleryImagesPreview"],
     ["editGalleryImagesInput", "editGalleryImagesPreview"]].forEach(function (pair) {
      wireInput(document.getElementById(pair[0]), document.getElementById(pair[1]));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
  setTimeout(start, 1500);

  window.AdminGallery = {
    wire: wireInput,
    showExisting: showExisting,
    currentOrder: currentOrder,
    reset: function (inputId) {
      staged[inputId] = [];
      var input = document.getElementById(inputId);
      if (input) { input.value = ""; }
      var preview = document.getElementById(String(inputId).replace("Input", "Preview"));
      if (preview) preview.innerHTML = "";
    },
    files: function (inputId) { return staged[inputId] || []; },
  };
})();
