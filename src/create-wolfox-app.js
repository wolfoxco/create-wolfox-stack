#!/usr/bin/env node

const program = require('commander')
const fs = require('fs-extra')
const path = require('path')
const execSync = require('child_process').execSync
const chalk = require('chalk')
const readlineSync = require('readline-sync')

const packages = require('./packages')
const utils = require('./utils')

const exec = command => execSync(command, { stdio: 'inherit' })

const waitParsing = () => new Promise(resolve => {
  program
    .arguments('<name>')
    .usage('<name> [options]')
    .option('-b, --backend-only', 'Build only backend project')
    .option('-f, --frontend-only', 'Build only frontend project')
    .option('--overwrite', 'Overwrite any existing folder')
    .action((name, options) => resolve({ name, options }))
  program.parse(process.argv)
})

const resolveAction = ({ name, options }) => {
  if (options.backendOnly && options.frontendOnly) {
    program.help()
  }
  if (options.overwrite) {
    const answer = readlineSync.question(chalk.bold.red(`You're about to overwrite your folders ${name}-back and ${name}-front if they exists. Are you sure you want to do it? [yN] `), {
      limit: [ 'y', 'n' ],
      defaultInput: 'n'
    })
    if (answer === 'y') {
      if (!options.backendOnly) {
        createBackendFolder(name, options)
      }
      if (!options.frontendOnly) {
        createFrontendFolder(name, options)
      }
    }
  }
}

const initEslint = utils.initStaticFile('.eslintrc.json')
const initBabel  = utils.initStaticFile('.babelrc')
const initSrc    = utils.copyFolder('src')
const initConfig = utils.copyFolder('config')
const initGit = () => exec('git init')

const fixPackageJSON = templateDirectory => {
  const packageJSONPath = path.resolve('.', 'package.json')
  const packageJSONCreated = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'))
  const packageJSONTemplate = JSON.parse(fs.readFileSync(`${templateDirectory}/package.json`, 'utf8'))
  const finalPackage = {
    name: packageJSONCreated.name,
    version: packageJSONCreated.version,
    author: packageJSONCreated.author,
    private: true,
    scripts: packageJSONTemplate.scripts,
    dependencies: packageJSONCreated.dependencies,
    devDependencies: packageJSONCreated.devDependencies
  }
  fs.writeFileSync(packageJSONPath, JSON.stringify(finalPackage, null, 2))
}

const initPackageJSON = (packages, templateDirectory) => {
  exec('yarn init --yes')
  exec(`yarn add ${packages.main.join(' ')}`)
  exec(`yarn add --dev ${packages.dev.join(' ')}`)
  fixPackageJSON(templateDirectory)
}

const createBackendFolder = (name, options) => {
  const folderName = `${name}-back`
  const templateDirectory = path.resolve(__dirname, '..', 'templates', 'backend')

  utils.createFolder(folderName, options.overwrite)
  utils.inFolder(folderName, () => {
    initSrc(templateDirectory)
    initGit()
    initPackageJSON(packages.backend, templateDirectory)
    initEslint(templateDirectory)
  })
}

const createFrontendFolder = (name, options) => {
  const folderName = `${name}-front`
  const templateDirectory = path.resolve(__dirname, '..', 'templates', 'frontend')

  utils.createFolder(folderName, options.overwrite)
  utils.inFolder(folderName, () => {
    initSrc(templateDirectory)
    initConfig(templateDirectory)
    initGit()
    initPackageJSON(packages.frontend, templateDirectory)
    initEslint(templateDirectory)
    initBabel(templateDirectory)
  })
}

waitParsing()
  .then(resolveAction)
  .catch(() => {})
