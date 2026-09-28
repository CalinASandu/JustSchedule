// Week tabs in the school's planning spreadsheet.
//
// Layout (copied from the school's existing sheet):
//   Day row:    "Day" | Monday (merged over 3 cols) | Tuesday | ... | Friday
//   Header row: "Room" | "" | "Necesar (calculator, foi etc)" | "Student Full Name & Course Subject" | ...
//   One block per slot: the start time in column A (merged down the block), one
//   row per seat. An entry goes in the day's "Student" column.
//
// Tabs are recognised by the Monday..Friday date serials in their day row, not
// by title, so the school's own tab names ("28-2 October") keep working.

import {
  a1,
  batchGetValues,
  batchUpdate,
  batchUpdateValues,
  columnLetter,
  dateSerial,
  getTabGrid,
  type GridRange,
  type TabProperties,
} from "../_shared/google.ts";

export type SheetEntry = {
  reservationId: string;
  date: string; // ISO date
  slotStart: string; // "HH:MM"
  text: string;
};

export type SlotTemplate = { start: string; seats: number };

type Block = { startRow: number; endRow: number }; // endRow exclusive

type WeekLayout = {
  tab: TabProperties;
  values: unknown[][];
  frozenRowCount: number;
  studentColumns: number[]; // Monday..Friday
  blocks: Map<string, Block>; // by "HH:MM"
};

