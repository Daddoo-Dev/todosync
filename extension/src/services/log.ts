import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

function getChannel(): vscode.OutputChannel {
  if (!channel) channel = vscode.window.createOutputChannel('ToDoSync');
  return channel;
}

export const log = {
  debug(message: string) {
    const enabled = vscode.workspace.getConfiguration().get<boolean>('todoSync.enableDebug', false);
    if (!enabled) return;
    const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
    getChannel().appendLine(`[${timestamp}] ${message}`);
  }
};


