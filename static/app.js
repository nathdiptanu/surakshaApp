const form = document.querySelector("#recordForm");
const cards = document.querySelector("#cards");
const template = document.querySelector("#cardTemplate");
const statusEl = document.querySelector("#status");
const totalCount = document.querySelector("#totalCount");
const totalAmount = document.querySelector("#totalAmount");
const uploadBtn = document.querySelector("#uploadBtn");
const latestPdf = document.querySelector("#latestPdf");
const ordersBody = document.querySelector("#ordersBody");
const deleteOrdersBtn = document.querySelector("#deleteOrdersBtn");
const deleteSelectedBtn = document.querySelector("#deleteSelectedBtn");
const selectAllOrders = document.querySelector("#selectAllOrders");
const selectionSummary = document.querySelector("#selectionSummary");
const deleteModal = document.querySelector("#deleteModal");
const deleteForm = document.querySelector("#deleteForm");
const cancelDeleteBtn = document.querySelector("#cancelDeleteBtn");
const deleteModalTitle = document.querySelector("#deleteModalTitle");
const deleteModalMessage = document.querySelector("#deleteModalMessage");
const confirmDeleteBtn = document.querySelector("#confirmDeleteBtn");
const categories = window.SURETRACE_CATEGORIES;
const formats = window.SURETRACE_FORMATS;

let records = [];
let latestPreviewId = null;
let deleteMode = "all";

function formDataToJson(formEl) {
  return Object.fromEntries(new FormData(formEl).entries());
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function selectedOrderIds() {
  return [...document.querySelectorAll(".order-select:checked")].map((item) => Number(item.value));
}

function updateDashboardTotals() {
  const amount = records.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  totalCount.textContent = records.length;
  totalAmount.textContent = formatCurrency(amount);
}

function updateSelectionSummary() {
  const selected = selectedOrderIds();
  const selectedAmount = records
    .filter((record) => selected.includes(record.id))
    .reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  selectionSummary.textContent = selected.length
    ? `${selected.length} selected | ${formatCurrency(selectedAmount)}`
    : "Select mistaken orders to delete them safely.";
  deleteSelectedBtn.disabled = selected.length === 0;
  selectAllOrders.checked = records.length > 0 && selected.length === records.length;
  selectAllOrders.indeterminate = selected.length > 0 && selected.length < records.length;
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
  updateDashboardTotals();

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
  selectAllOrders.checked = false;
  selectAllOrders.indeterminate = false;
  records.forEach((record) => {
    const style = categories[record.category] || categories.other;
    const format = formats[record.format] || formats.pvc;
    const row = document.createElement("tr");
    const selectCell = document.createElement("td");
    selectCell.dataset.label = "Select";
    const checkbox = document.createElement("input");
    checkbox.className = "order-select";
    checkbox.type = "checkbox";
    checkbox.value = record.id;
    checkbox.setAttribute("aria-label", `Select ${record.code}`);
    checkbox.addEventListener("change", updateSelectionSummary);
    selectCell.appendChild(checkbox);
    row.appendChild(selectCell);
    [
      ["ID", record.code],
      ["Use case", style.label],
      ["Format", format.label],
      ["Name", record.name],
      ["Location", record.location],
      ["Emergency", record.emergency_contact],
      ["Amount", formatCurrency(record.amount)],
      ["Company", record.company || "-"],
      ["Created", record.created_at],
    ].forEach(([label, value]) => {
      const cell = document.createElement("td");
      cell.dataset.label = label;
      cell.textContent = value;
      row.appendChild(cell);
    });
    ordersBody.appendChild(row);
  });
  updateSelectionSummary();
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

function openDeleteModal(mode) {
  deleteMode = mode;
  const selected = selectedOrderIds();
  if (mode === "selected" && !selected.length) {
    statusEl.textContent = "Select at least one order first.";
    return;
  }
  deleteModalTitle.textContent = mode === "selected" ? "Delete selected orders?" : "Delete all order history?";
  deleteModalMessage.textContent = mode === "selected"
    ? `This will permanently remove ${selected.length} selected SureTrace order record(s).`
    : "This will permanently remove every stored SureTrace order from this local database.";
  confirmDeleteBtn.textContent = mode === "selected" ? "Delete Selected" : "Delete Everything";
  deleteModal.hidden = false;
  document.querySelector("#cleanupPassword").focus();
}

deleteOrdersBtn.addEventListener("click", () => openDeleteModal("all"));
deleteSelectedBtn.addEventListener("click", () => openDeleteModal("selected"));

selectAllOrders.addEventListener("change", () => {
  document.querySelectorAll(".order-select").forEach((item) => {
    item.checked = selectAllOrders.checked;
  });
  updateSelectionSummary();
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
  const selected = selectedOrderIds();
  const endpoint = deleteMode === "selected" ? "/api/records/delete-selected" : "/api/records/delete-all";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, ids: selected }),
  });
  const result = await response.json();
  if (!response.ok) {
    statusEl.textContent = result.error || "Could not delete order history.";
    return;
  }
  if (deleteMode === "all" || selected.includes(latestPreviewId)) {
    latestPreviewId = null;
  }
  deleteForm.reset();
  deleteModal.hidden = true;
  statusEl.textContent = `${result.deleted} order record(s) deleted.`;
  await loadRecords();
});

setFormatForCategory();
loadRecords();