export type WeekTabIndex = {
  byMonday: Map<number, TabProperties>;
  latest: { monday: number; tab: TabProperties } | null;
  titles: Set<string>;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SCAN_ROWS = 12;
const READ_RANGE = "A1:ZZ400";

/** Monday of the ISO date's week, as an ISO date. */
export function mondayOf(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

/** "21-25 September", or "28 September - 2 October" across months. */
function weekTitle(mondayIso: string) {
  const monday = addDays(mondayIso, 0);
  const friday = addDays(mondayIso, 4);
  const startMonth = MONTHS[monday.getUTCMonth()];
  const endMonth = MONTHS[friday.getUTCMonth()];
  return startMonth === endMonth
    ? `${monday.getUTCDate()}-${friday.getUTCDate()} ${endMonth}`
    : `${monday.getUTCDate()} ${startMonth} - ${friday.getUTCDate()} ${endMonth}`;
}

function uniqueTitle(title: string, titles: Set<string>) {
  let candidate = title;
  for (let n = 2; titles.has(candidate); n += 1) candidate = `${title} (${n})`;
  return candidate;
}

function isBlank(value: unknown) {
  return value === undefined || value === null || String(value).trim() === "";
}

function timeKey(dayFraction: number) {
  const minutes = Math.round(dayFraction * 1440);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Row index whose cells hold monday..monday+4, and the column of each day. */
function findDayRow(values: unknown[][], monday: number, maxRows = values.length) {
  for (let row = 0; row < Math.min(maxRows, values.length); row += 1) {
    const cells = values[row] ?? [];
    const columns = [0, 1, 2, 3, 4].map((offset) => cells.indexOf(monday + offset));
    if (columns.every((column) => column > 0)) return { row, columns };
  }
  return null;
}

/** Finds every week tab in one read of the top rows of all tabs. */
export async function indexWeekTabs(spreadsheetId: string, tabs: TabProperties[]) {
  const tops = await batchGetValues(
    spreadsheetId,
    tabs.map((tab) => a1(tab.title, `A1:Z${SCAN_ROWS}`)),
  );

  const index: WeekTabIndex = {
    byMonday: new Map(),
    latest: null,
    titles: new Set(tabs.map((tab) => tab.title)),
  };

  tabs.forEach((tab, i) => {
    for (const row of tops[i] ?? []) {
      for (const value of row) {
        // Monday serials are ≡ 2 (mod 7); the next four days must be in the same row.
        if (typeof value !== "number" || !Number.isInteger(value) || value % 7 !== 2) continue;
        if (![1, 2, 3, 4].every((offset) => row.includes(value + offset))) continue;
        index.byMonday.set(value, tab);
        if (!index.latest || value > index.latest.monday) index.latest = { monday: value, tab };
        return;
      }
    }
  });

  return index;
}

async function readLayout(
  spreadsheetId: string,
  tab: TabProperties,
  monday: number,
): Promise<WeekLayout> {
  const [[values], { merges, frozenRowCount }] = await Promise.all([
    batchGetValues(spreadsheetId, [a1(tab.title, READ_RANGE)]),
    getTabGrid(spreadsheetId, tab.title),
  ]);

  const dayRow = findDayRow(values, monday);
  if (!dayRow) throw new Error(`Tab "${tab.title}" has no Monday-Friday date row.`);

  const mergeAt = (row: number, column: number) =>
    merges.find(
      (merge: GridRange) =>
        merge.startRowIndex === row && merge.startColumnIndex === column,
    );

  const headerCells = values[dayRow.row + 1] ?? [];
  const studentColumns = dayRow.columns.map((column) => {
    const end = mergeAt(dayRow.row, column)?.endColumnIndex ?? column + 3;
    for (let c = column; c < end; c += 1) {
      if (String(headerCells[c] ?? "").toLowerCase().includes("student")) return c;
    }
    return end - 1;
  });

  const blocks = new Map<string, Block>();
  for (let row = dayRow.row + 2; row < values.length; row += 1) {
    const cell = values[row]?.[0];
    if (typeof cell !== "number" || cell < 0 || cell >= 1) continue;
    const key = timeKey(cell);
    if (!blocks.has(key)) {
      blocks.set(key, { startRow: row, endRow: mergeAt(row, 0)?.endRowIndex ?? row + 1 });
    }
  }

  return { tab, values, frozenRowCount, studentColumns, blocks };
}

type WeekPlan = {
  writes: { range: string; values: unknown[][] }[];
  removed: string[];
  added: SheetEntry[];
  problems: string[];
  missingRows: Map<string, number>; // block key -> rows to insert
};

function weekdayIndex(isoDate: string, mondayIso: string) {
  return dateSerial(isoDate) - dateSerial(mondayIso);
}

function planWeek(
  layout: WeekLayout,
  mondayIso: string,
  removals: SheetEntry[],
  additions: SheetEntry[],
): WeekPlan {
  const plan: WeekPlan = { writes: [], removed: [], added: [], problems: [], missingRows: new Map() };
  const cellValue = new Map<string, unknown>();
  const read = (row: number, column: number) =>
    cellValue.has(`${row}:${column}`)
      ? cellValue.get(`${row}:${column}`)
      : layout.values[row]?.[column];
  const write = (row: number, column: number, value: string) => {
    cellValue.set(`${row}:${column}`, value);
    plan.writes.push({
      range: a1(layout.tab.title, `${columnLetter(column)}${row + 1}`),
      values: [[value]],
    });
  };

  const locate = (entry: SheetEntry) => {
    const column = layout.studentColumns[weekdayIndex(entry.date, mondayIso)];
    const block = layout.blocks.get(entry.slotStart);
    return column === undefined || !block ? null : { column, block };
  };

  // Only clear a cell that still holds exactly what we wrote; a coordinator's
  // edits are left alone.
  for (const entry of removals) {
    plan.removed.push(entry.reservationId);
    const place = locate(entry);
    if (!place) continue;
    for (let row = place.block.startRow; row < place.block.endRow; row += 1) {
      if (String(read(row, place.column) ?? "").trim() === entry.text.trim()) {
        write(row, place.column, "");
        break;
      }
    }
  }

  for (const entry of additions) {
    const place = locate(entry);
    if (!place) {
      plan.problems.push(`Tab "${layout.tab.title}" has no ${entry.slotStart} block for ${entry.date}.`);
      continue;
    }

    let placed = false;
    for (let row = place.block.startRow; row < place.block.endRow && !placed; row += 1) {
      if (isBlank(read(row, place.column))) {
        write(row, place.column, entry.text);
        plan.added.push(entry);
        placed = true;
      }
    }

    if (!placed) {
      plan.missingRows.set(entry.slotStart, (plan.missingRows.get(entry.slotStart) ?? 0) + 1);
    }
  }

  return plan;
}

/**
 * Adds rows inside full blocks (before each block's last row, so the time cell's
 * merge and formatting stretch over them). Bottom blocks first keeps indices valid.
 */
async function growBlocks(spreadsheetId: string, layout: WeekLayout, missing: Map<string, number>) {
  const requests = [...missing.entries()]
    .map(([key, rows]) => ({ block: layout.blocks.get(key)!, rows }))
    .sort((a, b) => b.block.startRow - a.block.startRow)
    .map(({ block, rows }) => ({
      insertDimension: {
        range: {
          sheetId: layout.tab.sheetId,
          dimension: "ROWS",
          startIndex: block.endRow - 1,
          endIndex: block.endRow - 1 + rows,
        },
        inheritFromBefore: true,
      },
    }));
  await batchUpdate(spreadsheetId, requests);
}

// ---------------------------------------------------------------------------
// Read-only notice: two rows (English, Romanian) at the top of every week tab.

const APP_URL = "https://justschedule.app";
const APP_LINK_TEXT = "justschedule.app";
const NOTICE_LINES = [
  "⚠ READ ONLY – Do not make any changes in this spreadsheet. It is filled in automatically " +
    "by JustSchedule and changes made here are not saved in the app. To book, change or cancel " +
    `an exam, use the app at ${APP_LINK_TEXT}. Each tab is one week (Monday–Friday), each ` +
    "coloured block is an exam time slot and each row is a seat: Name, Subject, Final/Midterm.",
  "⚠ DOAR CITIRE – Nu faceți nicio modificare în acest tabel. Este completat automat de " +
    "JustSchedule, iar modificările făcute aici nu sunt salvate în aplicație. Pentru a " +
    `programa, modifica sau anula un examen, folosiți aplicația la ${APP_LINK_TEXT}. Fiecare ` +
    "tab este o săptămână (luni–vineri), fiecare bloc colorat este un interval de examen, iar " +
    "fiecare rând este un loc: Nume, Materie, Final/Midterm.",
];
// Recognises the notice rows, including older wordings, so they are updated in place.
const NOTICE_PREFIXES = ["⚠ READ ONLY", "⚠ DOAR CITIRE"];

function noticeText(layout: WeekLayout, row: number) {
  return String(layout.values[row]?.[0] ?? "");
}

function hasNotice(layout: WeekLayout) {
  return NOTICE_PREFIXES.some((prefix) => noticeText(layout, 0).startsWith(prefix));
}

function noticeIsCurrent(layout: WeekLayout) {
  return NOTICE_LINES.every((line, row) => noticeText(layout, row) === line);
}

/** Writes the notice text with the app address as a clickable link. */
function noticeTextRequest(sheetId: number) {
  return {
    updateCells: {
      start: { sheetId, rowIndex: 0, columnIndex: 0 },
      rows: NOTICE_LINES.map((line) => {
        const linkStart = line.indexOf(APP_LINK_TEXT);
        return {
          values: [
            {
              userEnteredValue: { stringValue: line },
              textFormatRuns: [
                {
                  startIndex: linkStart,
                  format: { link: { uri: APP_URL }, underline: true, foregroundColor: rgb("1155CC") },
                },
                // Back to the cell's own format (bold dark red) after the link.
                { startIndex: linkStart + APP_LINK_TEXT.length, format: {} },
              ],
            },
          ],
        };
      }),
      fields: "userEnteredValue,textFormatRuns",
    },
  };
}

/**
 * Inserts the notice rows above everything else, merged across the table.
 * Rows below (and their merges) move down; a frozen header stays frozen.
 */
async function addNotice(spreadsheetId: string, layout: WeekLayout) {
  const { sheetId } = layout.tab;
  const rows = NOTICE_LINES.length;
  const width = Math.max(...layout.studentColumns) + 1;

  await batchUpdate(spreadsheetId, [
    {
      insertDimension: {
        range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: rows },
        inheritFromBefore: false,
      },
    },
    ...NOTICE_LINES.map((_, row) => ({
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: row,
          endRowIndex: row + 1,
          startColumnIndex: 0,
          endColumnIndex: width,
        },
        mergeType: "MERGE_ALL",
      },
    })),
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: rows, startColumnIndex: 0, endColumnIndex: width },
        cell: {
          userEnteredFormat: {
            backgroundColor: rgb("FFE0E0"),
            textFormat: { bold: true, fontSize: 11, foregroundColor: rgb("C00000") },
            horizontalAlignment: "LEFT",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
            borders: {
              top: { style: "SOLID_MEDIUM", color: rgb("C00000") },
              bottom: { style: "SOLID_MEDIUM", color: rgb("C00000") },
              left: { style: "SOLID_MEDIUM", color: rgb("C00000") },
              right: { style: "SOLID_MEDIUM", color: rgb("C00000") },
            },
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,borders)",
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: rows },
        properties: { pixelSize: 44 },
        fields: "pixelSize",
      },
    },
    ...(layout.frozenRowCount > 0
      ? [
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: { frozenRowCount: layout.frozenRowCount + rows },
              },
              fields: "gridProperties.frozenRowCount",
            },
          },
        ]
      : []),
    noticeTextRequest(sheetId),
  ]);
}

