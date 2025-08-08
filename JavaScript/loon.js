#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const minimist = require("minimist");
const { parseLoonFile } = require("./loonParser"); // your parser module

function main() {
  const args = minimist(process.argv.slice(2), {
    alias: { o: "output" },
    string: ["output"],
    boolean: ["help"],
    default: { output: null },
  });

  if (args.help || args._.length === 0) {
    console.log("Usage: loon <input.loon> [-o output.json]");
    process.exit(0);
  }

  const inputFile = args._[0];
  if (!inputFile.endsWith(".loon")) {
    console.error("Error: input file must be a .loon file");
    process.exit(1);
  }

  try {
    // Grab only the public labels so hiddenLabels never show in CLI output
    const { labels } = parseLoonFile(inputFile);

    if (args.output) {
      fs.writeFileSync(args.output, JSON.stringify(labels, null, 2), "utf8");
      console.log(`Parsed output saved to ${args.output}`);
    } else {
      console.log(JSON.stringify(labels, null, 2));
    }
  } catch (err) {
    console.error("Error parsing LOON file:", err.message);
    process.exit(1);
  }
}

main();
