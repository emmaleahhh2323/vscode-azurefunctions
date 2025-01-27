/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { FuncVersion, funcVersionSetting, ProjectLanguage, projectLanguageSetting, TemplateSource } from '../../extension.bundle';
import { allTemplateSources, shouldSkipVersion } from '../global.test';
import { getDotnetScriptValidateOptions, validateProject } from '../project/validateProject';
import { runWithFuncSetting } from '../runWithSetting';
import { FunctionTesterBase } from './FunctionTesterBase';

class CSharpScriptFunctionTester extends FunctionTesterBase {
    public language: ProjectLanguage = ProjectLanguage.CSharpScript;

    public constructor(source: TemplateSource) {
        super(FuncVersion.v1, source);
    }

    public getExpectedPaths(functionName: string): string[] {
        return [
            path.join(functionName, 'function.json'),
            path.join(functionName, 'run.csx')
        ];
    }
}

for (const source of allTemplateSources) {
    // NOTE: Only need to test v1 since v2+ emphasizes C# class libraries instead of C#Script
    const tester: CSharpScriptFunctionTester = new CSharpScriptFunctionTester(source);
    suite(tester.suiteName, function (this: Mocha.Suite): void {
        suiteSetup(async function (this: Mocha.Context): Promise<void> {
            if (shouldSkipVersion(tester.version)) {
                this.skip();
            }

            await tester.initAsync();
        });

        suiteTeardown(async () => {
            if (!shouldSkipVersion(tester.version)) {
                await tester.dispose();
            }
        });

        // Intentionally testing IoTHub trigger since a partner team plans to use that
        const iotTemplateId: string = 'IoTHubTrigger-CSharp';
        const iotFunctionName: string = 'createFunctionApi';
        const iotConnection: string = 'test_EVENTHUB';
        const iotPath: string = 'test-workitems';
        const iotConsumerGroup: string = 'testconsumergroup';
        const iotTriggerSettings: {} = { connection: iotConnection, path: iotPath, consumerGroup: iotConsumerGroup };
        const iotExpectedContents: string[] = [iotConnection, iotPath, iotConsumerGroup];

        // https://github.com/Microsoft/vscode-azurefunctions/blob/main/docs/api.md#create-local-function
        test('createFunction API (deprecated)', async () => {
            // Intentionally testing IoTHub trigger since a partner team plans to use that
            await runWithFuncSetting(projectLanguageSetting, ProjectLanguage.CSharpScript, async () => {
                await runWithFuncSetting(funcVersionSetting, FuncVersion.v1, async () => {
                    await vscode.commands.executeCommand('azureFunctions.createFunction', tester.projectPath, iotTemplateId, iotFunctionName, iotTriggerSettings);
                });
            });
            await tester.validateFunction(tester.projectPath, iotFunctionName, iotExpectedContents);
        });

        test('createNewProjectAndFunction API (deprecated)', async () => {
            const projectPath: string = path.join(tester.projectPath, 'createNewProjectAndFunction');
            await vscode.commands.executeCommand('azureFunctions.createNewProject', projectPath, 'C#Script', '~1', false /* openFolder */, iotTemplateId, iotFunctionName, iotTriggerSettings);
            await tester.validateFunction(projectPath, iotFunctionName, iotExpectedContents);
            await validateProject(projectPath, getDotnetScriptValidateOptions(ProjectLanguage.CSharpScript, FuncVersion.v1));
        });
    });
}