/** Applies one week's removals and additions to its tab. */
export async function syncWeek(
  spreadsheetId: string,
  tab: TabProperties,
  mondayIso: string,
  removals: SheetEntry[],
  additions: SheetEntry[],
) {
  const monday = dateSerial(mondayIso);
  let layout = await readLayout(spreadsheetId, tab, monday);

  if (!hasNotice(layout)) {
    await addNotice(spreadsheetId, layout);
    layout = await readLayout(spreadsheetId, tab, monday);
  } else if (!noticeIsCurrent(layout)) {
    await batchUpdate(spreadsheetId, [noticeTextRequest(tab.sheetId)]);
  }

  let plan = planWeek(layout, mondayIso, removals, additions);

  if (plan.missingRows.size > 0) {
    await growBlocks(spreadsheetId, layout, plan.missingRows);
    layout = await readLayout(spreadsheetId, tab, monday);
    plan = planWeek(layout, mondayIso, removals, additions);
  }

  await batchUpdateValues(spreadsheetId, plan.writes);
  return plan;
}

/**
 * Creates the week's tab. Copies the latest existing week tab (keeping its
 * rules, colours, merges and widths), then sets the new dates and empties the
 * student cells. With no week tab to copy, builds the layout from the slots.
 */
export async function createWeekTab(
  spreadsheetId: string,
  index: WeekTabIndex,
  mondayIso: string,
  slots: SlotTemplate[],
) {
  const title = uniqueTitle(weekTitle(mondayIso), index.titles);
  const monday = dateSerial(mondayIso);

  if (index.latest) {
    const source = index.latest.tab;
    const [reply] = await batchUpdate(spreadsheetId, [
      {
        duplicateSheet: {
          sourceSheetId: source.sheetId,
          insertSheetIndex: source.index + 1,
          newSheetName: title,
        },
      },
    ]);
    const tab: TabProperties = reply.duplicateSheet.properties;
    const copy = await readLayout(spreadsheetId, tab, index.latest.monday);
    const dayRow = findDayRow(copy.values, index.latest.monday)!;

    const writes: { range: string; values: unknown[][] }[] = dayRow.columns.map((column, offset) => ({
      range: a1(title, `${columnLetter(column)}${dayRow.row + 1}`),
      values: [[monday + offset]],
    }));
    // Empty every day's cells in the blocks, keeping only the template "X" marks.
    const lastColumn = Math.max(...copy.studentColumns);
    for (const block of copy.blocks.values()) {
      const rows = [];
      for (let row = block.startRow; row < block.endRow; row += 1) {
        const cells = [];
        for (let column = 1; column <= lastColumn; column += 1) {
          cells.push(String(copy.values[row]?.[column] ?? "").trim() === "X" ? "X" : "");
        }
        rows.push(cells);
      }
      writes.push({
        range: a1(title, `B${block.startRow + 1}:${columnLetter(lastColumn)}${block.endRow}`),
        values: rows,
      });
    }
    await batchUpdateValues(spreadsheetId, writes);

    registerTab(index, monday, tab);
    return tab;
  }

  const tab = await buildFreshWeekTab(spreadsheetId, title, monday, slots);
  registerTab(index, monday, tab);
  return tab;
}

