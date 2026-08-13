export type ExcelCell = string | number | null | undefined;

export type ChartSeries = {
  name: string;
  color: string;
  values: (number | null | undefined)[];
};

export type ChartImageSpec = {
  type: "bar" | "line" | "donut";
  categories: string[];
  series: ChartSeries[];
  percent?: boolean;
};

export type ChartWorkbookSpec = {
  element?: HTMLElement;
  title: string;
  unit: string;
  chart: ChartImageSpec;
  headers: string[];
  rows: ExcelCell[][];
  percentColumns?: number[];
  fileName?: string;
};

const encoder = new TextEncoder();
const xml = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function concat(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) { const out = new Uint8Array(2); new DataView(out.buffer).setUint16(0, value, true); return out; }
function u32(value: number) { const out = new Uint8Array(4); new DataView(out.buffer).setUint32(0, value >>> 0, true); return out; }

function createZip(files: { name: string; data: Uint8Array }[]) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = concat([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(dosTime), u16(dosDate), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name, file.data]);
    locals.push(local);
    const central = concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(dosTime), u16(dosDate), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]);
    centrals.push(central);
    offset += local.length;
  }
  const centralData = concat(centrals);
  const end = concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralData.length), u32(offset), u16(0)]);
  return concat([...locals, centralData, end]);
}

const chartPalette = ["#12355e", "#a99b5a", "#8c8c8e", "#6f7d8c", "#ed7d31", "#c9c9c9"];
const finite = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const chartNumber = (value: number, percent?: boolean) => percent ? `${(value * 100).toFixed(1)}%` : value.toLocaleString("zh-CN", { maximumFractionDigits: 1 });

