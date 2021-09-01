"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ghCore = __importStar(require("@actions/core"));
const rest_1 = require("@octokit/rest");
// const filePath = ghCore.getInput("file-path");
const format = ghCore.getInput("format");
const githubToken = ghCore.getInput("github-token");
const githubOwner = ghCore.getInput("github-owner");
const githubRepo = ghCore.getInput("github-repo");
const shaBase = ghCore.getInput("sha-base");
const shaHead = ghCore.getInput("sha-head");
const pullNumber = ghCore.getInput("pull-number");
function getPattern(format) {
    if (format === 'po') {
        return /\+msgid "([\w ]*)".*\n\+msgstr.""/;
    }
    return null;
}
function run() {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        const gitHub = yield new rest_1.Octokit({
            auth: githubToken
        });
        const result = yield gitHub.repos.compareCommits({
            owner: githubOwner,
            repo: githubRepo,
            base: shaBase,
            head: shaHead
        });
        function getMessages(source) {
            var _a;
            const pattern = getPattern(format);
            if (pattern) {
                const rex = pattern;
                const re = new RegExp(rex, 'g');
                const extract = source.match(re);
                return (_a = extract === null || extract === void 0 ? void 0 : extract.map((text) => {
                    const matches = text.match(rex);
                    return matches ? matches[1] : '';
                })) === null || _a === void 0 ? void 0 : _a.filter((text) => Boolean(text));
            }
            return [];
        }
        if (result) {
            console.log('result', {
                result: (_b = (_a = result === null || result === void 0 ? void 0 : result.data) === null || _a === void 0 ? void 0 : _a.files) === null || _b === void 0 ? void 0 : _b.map((fileData) => ({
                    fileName: fileData.filename,
                    messages: getMessages((fileData === null || fileData === void 0 ? void 0 : fileData.patch) || '')
                }))
            });
            const messages = (_d = (_c = result === null || result === void 0 ? void 0 : result.data) === null || _c === void 0 ? void 0 : _c.files) === null || _d === void 0 ? void 0 : _d.map((fileData) => ({
                fileName: fileData.filename,
                messages: getMessages((fileData === null || fileData === void 0 ? void 0 : fileData.patch) || '')
            }));
            const messagesToPrint = messages === null || messages === void 0 ? void 0 : messages.map(({ fileName, messages }) => {
                const title = `| ${fileName} |\n| --- |\n`;
                let content = [];
                messages === null || messages === void 0 ? void 0 : messages.forEach((message) => {
                    content.push(`| ${message} |`);
                });
                return title + content.join('\n');
            });
            const comment = messagesToPrint === null || messagesToPrint === void 0 ? void 0 : messagesToPrint.join('\n\n');
            gitHub.pulls.createReviewComment({
                owner: githubOwner,
                repo: githubRepo,
                pull_number: +pullNumber,
                body: comment || '',
            });
        }
    });
}
run();