function registerTab(index: WeekTabIndex, monday: number, tab: TabProperties) {
  index.byMonday.set(monday, tab);
  index.titles.add(tab.title);
  if (!index.latest || monday > index.latest.monday) index.latest = { monday, tab };
}

// ---------------------------------------------------------------------------
// Fresh layout (only when the spreadsheet has no week tab to copy yet).

const rgb = (hex: string) => ({
  red: parseInt(hex.slice(0, 2), 16) / 255,
  green: parseInt(hex.slice(2, 4), 16) / 255,
  blue: parseInt(hex.slice(4, 6), 16) / 255,
});
const HEADER_FILL = rgb("FFFF00");
const BLOCK_FILLS = ["FFF4D5", "E1FFD6", "F4C1F1", "F7F797"].map(rgb);
const DAY_COLUMNS = 3; // spacer, "Necesar", "Student"
const TOTAL_COLUMNS = 1 + 5 * DAY_COLUMNS;

async function buildFreshWeekTab(
  spreadsheetId: string,
  title: string,
  monday: number,
  slots: SlotTemplate[],
) {
  const DAY_ROW = 0;
  const blocks: { start: string; startRow: number; endRow: number }[] = [];
  let row = DAY_ROW + 2;
  for (const slot of slots) {
    blocks.push({ start: slot.start, startRow: row, endRow: row + slot.seats });
    row += slot.seats + 1; // one separator row between blocks
  }
  const rowCount = Math.max(row + 5, 40);

  const [reply] = await batchUpdate(spreadsheetId, [
    {
      addSheet: {
        properties: {
          title,
          gridProperties: { rowCount, columnCount: TOTAL_COLUMNS, frozenRowCount: DAY_ROW + 2 },
        },
      },
    },
  ]);
  const tab: TabProperties = reply.addSheet.properties;
  const sheetId = tab.sheetId;
  const range = (r0: number, r1: number, c0: number, c1: number) => ({
    sheetId,
    startRowIndex: r0,
    endRowIndex: r1,
    startColumnIndex: c0,
    endColumnIndex: c1,
  });
  const border = { style: "SOLID", color: rgb("000000") };
  const tableEnd = blocks.at(-1)?.endRow ?? DAY_ROW + 2;
  const dayColumn = (day: number) => 1 + day * DAY_COLUMNS;

  const requests: unknown[] = [
    // Header rows: yellow, bold, centred.
    {
      repeatCell: {
        range: range(DAY_ROW, DAY_ROW + 2, 0, TOTAL_COLUMNS),
        cell: {
          userEnteredFormat: {
            backgroundColor: HEADER_FILL,
            textFormat: { bold: true },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
      },
    },
    {
      repeatCell: {
        range: range(DAY_ROW, DAY_ROW + 1, 1, TOTAL_COLUMNS),
        cell: { userEnteredFormat: { numberFormat: { type: "DATE", pattern: "dddd, d mmmm" } } },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    ...[0, 1, 2, 3, 4].map((day) => ({
      mergeCells: {
        range: range(DAY_ROW, DAY_ROW + 1, dayColumn(day), dayColumn(day) + DAY_COLUMNS),
        mergeType: "MERGE_ALL",
      },
    })),
    // Separator rows between blocks are yellow and short.
    ...blocks.slice(0, -1).map((block) => ({
      repeatCell: {
        range: range(block.endRow, block.endRow + 1, 0, TOTAL_COLUMNS),
        cell: { userEnteredFormat: { backgroundColor: HEADER_FILL } },
        fields: "userEnteredFormat.backgroundColor",
      },
    })),
    ...blocks.slice(0, -1).map((block) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: block.endRow, endIndex: block.endRow + 1 },
        properties: { pixelSize: 15 },
        fields: "pixelSize",
      },
    })),
    ...blocks.flatMap((block, i) => [
      {
        repeatCell: {
          range: range(block.startRow, block.endRow, 0, TOTAL_COLUMNS),
          cell: {
            userEnteredFormat: {
              backgroundColor: BLOCK_FILLS[i % BLOCK_FILLS.length],
              verticalAlignment: "MIDDLE",
              textFormat: { fontSize: 10 },
            },
          },
          fields: "userEnteredFormat(backgroundColor,verticalAlignment,textFormat)",
        },
      },
      {
        repeatCell: {
          range: range(block.startRow, block.endRow, 0, 1),
          cell: {
            userEnteredFormat: {
              numberFormat: { type: "TIME", pattern: "hh:mm" },
              textFormat: { bold: true, fontSize: 13 },
              horizontalAlignment: "CENTER",
            },
          },
          fields: "userEnteredFormat(numberFormat,textFormat,horizontalAlignment)",
        },
      },
      {
        mergeCells: { range: range(block.startRow, block.endRow, 0, 1), mergeType: "MERGE_ALL" },
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: "ROWS", startIndex: block.startRow, endIndex: block.endRow },
          properties: { pixelSize: 30 },
          fields: "pixelSize",
        },
      },
    ]),
    {
      updateBorders: {
        range: range(DAY_ROW, tableEnd, 0, TOTAL_COLUMNS),
        top: border,
        bottom: border,
        left: border,
        right: border,
        innerHorizontal: border,
        innerVertical: border,
      },
    },
    // Column widths in pixels: time, then spacer / "Necesar" / "Student" per day.
    { updateDimensionProperties: dimension(sheetId, 0, 1, 80) },
    ...[0, 1, 2, 3, 4].flatMap((day) => [
      { updateDimensionProperties: dimension(sheetId, dayColumn(day), dayColumn(day) + 1, 32) },
      { updateDimensionProperties: dimension(sheetId, dayColumn(day) + 1, dayColumn(day) + 2, 115) },
      { updateDimensionProperties: dimension(sheetId, dayColumn(day) + 2, dayColumn(day) + 3, 290) },
    ]),
  ];

  await batchUpdate(spreadsheetId, requests);

  const dayRowValues: unknown[] = ["Day"];
  const headerValues: unknown[] = ["Room"];
  for (let day = 0; day < 5; day += 1) {
    dayRowValues.push(monday + day, "", "");
    headerValues.push("", "Necesar \n(calculator, foi etc)", "Student Full Name & Course Subject");
  }
  await batchUpdateValues(spreadsheetId, [
    { range: a1(title, `A${DAY_ROW + 1}`), values: [dayRowValues, headerValues] },
    ...blocks.map((block) => {
      const [h, m] = block.start.split(":").map(Number);
      return { range: a1(title, `A${block.startRow + 1}`), values: [[(h * 60 + m) / 1440]] };
    }),
  ]);

  return tab;
}

function dimension(sheetId: number, start: number, end: number, pixelSize: number) {
  return {
    range: { sheetId, dimension: "COLUMNS", startIndex: start, endIndex: end },
    properties: { pixelSize },
    fields: "pixelSize",
  };
}
