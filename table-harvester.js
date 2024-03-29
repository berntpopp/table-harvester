#!/usr/bin/env node


// --------------------------------------------------------------- //
// table-harvester.js
// Description: A script for extracting table data from HTML files
// and converting it into CSV format.
// --------------------------------------------------------------- //


// --------------------------------------------------------------- //
// Module Imports
// --------------------------------------------------------------- //
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const yargs = require('yargs');
const { Parser } = require('json2csv');
const jschardet = require('jschardet');
const iconv = require('iconv-lite');


// --------------------------------------------------------------- //
// Command-line Argument Configuration
// --------------------------------------------------------------- //
// Configures command-line arguments for the script using yargs.
// This allows users to specify input, output, and other options.
const argv = yargs
  .usage('# table-harvester.js\n# Description: A script for extracting table data from HTML files\n# and converting it into CSV format.\n#    ____\n#\  i | o|\n#|>#######\n#/(_______)\n#\nUsage: $0 -i [input] -o [output] -a [attributes] -l [log]')
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
    default: ['alt', 'value', 'href', 'title'],
  })
  .option('elements', {
    alias: 'e',
    describe: 'HTML elements to extract from cells',
    type: 'array',
    default: ['a', 'input', 'span'],
  })
  .option('headerSelectors', {
    alias: 'hs',
    describe: 'Selectors to identify header elements preceding tables',
    type: 'array',
    default: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '.header'],
  })
  .option('tableNameSeparator', {
    alias: 'ts',
    describe: 'Separator for extracting table name from header text',
    type: 'string',
    default: ':',
  })
  .option('log', {
    alias: 'l',
    describe: 'Log file path',
    type: 'string',
  })
  .help()
  .argv;

// --------------------------------------------------------------- //
// Utility Functions
// --------------------------------------------------------------- //

/**
 * Checks if a given path is a directory.
 * @param {string} source - Path to check.
 * @returns {boolean} True if the path is a directory, false otherwise.
 */
const isDirectory = source => fs.lstatSync(source).isDirectory();

/**
 * Reads an HTML file with the correct encoding.
 * @param {string} filePath - The path to the HTML file.
 * @returns {string} The content of the file in UTF-8 encoding.
 */
function readHtmlFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const detectedEncoding = jschardet.detect(fileBuffer).encoding;
  return iconv.decode(fileBuffer, detectedEncoding);
}

/**
 * Retrieves HTML files from a directory or returns a single file in an array.
 * @param {string} source - Directory path or file path.
 * @returns {Array<string>} Array of file paths.
 */
const getHtmlFiles = source =>
  isDirectory(source)
    ? fs.readdirSync(source).filter(file => file.endsWith('.html')).map(file => path.join(source, file))
    : [source];

/**
 * Normalizes a given string to a column name in snake_case.
 * This involves converting to lower case, replacing non-alphanumeric 
 * characters with underscores, and trimming leading and trailing underscores.
 *
 * @param {string} name - The string to be normalized.
 * @returns {string} The normalized column name in snake_case.
 */
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


// --------------------------------------------------------------- //
// Main Script Execution
// --------------------------------------------------------------- //
/**
 * Main function to execute the script.
 * Processes each HTML file and extracts tables to CSV format.
 */
async function main() {
  const htmlFiles = getHtmlFiles(argv.input);

  htmlFiles.forEach(file => {
    const htmlContent = readHtmlFile(file);
    const $ = cheerio.load(htmlContent);

    $('table').each((index, table) => {
      // Remove unwanted tags inside the table
      $(table).find('script, style, noscript').remove();
      
      // Find preceding header element or an element with a header class
      let tableName = '';
      const headerSelector = argv.headerSelectors.join(', ');
      const prevHeader = $(table).prevAll(headerSelector).first();
      if (prevHeader.length) {
        const headerText = prevHeader.text().split(argv.tableNameSeparator)[0];
        tableName = normalizeColumnName(headerText); // Extract text and normalize
      }

      let headers = [];
      const tableData = [];
      let headerExtracted = false;
      let allHeaders = new Set(); // Declare allHeaders here
    
      $('tr', table).each((rowIndex, row) => {
        // Skip rows until headers are found
        if (!headerExtracted) {
          if ($('th', row).length > 0) {
            $('th', row).each((headerIndex, header) => {
              let headerText = $(header).text().trim();
              headers.push(normalizeColumnName(headerText)); // Normalize the column name
            });
            headerExtracted = true;
          }
          return; // Skip to the next row
        }
    
        // Process data rows
        const rowData = {};
        
        $('td', row).each((colIndex, cell) => {
          // Extract text content from the cell
          const cellText = $(cell).text().trim();
          const baseColumnName = headers[colIndex] || `Column${colIndex}`;
          rowData[`${baseColumnName}_content`] = cellText;
          allHeaders.add(`${baseColumnName}_content`);
        
          // Extract specified attributes from the cell
          argv.attributes.forEach(attribute => {
            const attrValue = $(cell).attr(attribute);
            if (attrValue) {
              const attrColumnName = `${baseColumnName}_${attribute}`;
              rowData[attrColumnName] = attrValue;
              allHeaders.add(attrColumnName);
            }
          });
        
          // Extract specified elements and their text/attributes
          argv.elements.forEach(element => {
            $(cell).find(element).each((elIndex, el) => {
              const elText = $(el).text().trim();
              const elColumnName = `${baseColumnName}_${element}${elIndex}_content`;
              rowData[elColumnName] = elText;
              allHeaders.add(elColumnName);
        
              argv.attributes.forEach(attribute => {
                const elAttrValue = $(el).attr(attribute);
                if (elAttrValue) {
                  const elAttrColumnName = `${baseColumnName}_${element}${elIndex}_${attribute}`;
                  rowData[elAttrColumnName] = elAttrValue;
                  allHeaders.add(elAttrColumnName);
                }
              });
            });
          });
        });
    
        if (Object.keys(rowData).length > 0) {
          tableData.push(rowData);
        }
      });
    
      // Convert Set to Array for headers
      const headersArray = Array.from(allHeaders);

      if (tableData.length > 0) {
        const parser = new Parser({ fields: headersArray });
        const csv = parser.parse(tableData);
    
        // Define output file path
        const baseOutputFileName = path.basename(file, '.html');
        const outputFileName = tableName ? 
                               `${baseOutputFileName}.table_${index}.${tableName}.csv` :
                               `${baseOutputFileName}.table_${index}.csv`;
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
