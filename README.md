# Table Harvester

![table-harvester_logo](static/img/table-harvester_logo.png)

## Description

Table Harvester is a Node.js script designed for extracting table data from HTML files and converting it to CSV format. This utility script is particularly useful for parsing structured table data embedded in HTML documents and converting them into a more accessible and manipulable format like CSV.

## Features

- **HTML Table Extraction**: Extracts tables from HTML files and converts them into CSV format.
- **Encoding Support**: Automatically detects and handles various file encodings.
- **Customizable Extraction**: Allows specifying HTML attributes and elements to include in the extraction process.
- **Dynamic Table Naming**: Extracts table names from preceding header elements or elements with a specified header class.
- **Robust Error Handling**: Includes error handling to manage exceptions gracefully.

## Installation

To use Table Harvester, ensure you have Node.js installed. Then, clone the repository or download the script to your local machine.

## Usage

Run the script from the command line using Node.js, specifying the required options:

```bash
node table-harvester.js -i [input] -o [output] -a [attributes] ...
```

## Options
- -i, --input: (Required) Input HTML file or directory.
- -o, --output: (Required) Output directory for the CSV files.
- -a, --attributes: Attributes to extract from the table cells (e.g., alt, href).
- -e, --elements: HTML elements to extract from cells (e.g., a, input).
- -hs, --headerSelectors: Selectors for identifying header elements preceding tables.
- -ts, --tableNameSeparator: Separator for extracting table name from header text.
- -l, --log: Path to a log file.

## Example

```bash
node table-harvester.js -i "./html-files" -o "./csv-output" -a "href" "title" -e "a" "span"
```

This command will process all HTML files in the ./html-files directory, extract tables, and save them as CSV files in the ./csv-output directory.

## Contributing
Contributions to improve Table Harvester are welcome. Please feel free to fork the repository, make improvements, and submit pull requests.

## License
This project is open source and available under the MIT License.