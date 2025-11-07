import { useState } from "react";
import "./App.css";
import Papa from "papaparse";

type PersonData = {
  "First Name": string;
  "Last Name": string;
  "Department ": string;
  "Arr Date (MMM DD, YYYY)": string;
  "No. Nights": string;
  Notes: string;
  [key: string]: string;
};

const shuffledDataArray = <T,>(array: T[]): T[] => {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
};

function App() {
  const [peopleData, setPeopleData] = useState<PersonData[]>([]);
  const [seatsPerTable, setSeatsPerTable] = useState<number>(0);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [generatedTables, setGeneratedTables] = useState<
    (typeof formattedPeopleData)[]
  >([]);
  const handlePeopleDataUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true, // use first row as keys
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<PersonData>) => {
        setPeopleData(results.data);
      },
    });
  };
  const formattedPeopleData = peopleData.map((person) => ({
    name: `${person["First Name"]} ${person["Last Name"]}`,
    department: person["Department "].trim(),
  }));

  const handleGenerateSeatingArrangement = () => {
    if (formattedPeopleData.length === 0) {
      alert("Please upload a CSV file with people data");
      return;
    }
    const totalPeople = formattedPeopleData.length;
    const numTables = Math.ceil(totalPeople / seatsPerTable);
    const basePeoplePerTable = Math.floor(totalPeople / numTables);
    const remainingPeople = totalPeople % numTables;

    const tableSize: number[] = [];
    for (let i = 0; i < numTables; i++) {
      tableSize.push(
        i < remainingPeople ? basePeoplePerTable + 1 : basePeoplePerTable
      );
    }

    let shuffledPeople: typeof formattedPeopleData;
    const tables: (typeof formattedPeopleData)[] = [];

    for (let i = 0; i < numTables; i++) {
      tables[i] = [];
    }

    if (shuffle) {
      shuffledPeople = shuffledDataArray(formattedPeopleData);
      for (const person of shuffledPeople) {
        let bestTableIndex = -1;
        let bestScore = -Infinity;

        for (let i = 0; i < tables.length; i++) {
          const table = tables[i];
          const targetSize = tableSize[i];

          // Skip if table is full
          if (table.length >= targetSize) continue;

          // Cakculate score for this table, higher is better match
          let score = 0;

          const sameDeptCount = table.filter(
            (p) => p.department === person.department
          ).length;

          if (sameDeptCount === 0) {
            score += 1000;
          } else {
            score -= sameDeptCount * 100;
          }

          const fillRatio = table.length / targetSize;
          score += (1 - fillRatio) * 10;

          if (score > bestScore) {
            bestScore = score;
            bestTableIndex = i;
          }
        }
        if (bestTableIndex >= 0) {
          tables[bestTableIndex].push(person);
        }
      }
    } else {
      shuffledPeople = shuffledDataArray(formattedPeopleData);

      let personIndex = 0;
      for (let tableIndex = 0; tableIndex < numTables; tableIndex++) {
        const targetSize = tableSize[tableIndex];
        for (
          let i = 0;
          i < targetSize && personIndex < shuffledPeople.length;
          i++
        ) {
          tables[tableIndex].push(shuffledPeople[personIndex]);
          personIndex++;
        }
      }
    }
    setGeneratedTables(tables);
  };

  const handleExportToCSV = (tables: (typeof formattedPeopleData)[]) => {
    const csvRows: Array<{
      "Table Number": number;
      "Full Name": string;
      Department: string;
    }> = [];

    tables.forEach((table, tableIndex) => {
      table.forEach((person) => {
        csvRows.push({
          "Table Number": tableIndex + 1,
          "Full Name": person.name,
          Department: person.department,
        });
      });
    });

    const csvContent = Papa.unparse(csvRows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seating_arrangement.csv";
    a.click();
  };

  return (
    <>
      <h1>Seating Arrangement</h1>
      <div className="card">
        <h2>Upload a CSV File with People Data</h2>
        <input
          type="file"
          accept=".csv"
          onChange={handlePeopleDataUpload}
          className="inputs"
        />
        <label htmlFor="seatsPerTable" className="label">
          Seats Per Table
        </label>
        <input
          id="seatsPerTable"
          className="inputs"
          type="text"
          placeholder="Enter the number of seats per table"
          onChange={(e) => setSeatsPerTable(Number(e.target.value))}
          value={seatsPerTable}
          min={1}
        />
        <div className="checkbox">
          <input
            type="checkbox"
            id="shuffle"
            onChange={(e) => setShuffle(e.target.checked)}
            checked={shuffle}
          />
          <label htmlFor="shuffle">
            Don't seat people from the same department at the same table(as much
            as possible)
          </label>
        </div>
        <button
          disabled={seatsPerTable === 0}
          onClick={handleGenerateSeatingArrangement}
        >
          Generate Seating Arrangement
        </button>
        {generatedTables.length > 0 && (
          <div className="export-buttons-group">
            <button onClick={() => handleExportToCSV(generatedTables)}>
              Export to CSV
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
