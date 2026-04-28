const form = document.querySelector("#recordForm");
const cards = document.querySelector("#cards");
const template = document.querySelector("#cardTemplate");
const statusEl = document.querySelector("#status");
const totalCount = document.querySelector("#totalCount");
const uploadBtn = document.querySelector("#uploadBtn");
const latestPdf = document.querySelector("#latestPdf");
const ordersBody = document.querySelector("#ordersBody");
const deleteOrdersBtn = document.querySelector("#deleteOrdersBtn");
const deleteModal = document.querySelector("#deleteModal");
const deleteForm = document.querySelector("#deleteForm");
const cancelDeleteBtn = document.querySelector("#cancelDeleteBtn");
const categories = window.SURETRACE_CATEGORIES;
const formats = window.SURETRACE_FORMATS;

let records = [];
let latestPreviewId = null;

function formDataToJson(formEl) {
  return Object.fromEntries(new FormData(formEl).entries());
}

function setFormatForCategory() {
  const category = form.elements.category.value;
  const defaults = {
    kids: "jacket_tag",
    elderly: "sticker_round",
    bike: "vehicle_sticker",
    car: "vehicle_sticker",
    employee: "employee_badge",
    other: "pvc",
  };
  form.elements.format.value = defaults[category] || "pvc";
}

function renderLatestCard() {
  cards.innerHTML = "";
  totalCount.textContent = records.length;

  if (!latestPreviewId) {
    cards.innerHTML = `<p class="status">No card preview selected. Create one record to preview it, or use PDF download for bulk uploads.</p>`;
    return;
  }

  const record = records.find((item) => item.id === latestPreviewId);
  if (!record) return;

  const item = template.content.cloneNode(true);
  const article = item.querySelector(".qr-card");
  const style = categories[record.category] || categories.other;
  const format = formats[record.format] || formats.pvc;
  article.classList.add(`format-${record.format}`);
  article.style.setProperty("--card-accent", style.accent);
  article.style.setProperty("--card-dark", style.dark);
  article.style.setProperty("--card-light", style.light);
  article.dataset.id = record.id;
  article.querySelector(".card-band").style.background = `linear-gradient(90deg, ${style.dark}, ${style.accent}, ${style.light})`;
  article.querySelector(".category").textContent = `${style.label} | ${format.label}`;
  article.querySelector(".category-icon").classList.add(`icon-${record.category}`);
  article.querySelector(".qr-preview").src = `/qr/${record.id}.png`;
  article.querySelector(".code").textContent = record.code;
  cards.appendChild(item);
}

function renderOrders() {
  ordersBody.innerHTML = "";
  records.forEach((record) => {
    const style = categories[record.category] || categories.other;
    const format = formats[record.format] || formats.pvc;
    const row = document.createElement("tr");
    [
      record.code,
      style.label,
      format.label,
      record.name,
      record.location,
      record.emergency_contact,
      record.company || "-",
      record.created_at,
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    ordersBody.appendChild(row);
  });
}

async function loadRecords() {
  const response = await fetch("/api/records");
  records = await response.json();
  renderLatestCard();
  renderOrders();
}

form.elements.category.addEventListener("change", setFormatForCategory);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const response = await fetch("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formDataToJson(form)),
  });
  const result = await response.json();
  if (!response.ok) {
    statusEl.textContent = result.error || "Could not create the QR record.";
    return;
  }
  latestPreviewId = result.id;
  form.reset();
  setFormatForCategory();
  statusEl.textContent = "QR record created.";
  await loadRecords();
});

uploadBtn.addEventListener("click", async () => {
  const file = document.querySelector("#bulkFile").files[0];
  if (!file) {
    statusEl.textContent = "Choose a CSV or Excel file first.";
    return;
  }

  const body = new FormData();
  body.append("file", file);
  statusEl.textContent = "Uploading rows...";
  const response = await fetch("/api/upload", { method: "POST", body });
  const result = await response.json();
  if (!response.ok) {
    statusEl.textContent = result.error || "Upload failed.";
    return;
  }
  latestPreviewId = null;
  statusEl.textContent = `${result.count} rows uploaded.`;
  await loadRecords();
});

latestPdf.addEventListener("click", () => {
  if (!latestPreviewId) {
    statusEl.textContent = "Create one card first, then download the latest PDF.";
    return;
  }
  window.location.href = `/download/pdf?ids=${latestPreviewId}`;
});

deleteOrdersBtn.addEventListener("click", () => {
  deleteModal.hidden = false;
  document.querySelector("#cleanupPassword").focus();
});

cancelDeleteBtn.addEventListener("click", () => {
  deleteForm.reset();
  deleteModal.hidden = true;
});

deleteModal.addEventListener("click", (event) => {
  if (event.target === deleteModal) {
    deleteForm.reset();
    deleteModal.hidden = true;
  }
});

deleteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = new FormData(deleteForm).get("password");
  const response = await fetch("/api/records/delete-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const result = await response.json();
  if (!response.ok) {
    statusEl.textContent = result.error || "Could not delete order history.";
    return;
  }
  latestPreviewId = null;
  deleteForm.reset();
  deleteModal.hidden = true;
  statusEl.textContent = `${result.deleted} order records deleted.`;
  await loadRecords();
});

setFormatForCategory();
loadRecords();
