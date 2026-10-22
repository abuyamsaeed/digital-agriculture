const STORAGE_KEY = "aleppo-olive-orchard-v1";
const form = document.querySelector("#orchard-form");
const statusMessage = document.querySelector("#form-status");
const resultsPanel = document.querySelector("#results");
const emptyState = document.querySelector("#empty-state");
const printButton = document.querySelector("#print-button");

const fields = [
  "orchardName", "location", "farmer", "area", "trees", "treeAge",
  "yieldPerTree", "olivePrice", "currency", "waterDemand", "effectiveRain",
  "irrigationEfficiency", "nitrogenRate", "nitrogenPrice", "phosphorusRate",
  "phosphorusPrice", "potassiumRate", "potassiumPrice", "waterPrice",
  "laborCost", "otherCost"
];

function readForm() {
  return Object.fromEntries(fields.map((name) => [name, form.elements.namedItem(name).value.trim()]));
}

function setForm(data) {
  fields.forEach((name) => {
    if (Object.hasOwn(data, name)) form.elements.namedItem(name).value = data[name];
  });
}

function getNumbers(data) {
  const numericFields = fields.filter((name) => !["orchardName", "location", "farmer", "currency"].includes(name));
  return Object.fromEntries(numericFields.map((name) => [name, Number(data[name])]));
}

function formatNumber(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("ar-SY", { maximumFractionDigits }).format(value);
}

function formatMoney(value, currency) {
  return `${formatNumber(value, 0)} ${currency}`;
}

function calculate(data) {
  const numbers = getNumbers(data);
  const areaSquareMeters = numbers.area * 1000;
  const netIrrigationMm = Math.max(0, numbers.waterDemand - numbers.effectiveRain);
  const irrigationVolume = (areaSquareMeters * netIrrigationMm / 1000) / (numbers.irrigationEfficiency / 100);
  const nitrogen = numbers.nitrogenRate * numbers.area;
  const phosphorus = numbers.phosphorusRate * numbers.area;
  const potassium = numbers.potassiumRate * numbers.area;
  const fertilizerTotal = nitrogen + phosphorus + potassium;
  const fertilizerCost = nitrogen * numbers.nitrogenPrice
    + phosphorus * numbers.phosphorusPrice
    + potassium * numbers.potassiumPrice;
  const waterCost = irrigationVolume * numbers.waterPrice;
  const operatingCost = numbers.area * (numbers.laborCost + numbers.otherCost);
  const harvest = numbers.trees * numbers.yieldPerTree;
  const revenue = harvest * numbers.olivePrice;
  const costs = fertilizerCost + waterCost + operatingCost;

  return {
    irrigationVolume,
    nitrogen,
    phosphorus,
    potassium,
    fertilizerTotal,
    fertilizerCost,
    waterCost,
    operatingCost,
    harvest,
    revenue,
    costs,
    netProfit: revenue - costs,
    profitPerTree: (revenue - costs) / numbers.trees
  };
}

