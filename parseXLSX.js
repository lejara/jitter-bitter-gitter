const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const workbook = XLSX.readFile(path.join(__dirname, "./data/locals.xlsx"));
const sheetNames = workbook.SheetNames;

const sheets = {};
sheetNames.forEach((name) => {
  const sheet = workbook.Sheets[name];

  // Convert to an array of objects (header row → object keys)
  const allRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1, // ➞ treat first row as data (no keys), so output is rows of arrays
    defval: null, // ➞ fill empty cells with null instead of skipping them
  });

  const data = allRows
    .slice(1) // skip first row
    .map((row) => row.slice(1)); // skip first column
  console.log(name);
  sheets[name] = data;
});

dumpToJSON(sheets);

function dumpToJSON(data, fileName = "locals.json") {
  const outPath = path.join(__dirname, `./data/${fileName}`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      data,
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2
    ),
    "utf-8"
  );
}
