import { html } from "./lib/html.js";
import codeEditor from "./lib/super-code-editor.js";

const myId = chrome.runtime.id;

const codeEditorContainer = document.getElementById("code-editor-container");
const codeEditorDebugMessagesContainer = document.getElementById(
  "code-editor-debug-messages-container"
);

/**
 * @type {HTMLUListElement}
 */
const codeEditorDebugMessages = document.getElementById(
  "code-editor-debug-messages-container"
);

async function tellContentScriptToInjectCSS(css = "") {
  try {
    return await chrome.runtime.sendMessage({
      type: "inject-css",
      css,
    });
  } catch (error) {
    console.error("Message failed:", error);
    return { error: error.message };
  }
}

async function onCodeEditorTextAreaInput(e) {
  const css = e.target.value;
  const res = await tellContentScriptToInjectCSS(css);
}

function addCodeEditor() {
  const editor = codeEditor({
    value: "body { background: red; }",
    onInput: onCodeEditorTextAreaInput,
    config: {
      css: {
        variableOverrides: {
          "editor-background": "red",
          "editor-text-color": "black",
          "--textbox-font-family": "Ubuntu Mono",
        },
      },
    }
  });

  codeEditorContainer.appendChild(editor);
}

addCodeEditor();