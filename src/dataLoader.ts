import { dirname } from "path";
import { fileURLToPath } from "url";
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from "google-spreadsheet";

export const __dirname = dirname(fileURLToPath(import.meta.url));

type Moon = {
    Kingdom: string;
    Name: string;
    "First Scenario": string;
    Image: string;
    "Map Location": string;
};

export type QuestionTypeName =
    | "KingdomFromName"
    | "NameFromImage"
    | "MapLocationFromName"
    | "FirstScenarioFromName";

export enum QuestionType {
    KingdomFromName = 0,
    NameFromImage,
    MapLocationFromName,
    FirstScenarioFromName,
}

export type Card = {
    moonId: number;
    questionType: QuestionType;
};

export const cardCounts = {
    [QuestionType.KingdomFromName]: 0,
    [QuestionType.NameFromImage]: 0,
    [QuestionType.MapLocationFromName]: 0,
    [QuestionType.FirstScenarioFromName]: 0,
};

export const moons: Moon[] = [];
export const cards: Card[] = [];
export const scenarios: Record<string, string[]> = {};
export const dataLoaded = new Promise(async (resolveAll) => {
    const doc = new GoogleSpreadsheet("1FGMveyb9IjraFZBUNYHyCnNq475hNUHjfdKaXzk_yr4");
    doc.useApiKey(process.env.GOOGLE_API_KEY!);
    await doc.loadInfo();
    const sheets = doc.sheetsByIndex.slice(1);
    await Promise.all([
        Promise.all(sheets.map((sheet) => sheet.loadHeaderRow())),
        Promise.all(sheets.map((sheet) => sheet.loadCells())),
    ]);
    createMoonList(sheets);
    createCardList();
    createScenarioList(sheets);

    resolveAll(undefined);
});

function createMoonList(sheets: GoogleSpreadsheetWorksheet[]) {
    for (const sheet of sheets) {
        for (let row = 1; row < sheet.rowCount; row++) {
            const firstCell = sheet.getCell(row, 0).value;
            // Ignoring Toadette moons
            if (!firstCell || (sheet.title === "Mushroom" && firstCell === 44)) {
                break;
            }
            let moon: { [key: string]: string } = { Kingdom: sheet.title };
            for (let col = 1; col < sheet.headerValues.length; col++) {
                const colName = sheet.headerValues[col];
                if (["Image", "Map Location"].includes(colName)) {
                    moon[colName] = sheet.getCell(row, col).hyperlink;
                } else {
                    moon[colName] = sheet.getCell(row, col).value?.toString();
                }
            }
            // @ts-expect-error because I know the row has the right columns
            moons.push(moon);
        }
    }
}

function createCardList() {
    for (const [i, moon] of moons.entries()) {
        if (moon.Name && !moon.Name.includes(moon.Kingdom[0] === "D" ? "Side" : "Kingdom")) {
            cardCounts[QuestionType.KingdomFromName]++;
            cards.push({ moonId: i, questionType: QuestionType.KingdomFromName });
        }
        if (moon.Image && moon.Name) {
            cardCounts[QuestionType.NameFromImage]++;
            cards.push({ moonId: i, questionType: QuestionType.NameFromImage });
        }
        if (moon["Map Location"] && moon.Name) {
            cardCounts[QuestionType.MapLocationFromName]++;
            cards.push({ moonId: i, questionType: QuestionType.MapLocationFromName });
        }
        if (moon["First Scenario"] && moon.Name && moon.Kingdom !== "Darker") {
            cardCounts[QuestionType.FirstScenarioFromName]++;
            cards.push({ moonId: i, questionType: QuestionType.FirstScenarioFromName });
        }
    }
}

function createScenarioList(sheets: GoogleSpreadsheetWorksheet[]) {
    for (const sheet of sheets) {
        scenarios[sheet.title] = [];
        const scenarioCol = sheet.headerValues.indexOf("First Scenario");
        for (let row = 1; row < sheet.rowCount; row++) {
            if (!sheet.getCell(row, 0).value) {
                break;
            }
            const scenarioCell = sheet.getCell(row, scenarioCol).value.toString();
            if (!scenarios[sheet.title].includes(scenarioCell)) {
                scenarios[sheet.title].push(scenarioCell);
            }
        }
    }
}
