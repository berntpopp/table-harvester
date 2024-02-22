#!/usr/bin/env node

// --------------------------------------------------------------- //
// table-harvester.js
// Description: A script for extracting table data from HTML files
// --------------------------------------------------------------- //

// --------------------------------------------------------------- //
// Module Imports
// --------------------------------------------------------------- //
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const yargs = require('yargs');
const { Parser } = require('json2csv');

// Setup yargs for command-line argument parsing
const argv = yargs
  .usage('Usage: $0 -i [input] -o [output] -a [attributes] -l [log]')
  .option('input', {
    alias: 'i',
    describe: 'Input HTML file or directory',
    type: 'string',
    demandOption: true,
  })
  .option('output', {
    alias: 'o',
    describe: 'Output directory',
    type: 'string',
    demandOption: true,
  })
  .option('attributes', {
    alias: 'a',
    describe: 'Attributes to extract',
    type: 'array',
    default: ['alt', 'value', 'href'],
  })
  .option('log', {
    alias: 'l',
    describe: 'Log file path',
    type: 'string',
  })
  .help()
  .argv;

// Function to check if a path is a directory
const isDirectory = source => fs.lstatSync(source).isDirectory();

// Function to get HTML files from a directory or a single file
const getHtmlFiles = source =>
  isDirectory(source)
    ? fs.readdirSync(source).filter(file => file.endsWith('.html')).map(file => path.join(source, file))
    : [source];

// Function to normalize column names
function normalizeColumnName(name) {
  // Convert to lower case
  let normalized = name.toLowerCase();

  // Replace non-alphanumeric characters with underscores
  normalized = normalized.replace(/[^a-z0-9]/g, '_');

  // Replace multiple underscores with a single one
  normalized = normalized.replace(/_+/g, '_');

  // Trim leading and trailing underscores
  normalized = normalized.replace(/^_+|_+$/g, '');

  return normalized;
}

// Main function
async function main() {
  const htmlFiles = getHtmlFiles(argv.input);

  htmlFiles.forEach(file => {
    const htmlContent = fs.readFileSync(file, 'utf-8');
    const $ = cheerio.load(htmlContent);

    $('table').each((index, table) => {
      // Remove unwanted tags inside the table
      $(table).find('script, style, noscript').remove();
    
      let headers = [];
      const tableData = [];
      let headerExtracted = false;
    
      $('tr', table).each((rowIndex, row) => {
        // Skip rows until headers are found
        if (!headerExtracted) {
          if ($('th', row).length > 0) {
            $('th', row).each((headerIndex, header) => {
              let headerText = $(header).text().trim();
              headers.push(normalizeColumnName(headerText)); // Normalize the column name
            });
            headerExtracted = true;
            console.log(`Extracted headers: ${headers}`); // Debugging
          }
          return; // Skip to the next row
        }
    
        // Process data rows
        const rowData = {};
        $('td', row).each((colIndex, cell) => {
          const cellText = $(cell).text().trim();
          const columnName = headers[colIndex] || `Column${colIndex}`;
          rowData[columnName] = cellText;
          // ... [extract specified attributes] ...
        });
    
        if (Object.keys(rowData).length > 0) {
          console.log(`Row data: ${JSON.stringify(rowData)}`); // Debugging
          tableData.push(rowData);
        }
      });
    
      if (tableData.length > 0) {
        // Convert tableData to CSV
        const parser = new Parser({ fields: headers.length > 0 ? headers : undefined });
        const csv = parser.parse(tableData);
    
        // Define output file path
        const outputFileName = path.basename(file, '.html') + `_table_${index}.csv`;
        const outputFilePath = path.join(argv.output, outputFileName);
    
        // Write CSV to file
        fs.writeFileSync(outputFilePath, csv);
        console.log(`Table ${index} from ${file} saved to ${outputFilePath}`);
      } else {
        console.log(`No data found in Table ${index} from ${file}`);
      }
    });

  });
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
