#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const cheerio = require("cheerio");
const prettier = require("prettier");
const get = require("lodash/get");
const pick = require("lodash/pick");

/** Load app's package.json */
const appPackage = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../package.json")));

/** Load app's .env file */
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

/**
 * Read environment variables whitelist
 * from the app's package.json
 **/
const whitelist = get(appPackage, "react-dotenv.whitelist", []);

/**
 * Remove all environment variables
 * not included in the whitelist
 */
const env = whitelist.length ? pick(process.env, whitelist) : process.env;

/**
 * Check for custom homepage (basepath)
 * More Info: https://create-react-app.dev/docs/deployment/#building-for-relative-paths
 */
const homepage = get(appPackage, "homepage", "/");

const baseUrl = removeTrailingSlashes(env.PUBLIC_URL || env.REACT_APP_BASE_URL || homepage);

const envFile = `window.env = ${JSON.stringify(env, null, 2)};`;

fs.writeFileSync(path.resolve(__dirname, "../../../public/env.js"), envFile);

fs.access(path.resolve(__dirname, "../../../build"), fs.constants.W_OK, (err) => {
  if (err) return;
  fs.writeFileSync(path.resolve(__dirname, "../../../build/env.js"), envFile);
});

/**
 * Patch app's public/index.html
 */
const publicIndexHtmlPath = path.resolve(__dirname, "../../../public/index.html");
const publicIndexHtmlSource = fs.readFileSync(publicIndexHtmlPath);
const publicIndexIndexPatched = patchIndexHtml(publicIndexHtmlSource);
fs.writeFileSync(publicIndexHtmlPath, publicIndexIndexPatched);

/**
 * Patch app's build/index.html
 */
const buildIndexHtmlPath = path.resolve(__dirname, "../../../build/index.html");
fs.access(buildIndexHtmlPath, fs.constants.W_OK, (err) => {
  if (err) return;
  const buildIndexHtmlSource = fs.readFileSync(buildIndexHtmlPath);
  const buildIndexIndexPatched = patchIndexHtml(buildIndexHtmlSource);
  fs.writeFileSync(buildIndexHtmlPath, buildIndexIndexPatched);
});

function patchIndexHtml(html) {
  let $ = cheerio.load(html);

  if ($("script#react-dotenv").length) {
    $("script#react-dotenv").attr("src", `${baseUrl}/env.js`);
  } else {
    $("head").append(`\t<script id="react-dotenv" src="${baseUrl}/env.js"></script>\n\t`);
  }

  return prettier.format($.html(), { parser: "html" });
}

function removeTrailingSlashes(url) {
  let result = url;
  while (result.length && result[result.length-1] === '/') {
    result=result.slice(0, -1);
  }
  return result;
}
