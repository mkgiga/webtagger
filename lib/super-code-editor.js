import { html, css } from "./html.js";

/**
 * Create a configurable code editor element.
 * @returns {HTMLElement} The code editor element.
 */
export default function codeEditor({
  value = "",

  // Configuration
  config = defaultConfig,

  // Event hooks
  onInput = (e) => {},
}) {
  // Inline style variables, overridable by the user
  const editor = html`
    <div class="super-code-editor" style="">
      <textarea class="super-code-editor__textarea"></textarea>
    </div>
  `;

  // Loop through the variable overrides and set them as CSS variables
  for (const [key, value] of Object.entries(config.css.variableOverrides)) {
    if (key.startsWith("--")) {
      editor.style.setProperty(key, value);
    } else {
      let newKey = `--${key}`;

      if (!newKey.startsWith("--")) {
        throw new Error(
          `Invalid variable name: '${key}', must start with '--'.`
        );
      }

      editor.style.setProperty(newKey, value);
    }
  }

  // Inject custom CSS into the editor if no other editor on the page has done so
  const existingStyle = document.querySelector("#super-code-editor__style");

  if (!existingStyle) {
    // Set the style for the editor
    const style = css`
      @scope (.super-code-editor) {
        :scope {
          .super-code-editor {
            position: relative;
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
          }

          .super-code-editor__textarea {
            position: relative;
            display: block;
            flex-grow: 1;
            width: 100%;
            height: 100%;
            white-space: pre-wrap;

            outline: none;
            resize: none;
            overflow: auto;

            font-family: var(--textbox-font-family);
            font-size: var(--textbox-font-size);
            line-height: var(--textbox-line-height);
            color: var(--textbox-color);
            background: var(--textbox-background);
            border: var(--textbox-border);
            border-radius: var(--textbox-border-radius);
            box-shadow: var(--textbox-box-shadow);
            font-family: var(--textbox-font-family);
            text-indent: var(--textbox-text-indent);

            &:focus {
              outline: none;
            }
          }
        }
      }
    `;

    style.id = "super-code-editor__style";

    editor.prepend(style);
  }

  /**
   * @type {HTMLTextAreaElement}
   */
  const textarea = editor.querySelector(".super-code-editor__textarea");

  // setting it here instead of in the HTML template to avoid invalid HTML in the template
  textarea.value = value;

  const insertDataHandlers = {
    insertText: (e) => {
      const data = e.data;
      // Handle insertText event if needed
    },
  };

  /**
   *
   * @param {InputEvent} e
   */
  function _onInput(e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.inputType === "insertText") {
      const handler = insertDataHandlers[e.inputType];
      if (handler) {
        handler(e);
      }
    }

    // 5. Trigger the onInput event
    onInput(e);
  }

  const keyDownHandlers = {
    /**
     * When the Enter key is pressed, insert a newline and then indent to
     * the same level as the current line. This is useful for writing code
     * where indentation is important.
     */
    Enter: (e) => {
      e.preventDefault();
  
      const textarea = e.target;
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const value = textarea.value;
  
      // Get the current line up to the cursor position
      const currentLine = value.substring(0, startPos).split('\n').pop();
      const indent = currentLine.match(/^\s*/)[0]; // Get the leading whitespace
  
      // Insert newline and the same indentation
      textarea.value = value.substring(0, startPos) + '\n' + indent + value.substring(endPos);
  
      // Move the cursor to the correct position
      const newCursorPos = startPos + 1 + indent.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    },
  
    /**
     * Handles the Tab key press event to insert an indentation at the cursor position.
     * Prevents the default Tab behavior and inserts the configured indentation characters,
     * moving the cursor to the end of the inserted indentation.
     * 
     * @param {KeyboardEvent} e - The keyboard event triggered by the Tab key press.
     */
    Tab: (e) => {
      e.preventDefault();
  
      const textarea = e.target;
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const value = textarea.value;
  
      // Insert the configured number of spaces or a tab character
      const indent = config.indenting.indentChar.repeat(config.indenting.indentSize);
      textarea.value = value.substring(0, startPos) + indent + value.substring(endPos);
  
      // Move the cursor to the end of the inserted indentation
      const newCursorPos = startPos + indent.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    },
  
    /**
     * When the user presses Backspace, we want to remove the configured indent character
     * for the configured indent size. If there's a selection, just delete it. Otherwise,
     * calculate the indentation of the current line and remove the corresponding number
     * of characters. If there's no indentation, just remove one character. Move the cursor
     * to the correct position afterwards.
     * @param {KeyboardEvent} e
     */
    Backspace: (e) => {
      const textarea = e.target;
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const value = textarea.value;
  
      if (startPos !== endPos) {
        // If there's a selection, just delete it
        textarea.value = value.substring(0, startPos) + value.substring(endPos);
        textarea.setSelectionRange(startPos, startPos);
        return;
      }
  
      // Get the current line up to the cursor position
      const currentLine = value.substring(0, startPos).split('\n').pop();
      const indent = currentLine.match(/^\s*/)[0]; // Get the leading whitespace
  
      if (startPos > 0 && indent.length > 0) {
        // Calculate the number of spaces to remove
        const spacesToRemove = Math.min(config.indenting.indentSize, indent.length);
        const newValue = value.substring(0, startPos - spacesToRemove) + value.substring(startPos);
        textarea.value = newValue;
  
        // Move the cursor to the correct position
        const newCursorPos = startPos - spacesToRemove;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      } else {
        // If there's no indentation, just remove one character
        textarea.value = value.substring(0, startPos - 1) + value.substring(startPos);
        textarea.setSelectionRange(startPos - 1, startPos - 1);
      }
    }
  };

  function onKeyDown(e) {
    const handler = keyDownHandlers[e.key];

    if (handler) {
      handler(e);
    }
  }

  // Attach event listeners
  textarea.addEventListener("input", _onInput);
  textarea.addEventListener("keydown", onKeyDown);

  return editor;
}

const defaultConfig = {
  indenting: {
    indentChar: " ",
    indentSize: 2,
    newlineMaintainIndent: true,
    /** 
     * Disable the backspace handler that removes n indent characters when
     * the cursor is between any of these delimiter pairs.
     * @type {Object<string, string>}
     */
    delimitersThatDisableBackspaceHandler: {
      '"': '"',
      "'": "'",
    }
  },

  brackets: {
    autoClose: true,
    autoCloseChars: {
      "(": ")",
      "[": "]",
      "{": "}",
      '"': '"',
      "'": "'",
    },
  },

  css: {
    customCSS: "",
    variableOverrides: {
      "--textbox-background": "#fff",
      "--textbox-border": "1px solid #ccc",
      "--textbox-border-radius": "4px",
      "--textbox-box-shadow": "0 2px 4px rgba(0, 0, 0, 0.1)",
      "--textbox-font-family": "monospace",
      "--textbox-font-size": "14px",
      "--textbox-line-height": "1.5",
      "--textbox-color": "#333",
      "--textbox-font-family": "monospace",
      "--textbox-text-indent": "8px",
    },
  },
};
