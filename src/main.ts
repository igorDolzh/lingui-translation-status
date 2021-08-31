import * as ghCore from "@actions/core";

const filePath = ghCore.getInput("file-path");
const format = ghCore.getInput("format");

async function run() {
    console.log(filePath,format)
}

run()