function chartSvg(spec: ChartWorkbookSpec) {
  const width = 1000;
  const height = 520;
  const plot = { x: 78, y: 112, width: 862, height: 330 };
  const legend = spec.chart.series.map((series, index) => `<g transform="translate(${78 + index * 142},76)"><rect width="18" height="8" rx="2" fill="${series.color || chartPalette[index % chartPalette.length]}"/><text x="25" y="9" font-size="13" fill="#506274">${xml(series.name)}</text></g>`).join("");
  let body = "";

  if (spec.chart.type === "donut") {
    const values = spec.chart.series[0]?.values.map(finite) ?? [];
    const total = values.reduce((sum, value) => sum + Math.max(value, 0), 0) || 1;
    const radius = 132;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const rings = values.map((value, index) => {
      const length = Math.max(value, 0) / total * circumference;
      const ring = `<circle cx="300" cy="282" r="${radius}" fill="none" stroke="${chartPalette[index % chartPalette.length]}" stroke-width="66" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}"/>`;
      offset += length;
      return ring;
    }).join("");
    const items = spec.chart.categories.map((label, index) => `<g transform="translate(540,${145 + index * 47})"><rect width="14" height="14" rx="3" fill="${chartPalette[index % chartPalette.length]}"/><text x="25" y="13" font-size="15" fill="#506274">${xml(label)}</text><text x="370" y="13" text-anchor="end" font-size="16" font-weight="700" fill="#12355e">${xml(chartNumber(values[index] ?? 0))}</text></g>`).join("");
    body = `${rings}<circle cx="300" cy="282" r="93" fill="#fff"/><text x="300" y="279" text-anchor="middle" font-size="30" font-weight="700" fill="#12355e">${xml(chartNumber(total))}</text><text x="300" y="307" text-anchor="middle" font-size="14" fill="#7a8792">${xml(spec.unit)}</text>${items}`;
  } else {
    const values = spec.chart.series.flatMap((series) => series.values.map(finite));
    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);
    if (min === max) max = min + 1;
    const padding = (max - min) * .12;
    max += padding;
    if (min < 0) min -= padding;
    const y = (value: number) => plot.y + ((max - value) / (max - min)) * plot.height;
    const ticks = Array.from({ length: 5 }, (_, index) => min + (max - min) * index / 4);
    const grid = ticks.map((value) => `<line x1="${plot.x}" y1="${y(value)}" x2="${plot.x + plot.width}" y2="${y(value)}" stroke="#dfe5e9"/><text x="${plot.x - 12}" y="${y(value) + 4}" text-anchor="end" font-size="12" fill="#778797">${xml(chartNumber(value, spec.chart.percent))}</text>`).join("");
    const count = Math.max(spec.chart.categories.length, 1);
    const labelEvery = Math.max(1, Math.ceil(count / 12));
    const xLabels = spec.chart.categories.map((label, index) => index % labelEvery === 0 || index === count - 1 ? `<text x="${plot.x + (index + .5) * plot.width / count}" y="470" text-anchor="middle" font-size="12" fill="#6e8296">${xml(label)}</text>` : "").join("");
    if (spec.chart.type === "bar") {
      const groupWidth = plot.width / count;
      const barWidth = Math.min(34, Math.max(4, groupWidth * .72 / Math.max(spec.chart.series.length, 1)));
      const zeroY = y(0);
      const bars = spec.chart.categories.map((_, categoryIndex) => spec.chart.series.map((series, seriesIndex) => {
        const value = finite(series.values[categoryIndex]);
        const valueY = y(value);
        const left = plot.x + categoryIndex * groupWidth + (groupWidth - barWidth * spec.chart.series.length) / 2 + seriesIndex * barWidth;
        return `<rect x="${left}" y="${Math.min(valueY, zeroY)}" width="${Math.max(barWidth - 2, 2)}" height="${Math.max(Math.abs(zeroY - valueY), 2)}" rx="1.5" fill="${series.color || chartPalette[seriesIndex % chartPalette.length]}"/>`;
      }).join("")).join("");
      body = `${grid}<line x1="${plot.x}" y1="${zeroY}" x2="${plot.x + plot.width}" y2="${zeroY}" stroke="#9aa9b5"/>${bars}${xLabels}`;
    } else {
      const lines = spec.chart.series.map((series, seriesIndex) => {
        const color = series.color || chartPalette[seriesIndex % chartPalette.length];
        const points = series.values.map((value, index) => `${plot.x + (index + .5) * plot.width / count},${y(finite(value))}`).join(" ");
        const dots = series.values.map((value, index) => `<circle cx="${plot.x + (index + .5) * plot.width / count}" cy="${y(finite(value))}" r="3.2" fill="${color}" stroke="#fff" stroke-width="1.2"/>`).join("");
        return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
      }).join("");
      body = `${grid}${lines}${xLabels}`;
    }
  }
  return { width, height, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/><rect x="1" y="1" width="998" height="518" rx="12" fill="none" stroke="#d4dde3"/><text x="28" y="42" font-family="Microsoft YaHei,Arial,sans-serif" font-size="24" font-weight="700" fill="#102b48">${xml(spec.title)}</text><text x="970" y="42" text-anchor="end" font-family="Microsoft YaHei,Arial,sans-serif" font-size="14" fill="#506274">${xml(spec.unit)}</text><g font-family="Microsoft YaHei,Arial,sans-serif">${spec.chart.type === "donut" ? "" : legend}${body}</g></svg>` };
}

async function chartPng(spec: ChartWorkbookSpec) {
  const { svg, width, height } = chartSvg(spec);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("图表图片生成失败")); image.src = url; });
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器不支持图表导出");
    context.scale(scale, scale);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("图片编码失败")), "image/png"));
    return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
  } finally { URL.revokeObjectURL(url); }
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";
  while (value) { value -= 1; name = String.fromCharCode(65 + value % 26) + name; value = Math.floor(value / 26); }
  return name;
}

function cellXml(value: ExcelCell, row: number, column: number, style: number) {
  const ref = `${columnName(column)}${row}`;
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

function chartPart(spec: ChartWorkbookSpec, categoryColumn: number, seriesStartColumn: number) {
  const sheet = "'图表与原始数据'";
  const count = spec.chart.categories.length;
  const categoryRange = `${sheet}!$${columnName(categoryColumn)}$2:$${columnName(categoryColumn)}$${count + 1}`;
  const stringCache = (values: string[]) => `<c:strCache><c:ptCount val="${values.length}"/>${values.map((value, index) => `<c:pt idx="${index}"><c:v>${xml(value)}</c:v></c:pt>`).join("")}</c:strCache>`;
  const numberCache = (values: (number | null | undefined)[]) => `<c:numCache><c:formatCode>${spec.chart.percent ? "0.0%" : "#,##0.0"}</c:formatCode><c:ptCount val="${values.length}"/>${values.map((value, index) => typeof value === "number" && Number.isFinite(value) ? `<c:pt idx="${index}"><c:v>${value}</c:v></c:pt>` : "").join("")}</c:numCache>`;
  const seriesXml = spec.chart.series.map((series, index) => {
    const column = seriesStartColumn + index;
    const header = `${sheet}!$${columnName(column)}$1`;
    const values = `${sheet}!$${columnName(column)}$2:$${columnName(column)}$${count + 1}`;
    const color = (series.color || chartPalette[index % chartPalette.length]).replace("#", "").toUpperCase();
    const points = spec.chart.type === "donut" ? spec.chart.categories.map((_, pointIndex) => `<c:dPt><c:idx val="${pointIndex}"/><c:spPr><a:solidFill><a:srgbClr val="${chartPalette[pointIndex % chartPalette.length].slice(1).toUpperCase()}"/></a:solidFill></c:spPr></c:dPt>`).join("") : "";
    const marker = spec.chart.type === "line" ? `<c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></c:spPr></c:marker>` : "";
    return `<c:ser><c:idx val="${index}"/><c:order val="${index}"/><c:tx><c:strRef><c:f>${header}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${xml(series.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx>${points}<c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln></c:spPr>${marker}<c:cat><c:strRef><c:f>${categoryRange}</c:f>${stringCache(spec.chart.categories)}</c:strRef></c:cat><c:val><c:numRef><c:f>${values}</c:f>${numberCache(series.values)}</c:numRef></c:val></c:ser>`;
  }).join("");
  const categoryAxis = `<c:catAx><c:axId val="48650112"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:solidFill><a:srgbClr val="9AA9B5"/></a:solidFill></a:ln></c:spPr><c:crossAx val="48672768"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx>`;
  const valueAxis = `<c:valAx><c:axId val="48672768"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:numFmt formatCode="${spec.chart.percent ? "0.0%" : "#,##0.0"}" sourceLinked="0"/><c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="DFE5E9"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:solidFill><a:srgbClr val="9AA9B5"/></a:solidFill></a:ln></c:spPr><c:crossAx val="48650112"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
  const plot = spec.chart.type === "bar"
    ? `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${seriesXml}<c:gapWidth val="80"/><c:overlap val="0"/><c:axId val="48650112"/><c:axId val="48672768"/></c:barChart>${categoryAxis}${valueAxis}`
    : spec.chart.type === "line"
      ? `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${seriesXml}<c:smooth val="0"/><c:axId val="48650112"/><c:axId val="48672768"/></c:lineChart>${categoryAxis}${valueAxis}`
      : `<c:doughnutChart><c:varyColors val="1"/>${seriesXml}<c:holeSize val="58"/><c:firstSliceAng val="270"/></c:doughnutChart>`;
  const legend = spec.chart.type === "donut" || spec.chart.series.length > 1 ? `<c:legend><c:legendPos val="r"/><c:layout/><c:overlay val="0"/></c:legend>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:date1904 val="0"/><c:lang val="zh-CN"/><c:roundedCorners val="0"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="1600" b="1"><a:solidFill><a:srgbClr val="12355E"/></a:solidFill></a:rPr><a:t>${xml(spec.title)}</a:t></a:r></a:p></c:rich></c:tx><c:layout/><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>${plot}</c:plotArea>${legend}<c:plotVisOnly val="0"/><c:dispBlanksAs val="gap"/><c:showDLblsOverMax val="0"/></c:chart><c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings></c:chartSpace>`;
}

function workbookFiles(spec: ChartWorkbookSpec) {
  const dataStart = 24;
  const percent = new Set(spec.percentColumns ?? []);
  const chartCategoryColumn = Math.max(spec.headers.length + 2, 9);
  const chartSeriesColumn = chartCategoryColumn + 1;
  const rowMap = new Map<number, string[]>();
  const add = (row:number, cell:string) => rowMap.set(row, [...(rowMap.get(row) ?? []), cell]);
  add(dataStart, `<c r="A${dataStart}" t="inlineStr" s="1"><is><t>${xml(spec.title)}</t></is></c>`);
  add(dataStart + 1, `<c r="A${dataStart + 1}" t="inlineStr"><is><t>单位：${xml(spec.unit)}</t></is></c>`);
  spec.headers.forEach((header, index) => add(dataStart + 3, cellXml(header, dataStart + 3, index, 2)));
  spec.rows.forEach((values, rowIndex) => {
    const number = dataStart + 4 + rowIndex;
    values.forEach((value, column) => add(number, cellXml(value, number, column, typeof value === "number" ? (percent.has(column) ? 3 : 4) : 0)));
  });
  add(1, cellXml("月份", 1, chartCategoryColumn, 2));
  spec.chart.series.forEach((series, index) => add(1, cellXml(series.name, 1, chartSeriesColumn + index, 2)));
  spec.chart.categories.forEach((category, index) => {
    const row = index + 2;
    add(row, cellXml(category, row, chartCategoryColumn, 0));
    spec.chart.series.forEach((series, seriesIndex) => add(row, cellXml(series.values[index], row, chartSeriesColumn + seriesIndex, spec.chart.percent ? 3 : 4)));
  });
  const rows = [...rowMap.entries()].sort((a,b)=>a[0]-b[0]).map(([number,cells])=>`<row r="${number}"${number===dataStart?' ht="24"':''}>${cells.join("")}</row>`).join("");
  const visibleCols = spec.headers.map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="${index === 0 ? 18 : 20}" customWidth="1"/>`).join("");
  const hiddenCols = `<col min="${chartCategoryColumn + 1}" max="${chartSeriesColumn + spec.chart.series.length}" width="12" hidden="1" customWidth="1"/>`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"/></sheetViews><cols>${visibleCols}${hiddenCols}</cols><sheetData>${rows}</sheetData><drawing r:id="rId1"/></worksheet>`;
  const drawing = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>21</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="${xml(spec.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;
  const chart = chartPart(spec, chartCategoryColumn, chartSeriesColumn);
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="0.0%"/><numFmt numFmtId="165" formatCode="#,##0.0"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF173E69"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173E69"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files = [
    { name: "[Content_Types].xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`) },
    { name: "_rels/.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { name: "xl/workbook.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="图表与原始数据" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode(sheet) },
    { name: "xl/worksheets/_rels/sheet1.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`) },
    { name: "xl/drawings/drawing1.xml", data: encoder.encode(drawing) },
    { name: "xl/drawings/_rels/drawing1.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>`) },
    { name: "xl/styles.xml", data: encoder.encode(styles) },
    { name: "xl/charts/chart1.xml", data: encoder.encode(chart) },
  ];
  return createZip(files);
}

export async function exportChartWorkbook(spec: ChartWorkbookSpec) {
  const bytes = buildChartWorkbookBytes(spec);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(spec.fileName || spec.title).replace(/[\\/:*?"<>|]/g, "_")}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

export function buildChartWorkbookBytes(spec: ChartWorkbookSpec) {
  return workbookFiles(spec);
}