function show(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function displayResults(data, totals) {
  const currency = data.currency;
  const numbers = getNumbers(data);
  show("report-orchard-name", data.orchardName);
  show("report-location", data.location);
  show("report-farmer", data.farmer);
  show("report-area", formatNumber(numbers.area, 2));
  show("report-trees", formatNumber(numbers.trees, 0));
  show("report-age", formatNumber(numbers.treeAge, 0));
  show("water-assumptions", `${formatNumber(numbers.waterDemand, 0)} / ${formatNumber(numbers.effectiveRain, 0)} مم · ${formatNumber(numbers.irrigationEfficiency, 0)}٪`);
  show("yield-assumptions", `${formatNumber(numbers.yieldPerTree)} · ${formatMoney(numbers.olivePrice, currency)}`);
  show("fertilizer-assumptions", `${formatNumber(numbers.nitrogenRate, 2)} · ${formatNumber(numbers.phosphorusRate, 2)} · ${formatNumber(numbers.potassiumRate, 2)}`);
  show("fertilizer-price-assumptions", `${formatMoney(numbers.nitrogenPrice, currency)} · ${formatMoney(numbers.phosphorusPrice, currency)} · ${formatMoney(numbers.potassiumPrice, currency)}`);
  show("cost-assumptions", `${formatMoney(numbers.waterPrice, currency)}/م³ · ${formatMoney(numbers.laborCost, currency)}/دونم · ${formatMoney(numbers.otherCost, currency)}/دونم`);
  show("net-profit", formatMoney(totals.netProfit, currency));
  show("profit-caption", totals.netProfit < 0 ? "عجز تقديري وفق البيانات المدخلة" : "بعد خصم التكاليف المدخلة");
  show("water-volume", `${formatNumber(totals.irrigationVolume)} م³`);
  show("fertilizer-total", `${formatNumber(totals.fertilizerTotal)} كغ`);
  show("harvest-total", `${formatNumber(totals.harvest)} كغ`);
  show("cost-total", formatMoney(totals.costs, currency));
  show("revenue-total", formatMoney(totals.revenue, currency));
  show("fertilizer-cost", formatMoney(totals.fertilizerCost, currency));
  show("water-cost", formatMoney(totals.waterCost, currency));
  show("operating-cost", formatMoney(totals.operatingCost, currency));
  show("profit-per-tree", formatMoney(totals.profitPerTree, currency));
  emptyState.hidden = true;
  resultsPanel.hidden = false;
  printButton.disabled = false;
}

form.addEventListener("input", () => {
  if (!resultsPanel.hidden) {
    resultsPanel.hidden = true;
    emptyState.hidden = false;
    printButton.disabled = true;
    setStatus("تغيّرت البيانات. أعد الحساب لتحديث المؤشرات والتقرير.");
  }
});

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) {
    setStatus("تحقق من إدخال جميع البيانات المطلوبة والقيم ضمن الحدود المسموحة.", true);
    return;
  }

  const data = readForm();
  displayResults(data, calculate(data));
  setStatus("تم تحديث التقديرات. يمكنك الآن حفظ البيانات أو طباعة التقرير.");
});

document.querySelector("#save-button").addEventListener("click", () => {
  if (!form.reportValidity()) {
    setStatus("أكمل البيانات المطلوبة قبل حفظ ملف البستان.", true);
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readForm()));
    setStatus("تم حفظ بيانات البستان على هذا الجهاز.");
  } catch (error) {
    setStatus("تعذر حفظ البيانات في المتصفح. تحقق من إعدادات التخزين وحاول مجدداً.", true);
    console.error("Unable to save orchard data.", error);
  }
});

document.querySelector("#example-button").addEventListener("click", () => {
  setForm({
    orchardName: "بستان تجريبي", location: "ريف حلب", farmer: "مزارع تجريبي",
    area: "10", trees: "250", treeAge: "15", yieldPerTree: "20", olivePrice: "5000",
    currency: "ل.س", waterDemand: "450", effectiveRain: "200", irrigationEfficiency: "80",
    nitrogenRate: "5", nitrogenPrice: "4000", phosphorusRate: "3", phosphorusPrice: "5000",
    potassiumRate: "4", potassiumPrice: "4500", waterPrice: "100", laborCost: "25000",
    otherCost: "12000"
  });
  setStatus("هذه أرقام افتراضية للتوضيح فقط. استبدلها ببيانات بستانك وأسعار منطقتك.");
  form.requestSubmit();
});

printButton.addEventListener("click", () => window.print());

try {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    const data = JSON.parse(savedData);
    setForm(data);
    if (form.reportValidity()) {
      displayResults(data, calculate(data));
      setStatus("تم استعادة آخر بيانات محفوظة على هذا الجهاز.");
    } else {
      setStatus("البيانات المحفوظة غير مكتملة. راجع الحقول وأعد حفظها.", true);
    }
  }
} catch (error) {
  setStatus("تعذر قراءة البيانات المحفوظة. يمكنك متابعة العمل وإدخال بيانات جديدة.", true);
  console.error("Unable to load saved orchard data.", error);
}
