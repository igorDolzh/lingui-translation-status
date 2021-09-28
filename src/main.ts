import * as ghCore from "@actions/core";
import {Octokit} from '@octokit/rest'

const filePath = ghCore.getInput("file-path");
const githubToken = ghCore.getInput("github-token");
const githubOwner = ghCore.getInput("github-owner");
const githubRepo = ghCore.getInput("github-repo");
const shaBase = ghCore.getInput("sha-base");
const shaHead = ghCore.getInput("sha-head");
const pullNumber = ghCore.getInput("pull-number");
const langs = ghCore.getInput("file-langs");

const LANG_ISO_PLACEHOLDER = "%LANG_ISO%";

const languageStyledMap: {[key: string]: string} = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    sv: 'Swedish',
    da: 'Danish',
    de: 'German'
}

function getLanguage(fileName: string) {
    const reg = new RegExp(filePath.replace(LANG_ISO_PLACEHOLDER, '(\\w*)'))
    const language = fileName.match(reg)?.[1]
    if (language) {
        const languageStyled = languageStyledMap[language] || language
        return languageStyled
    }
    return undefined
}

function getPattern(format: string) {
    if (format === 'po') {
        return /\+msgid "([\w ]*)".*\n\+msgstr.""|msgid "([\w ]*)".*\n\-msgstr "[\w ]*".*\n\+msgstr.""/
    }
    return null
}

async function run() {
    try {
        const gitHub = await new Octokit({
            auth: githubToken
        })

        const commitDiff = await gitHub.repos.compareCommits({
            owner: githubOwner,
            repo: githubRepo,
            base: shaBase,
            head: shaHead
        })
        console.log('commitDiff',commitDiff)

        const parsedLangs = JSON.parse(langs)
        const langFiles = parsedLangs.map((lang: string) => filePath.replace(LANG_ISO_PLACEHOLDER, lang))
    
        function getMessages(source: string): string[] {
            const pattern = getPattern(filePath?.split('.').reverse()[0])

            if (pattern) {
                const rex = pattern
                const re = new RegExp(rex, 'g')
                const extract = source.match(re)
                return extract
                    ?.map((text: string) => {
                        const matches = text.match(rex)
                        return matches ? matches[1] || matches[2] : ''
                    })
                    ?.filter((text: string) => Boolean(text)) || []
            }

            return []
    
        }
        if (commitDiff) {    
            const messages = commitDiff?.data?.files?.filter((fileData) => langFiles.includes(fileData.filename)).map((fileData) => ({
                fileName: fileData.filename,
                messages: getMessages(fileData?.patch || '')
            }))
    
            const messagesToPrint = messages?.filter(({ messages }) => {
                return messages ? messages?.length > 0 : false
            })?.map(({ fileName, messages}) => {
                const title = `| Missing translations for: ${getLanguage(fileName) || 'Unknown language'} |\n| --- |\n`
                let content: string[] = []
                messages?.forEach((message) => {
                    content.push(`| ${message} |`)
                })
    
                return title + content.join('\n')
            })
    
            const header = '### Translation status\n'
            const commentBody = header + messagesToPrint?.join('\n\n')

            console.log('commentBody', commentBody)
            const comments = await gitHub.issues.listComments({
                owner: githubOwner,
                repo: githubRepo,
                issue_number: +pullNumber,
              });

              

            const comment = comments?.data?.find((comment) => {
                return comment?.body?.startsWith(header)
            })

            console.log('comment', comment)

            if (comment) {
                await gitHub.issues.updateComment({
                    owner: githubOwner,
                    repo: githubRepo,
                    body: commentBody || '',
                    comment_id: comment.id
                });
                console.log('Comment is successfully updated')
            } else {
                await gitHub.issues.createComment({
                    owner: githubOwner,
                    repo: githubRepo,
                    issue_number: +pullNumber,
                    body: commentBody || '',
                  });
                  console.log('Comment is successfully created')
            }
            
        } 
    } catch (e: any) {
        const errorMessage = `${e.name} ${e.message}`
        console.log(`${errorMessage} ${e.stack}`)
    }
}

run()