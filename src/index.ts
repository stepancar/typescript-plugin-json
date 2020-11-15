import fs from 'fs';
import path from 'path';
import tsModule from 'typescript/lib/tsserverlibrary';
import { isJson } from './isJson';
import { createLogger, Logger } from './logger';


function getDtsSnapshot(
  ts: typeof tsModule,
  fileName: string,
  scriptSnapshot: ts.IScriptSnapshot,
  compilerOptions: tsModule.CompilerOptions,
  logger: Logger
) {
    // generate string 

    const text = fs.readFileSync(fileName).toString();
    const trimmedText = text.trim();
    
    //logger.log(text);

    // ts.parseJsonText(fileName, text).text
    // TODO: pick types from file
    const dtsText = `
      type J = ${trimmedText};
      declare let a: J;

      export default a;
    `;
    // use typescript to convert it to real module
    return ts.ScriptSnapshot.fromString(dtsText);
}


function init({ typescript: ts }: { typescript: typeof tsModule }) {

  function create(info: ts.server.PluginCreateInfo) {
    const logger = createLogger(info);
    const directory = info.project.getCurrentDirectory();
    const compilerOptions = info.project.getCompilerOptions();

    // TypeScript plugins have a `cwd` of `/`, which causes issues with import resolution.
    process.chdir(directory);

    // Creates new virtual source files for the json
    const _createLanguageServiceSourceFile = ts.createLanguageServiceSourceFile;
    ts.createLanguageServiceSourceFile = (
      fileName,
      scriptSnapshot,
      ...rest
    ): ts.SourceFile => {
      if (isJson(fileName)) {
        scriptSnapshot = getDtsSnapshot(
          ts,
          fileName,
          scriptSnapshot,
          compilerOptions,
          logger
        );
        const [scriptTarget, version, setNodeParents, scriptKind] = rest;
        const sourceFile = _createLanguageServiceSourceFile(
          fileName,
          scriptSnapshot,
          tsModule.ScriptTarget.Latest,
          version,
          setNodeParents,
          tsModule.ScriptKind.External
        );

        sourceFile.isDeclarationFile = true;

        return sourceFile;
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
      if (isJson(sourceFile.fileName)) {
        scriptSnapshot = getDtsSnapshot(
          ts,
          sourceFile.fileName,
          scriptSnapshot,
          compilerOptions,
          logger
        );

        sourceFile = _updateLanguageServiceSourceFile(
          sourceFile,
          scriptSnapshot,
          ...rest,
        );

        sourceFile.isDeclarationFile = true;
        
        return sourceFile;
      }

      sourceFile = _updateLanguageServiceSourceFile(
        sourceFile,
        scriptSnapshot,
        ...rest,
      );

      return sourceFile;
    };

    if (info.languageServiceHost.resolveModuleNames) {
      const _resolveModuleNames = info.languageServiceHost.resolveModuleNames.bind(
        info.languageServiceHost,
      );

      info.languageServiceHost.resolveModuleNames = (
        moduleNames,
        containingFile,
        ...rest
      ) => {
        const resolvedModules = _resolveModuleNames(
          moduleNames,
          containingFile,
          ...rest,
        );

        return moduleNames.map((moduleName, index) => {
          try {
            // TODO
            if (isJson(moduleName)) {
              return {
                extension: tsModule.Extension.Dts,
                isExternalLibraryImport: false,
                resolvedFileName: path.resolve(
                  path.dirname(containingFile),
                  moduleName,
                ),
              };
            } else if (isJson(moduleName)) {
              // TODO: Move this section to a separate file and add basic tests.
              // Attempts to locate the module using TypeScript's previous search paths. These include "baseUrl" and "paths".
              const failedModule = info.project.getResolvedModuleWithFailedLookupLocationsFromCache(
                moduleName,
                containingFile,
              );
              const baseUrl = info.project.getCompilerOptions().baseUrl;
              const match = '/index.ts';

              // An array of paths TypeScript searched for the module. All include .ts, .tsx, .d.ts, or .json extensions.
              // NOTE: TypeScript doesn't expose this in their interfaces, which is why the type is unkown.
              // https://github.com/microsoft/TypeScript/issues/28770
              const failedLocations: readonly string[] = ((failedModule as unknown) as {
                failedLookupLocations: readonly string[];
              }).failedLookupLocations;

              // Filter to only one extension type, and remove that extension. This leaves us with the actual filename.
              // Example: "usr/person/project/src/dir/File.module.tsjson/index.d.ts" > "usr/person/project/src/dir/File.module.tsjson"
              const normalizedLocations = failedLocations.reduce(
                (locations, location) => {
                  if (
                    (baseUrl ? location.includes(baseUrl) : true) &&
                    location.endsWith(match)
                  ) {
                    return [...locations, location.replace(match, '')];
                  }
                  return locations;
                },
                [] as string[],
              );

              // Find the imported json, if it exists.
              const jsonPath = normalizedLocations.find((location) =>
                fs.existsSync(location),
              );

              if (jsonPath) {
                return {
                  extension: tsModule.Extension.Dts,
                  isExternalLibraryImport: false,
                  resolvedFileName: path.resolve(jsonPath),
                };
              }
            }
          } catch (e) {
            logger.error(e);
            return resolvedModules[index];
          }
          return resolvedModules[index];
        });
      };
    }

    return info.languageService;
  }

  function getExternalFiles(project: tsModule.server.ConfiguredProject) {
    return project.getFileNames().filter(isJson);
  }

  return { create, getExternalFiles };
}

export = init;
