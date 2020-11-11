import fs from 'fs';
import path from 'path';
import tsModule from 'typescript/lib/tsserverlibrary';

function isJson(fileName: string) {
    return fileName.endsWith('json');
}

function getDtsSnapshot(
  ts: typeof tsModule,
  fileName: string,
  scriptSnapshot: ts.IScriptSnapshot,
  compilerOptions: tsModule.CompilerOptions,
) {
    // generate string 
    // use typescript to convert it to real module
    const dtsText = 'declare const json: {koko: string;};\n export default json;\n';
    return ts.ScriptSnapshot.fromString(dtsText);
}

function init({ typescript: ts }: { typescript: typeof tsModule }) {
  function create(info: ts.server.PluginCreateInfo) {
    const directory = info.project.getCurrentDirectory();
    const compilerOptions = info.project.getCompilerOptions();

    // TypeScript plugins have a `cwd` of `/`, which causes issues with import resolution.
    process.chdir(directory);
    const _createLanguageServiceSourceFile = ts.createLanguageServiceSourceFile;
    ts.createLanguageServiceSourceFile = (
      fileName,
      scriptSnapshot,
      ...rest
    ): ts.SourceFile => {
      if (fileName.endsWith('json')) {
        scriptSnapshot = getDtsSnapshot(
          ts,
          fileName,
          scriptSnapshot,
          compilerOptions,
        );
      }
      const sourceFile = _createLanguageServiceSourceFile(
        fileName,
        scriptSnapshot,
        ...rest,
      );

      return sourceFile;
    };

    // Updates virtual source files as files update.
    const _updateLanguageServiceSourceFile = ts.updateLanguageServiceSourceFile;
    ts.updateLanguageServiceSourceFile = (
      sourceFile,
      scriptSnapshot,
      ...rest
    ): ts.SourceFile => {
      if (sourceFile.fileName.endsWith('json')) {
        scriptSnapshot = getDtsSnapshot(
          ts,
          sourceFile.fileName,
          scriptSnapshot,
          compilerOptions,
        );
      }
      sourceFile = _updateLanguageServiceSourceFile(
        sourceFile,
        scriptSnapshot,
        ...rest,
      );
      if (sourceFile.fileName.endsWith('json')) {
        sourceFile.isDeclarationFile = true;
      }
      return sourceFile;
    };

    return info.languageService;
  }

  function getExternalFiles(project: tsModule.server.ConfiguredProject) {
    return project.getFileNames().filter(isJson);
  }

  return { create, getExternalFiles };
}

export = init;
