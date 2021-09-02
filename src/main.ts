import * as ghCore from "@actions/core";
import {Octokit} from '@octokit/rest'

const filePath = ghCore.getInput("file-path");
const format = ghCore.getInput("format");
const githubToken = ghCore.getInput("github-token");
const githubOwner = ghCore.getInput("github-owner");
const githubRepo = ghCore.getInput("github-repo");
const shaBase = ghCore.getInput("sha-base");
const shaHead = ghCore.getInput("sha-head");
const pullNumber = ghCore.getInput("pull-number");
const langs =ghCore.getInput("file-langs");

const LANG_ISO_PLACEHOLDER = "%LANG_ISO%";

const languageStyledMap: {[key: string]: string} = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    sv: 'Swedish',
    da: 'Danish',
    de: 'German'
}
function getLanguage(fileName: string, langs: string[]) {
    const language = langs.find((lang) => fileName.includes(lang))
    if (language) {
        const languageStyled = languageStyledMap[language]
        return languageStyled
    }

}
function getPattern(format: string) {
    if (format === 'po') {
        return /\+msgid "([\w ]*)".*\n\+msgstr.""/
    }
    return null
}
async function run() {

    const gitHub = await new Octokit({
        auth: githubToken
    })

    const result = await gitHub.repos.compareCommits({
        owner: githubOwner,
        repo: githubRepo,
        base: shaBase,
        head: shaHead
    })
    const parsedLangs = JSON.parse(langs)
    const langFiles = parsedLangs.map((lang: string) => filePath.replace(LANG_ISO_PLACEHOLDER, lang))

    function getMessages(source: string) {
        const pattern = getPattern(format)
        if (pattern) {
            const rex = pattern
            const re = new RegExp(rex, 'g')
            const extract = source.match(re)
            return extract
                ?.map((text: string) => {
                    const matches = text.match(rex)
                    return matches ? matches[1] : ''
                })
                ?.filter((text: string) => Boolean(text))
        }
        return []

    }
    if (result) {
        console.log('result', {
            result: result?.data?.files?.filter((fileData) => langFiles.includes(fileData.filename)).map((fileData) => ({
                fileName: fileData.filename,
                messages: getMessages(fileData?.patch || '')
            }))
        })

        const messages = result?.data?.files?.map((fileData) => ({
            fileName: fileData.filename,
            messages: getMessages(fileData?.patch || '')
        }))

        const messagesToPrint = messages?.map(({ fileName, messages}) => {
            const title = `| ${getLanguage(fileName, parsedLangs) || 'Unknown language'} |\n| --- |\n`
            let content: string[] = []
            messages?.forEach((message) => {
                content.push(`| ${message} |`)
            })

            return title + content.join('\n')
        })

        const comment = messagesToPrint?.join('\n\n')

        gitHub.pulls.createReviewComment({
            owner: githubOwner,
            repo: githubRepo,
            pull_number: +pullNumber,
            body: comment || '',
          });
    }
}

run()