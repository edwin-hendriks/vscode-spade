'use strict';

import * as Path from 'path';
import * as Net from 'net';
import * as PortFinder from 'portfinder';
import * as ChildProcess from 'child_process';
import * as vscode from 'vscode';
import {Logger} from 'vscode-jsonrpc';
import {LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, StreamInfo} from 'vscode-languageclient';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Extension "vscode-spade" is now active');

    vscode.languages.setLanguageConfiguration('spade', {
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
        comments: {
            lineComment: '//',
            blockComment: ['/*', '*/']
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
        ],
    });

    let logger: Logger = console; 
        
    let clientOptions: LanguageClientOptions = {
        // Register the server for spade documents
        documentSelector: ['spade'],
        synchronize: {
            // Synchronize the setting section 'spade' to the server
            // NOTE: this currently doesn't do anything
            configurationSection: 'spade',
            fileEvents: [
                vscode.workspace.createFileSystemWatcher('**/*.spade')
            ]
        },
        // errorHandler: {
        //     error: function(error: Error, message: Message, count: number): ErrorAction {},
        //     closed: function(): CloseAction {},
        // },
    }

    function connectToServer(): Promise<StreamInfo> {
        let javaExecutablePath = "java";
        return new Promise((resolve, reject) => {
            let debug = false;
            if (debug) {
                let socket = Net.connect(12345);
                resolve({ reader: socket, writer: socket });
            }
            else {
                PortFinder.basePort = 9542;
                PortFinder.getPort((err, port) => {
                    startServer(port);
                    let socket = Net.connect({ port }, () => {
                        logger.info("Connected to SPADE Language Server");
                        resolve({ reader: socket, writer: socket });
                    });
                });
            }
        });
    }
    
    function startServer(port: number) {
        let jarFile = process.env["PAGEN_SERVER_JAR"];
        let args = [ '-Dstcs.port=' + port, '-jar', jarFile ];

        let child = ChildProcess.execFile('java', args, { cwd: vscode.workspace.rootPath });
        child.stdout.on('data', (data) => {
            logger.info('' + data);
        });
        child.stderr.on('data', (data) => {
            logger.error('' + data);
        });
        child.on('error', (err) => {
            logger.error('Failed to start child process: ' + err);
        });
        child.on('exit', (code) => {
            logger.info(`Child exited with code ${code}`);
        });
    }

    let client = new LanguageClient('SPADE Language Server', connectToServer, clientOptions);
    logger = {
        error: function(message: string): void { client.error(message.trim()); },
        warn: function(message: string): void { client.warn(message.trim());  },
        info: function(message: string): void { client.info(message.trim()); },
        log: function(message: string): void { client.info(message.trim()); },
    };

    let disposable = client.start();

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
