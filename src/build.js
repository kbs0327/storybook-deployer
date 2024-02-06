const buildMonorepoIndex = require('./build-monorepo-index');
const glob = require('glob');
const path = require('path');
const fs = require('fs');
const publishUtils = require('./utils');
const shell = require('shelljs');

function buildStorybook(currentPackage, outputDirectory, npmScriptName) {
  console.log(`=> Building storybook for: ${currentPackage.name}`);

  // clear and re-create the out directory
  shell.rm('-rf', outputDirectory);
  shell.mkdir(outputDirectory);

  if (currentPackage.scripts[npmScriptName]) {
    publishUtils.exec(`npm run ${npmScriptName} -o ${outputDirectory}`);
  } else {
    publishUtils.exec(`build-storybook  -o ${outputDirectory}`);
  }
}

function buildSubPackage(origDir, dir, outputDirectory, npmScriptName) {
  shell.cd(dir);

  if (!fs.existsSync('package.json')) {
    return;
  }

  const subPackage = JSON.parse(
    fs.readFileSync(path.resolve('package.json'), 'utf8')
  );

  if (
    !fs.existsSync('.storybook') &&
    (!subPackage.scripts || !subPackage.scripts[npmScriptName])
  ) {
    return;
  }

  const builtStorybook = path.join(dir, outputDirectory, '*');
  const outputPath = path.join(origDir, outputDirectory, subPackage.name);

  shell.mkdir('-p', outputPath);
  shell.cp('-r', builtStorybook, outputPath);
  shell.rm('-rf', builtStorybook);

  return subPackage;
}

module.exports = function(
  skipBuild,
  outputDirectory,
  packageJson,
  packagesDirectory,
  npmScriptName,
  monorepoIndexGenerator,
  parallelCount
) {
  if (skipBuild) {
    return;
  }

  if (packagesDirectory) {
    const origDir = process.cwd();

    shell.exec(`nx run-many -t build-storybook --parallel=${parallelCount} --nxBail=true -- -o ${outputDirectory}`, function(code, stdout, stderr) {
      console.log('Exit code:', code);
      if (stderr) {
        throw new Error(stderror);
      }
    });
    const packages = glob
      .sync(path.join(origDir, packagesDirectory, '**/package.json'), {
        ignore: '**/node_modules/**'
      })
      .map(path.dirname)
      .map(subPackage =>
        buildSubPackage(origDir, subPackage, outputDirectory, npmScriptName)
      )
      .filter(subPackage => subPackage);

    shell.cd(origDir);

    buildMonorepoIndex(packages, monorepoIndexGenerator, outputDirectory);
  } else {
    buildStorybook(packageJson, outputDirectory, npmScriptName);
  }
};
