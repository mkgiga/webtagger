/**
 * @fileoverview A straightforward context menu implementation that even your grandmother could use.
 * @module contextmenu
 * @version 1.0.0
 * @license MIT
 * @example
 * ```js
 * import contextMenu from "./contextmenu.js";
 *
 * const menu = contextMenu({
 *   items: [
 *     { label: "Copy", value: () => console.log("Copy clicked") },
 *     { label: "Cut", value: () => console.log("Cut clicked") },
 *     { label: "Paste", value: () => console.log("Paste clicked") },
 *     {
 *       label: "Settings...",
 *       value: [
 *         { label: "Font", value: () => console.log("Font clicked") },
 *         { label: "Theme", value: () => console.log("Theme clicked") }
 *       ]
 *     }
 *   ],
 *   x: 100,
 *   y: 100
 * });
 *
 * document.body.appendChild(menu);
 * ```
 */

/**
 * @typedef ContextMenuItem
 *
 * @property {string} label
 * The text to display in the menu item
 *
 * @property {Function | ContextMenu} value
 * Either a function to call when the item is clicked, or an array of items to display in a submenu of the same structure
 *
 * @property {boolean} [disabled]
 * If the item is disabled, it will not be clickable, but will still be rendered as a menu item
 */

/**
 * @typedef ContextMenuOptions
 *
 * @property {ContextMenuItem[]} items
 * The items to display in the context menu
 *
 * @property {number} x
 * The x coordinate of the menu
 *
 * @property {number} y
 * The y coordinate of the menu
 *
 * @property {Object} cssOverrides
 * An object containing CSS overrides for the menu and its items
 *
 * @property {string} cssOverrides.menu
 * CSS to override the menu container
 *
 * @property {string} cssOverrides.item
 * CSS to override the menu items
 *
 * @property {string} cssOverrides.group
 * CSS to override the menu groups
 */

/**
 * A straightforward context menu element that can be spawned anywhere on the page viewport.
 * @example
 * ```js
 * import contextMenu from "./contextmenu.js";
 *
 * const menu = contextMenu({
 *   items: [
 *     { label: "Copy", value: () => console.log("Copy clicked") },
 *     { label: "Cut", value: () => console.log("Cut clicked") },
 *     { label: "Paste", value: () => console.log("Paste clicked") },
 *     {
 *       label: "Settings...",
 *       value: [
 *         { label: "Font", value: () => console.log("Font clicked") },
 *         { label: "Theme", value: () => console.log("Theme clicked") }
 *       ]
 *     }
 *   ],
 *   x: 100,
 *   y: 100
 * });
 *
 * document.body.appendChild(menu);
 * ```
 * @returns {HTMLElement}
 */

export default function contextMenu({
  items = [],
  x = 0,
  y = 0,
  cssOverrides = {
    menu: "",
    item: "",
    group: "",
  },
}) {
  const MINIMUM_WIDTH = 256;
  const ITEM_HEIGHT = 24;

  /**
   * Utility function to create a HTML element from a string template
   * @param {string} strings
   * @param  {...any} values
   * @returns {HTMLElement}
   */
  function html(strings, ...values) {
    const template = document.createElement("template");
    template.innerHTML = strings.reduce(
      (acc, str, i) => acc + str + (values[i] || ""),
      ""
    );
    return template.content.firstElementChild;
  }

  /**
   * Call this recursively for each submenu (including the top level)
   * @param {Object} options
   * @param {HTMLElement | null} parent - The parent element that was hovered/clicked
   * @param {Array} items - The items to display in the menu
   */
  function createMenu({ parent = null, items = [], x = 0, y = 0 }) {
    let bounds;

    if (parent) {
      bounds = parent.getBoundingClientRect();

      // where will the menu fit? we have to place it first to measure it,
      // but we can turn off visibility to avoid flickering
    }

    const menuElement = html`
      <div class="__context-menu">
        <style>
          @scope (.__context-menu) {
            :scope {
              @media (prefers-color-scheme: dark) {
                --context-menu-background: #333;
                --context-menu-color: #fff;
                --context-menu-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
                --context-menu-item-hover: #444;
                --context-menu-item-active: #555;
                --context-menu-item-border: 1px solid #555;
              }

              @media (prefers-color-scheme: light) {
                --context-menu-background: #fff;
                --context-menu-color: #333;
                --context-menu-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
                --context-menu-item-hover: #f1f1f1;
                --context-menu-item-active: #e1e1e1;
                --context-menu-item-border: 1px solid #e1e1e1;
              }

              & {
                position: fixed;
                display: flex;
                flex-direction: column;
                background: white;
                box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
                border: none;
                padding: 0;
                margin: 0;
                z-index: 10000000007;

                top: ${y}px;
                left: ${x}px;

                background: var(--context-menu-background);
                color: var(--context-menu-color);

                min-width: ${MINIMUM_WIDTH}px;

                ${cssOverrides.menu}
              }

              .__context-menu-item {

                position: relative;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
                width: 100%;
                min-width: ${MINIMUM_WIDTH}px;
                height: ${ITEM_HEIGHT}px;
                padding: 0 1rem;
                box-sizing: border-box;
                cursor: pointer;
                user-select: none;

                /* preventing the text from triggering the event listeners */

                .__context-menu-item-label {
                  pointer-events: none;
                  user-select: none;
                }

                .__context-menu-submenu-icon {
                  pointer-events: none;
                  user-select: none;
                }

                &[disabled] {
                  .__context-menu-item-label {
                    opacity: 0.5;
                  }

                  .__context-menu-submenu-icon {
                    opacity: 0.5;
                  }

                  cursor: not-allowed
                }

                &:not([disabled]):hover {
                  background: var(--context-menu-item-hover);
                }

                ${cssOverrides.item}
              }

              .__context-menu-group {
                &:not(:first-child) {
                  border-top: var(--context-menu-item-border);
                }

                ${cssOverrides.group}
              }
            }
          }
        </style>
      </div>
    `;

    if (!parent) {
      menuElement.setAttribute("role", "menu");
      menuElement.setAttribute("__context-menu-root", "");

      window.addEventListener("click", (e) => {
        if (!e.target.closest(".__context-menu")) {
          menuElement.remove();
        }
      });

      window.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        menuElement.remove();
      });
    }

    createMenuGroup({ parentMenu: menuElement, items });

    return menuElement;
  }

  function createMenuItem({ parentMenu, label, value, disabled }) {
    const itemElement = html`
      <div class="__context-menu-item" ${disabled ? "disabled" : ""}>
        <span class="__context-menu-item-label">${label}</span>
      </div>
    `;

    if (typeof value === "function") {
      itemElement.addEventListener("click", (e) => {
        e.stopPropagation();

        if (itemElement.hasAttribute("disabled")) {
          return;
        }

        value(e);

        const rootElement = itemElement.closest("[__context-menu-root]");
        rootElement.remove();
      });
    } else if (Array.isArray(value)) {
      const submenuIndicator = html`
        <span class="__context-menu-submenu-icon material-icons"
          >chevron_right</span
        >
      `;

      itemElement.appendChild(submenuIndicator);

      function open(e) {
        createMenu({
          parent: itemElement,
          items: value,
        });
      }

      let tmr = null;

      itemElement.addEventListener("click", (e) => {
        open(e);

        if (tmr) {
          clearTimeout(tmr);
        }
      });

      itemElement.addEventListener("mouseenter", () => {
        tmr = setTimeout(open, 500);

        itemElement.addEventListener("mouseleave", () => {
          clearTimeout(tmr);
        });
      });
    }
    parentMenu.appendChild(itemElement);
  }

  function createMenuGroup({ parentMenu, items = [] }) {
    const groupElement = html` <div class="__context-menu-group"></div> `;

    for (const item of items) {
      if (Array.isArray(item)) {
        createMenuGroup({ parentMenu: groupElement, items: item });
      } else if (typeof item === "object") {
        createMenuItem({ parentMenu: groupElement, ...item });
      }
    }

    parentMenu.appendChild(groupElement);
  }

  const menu = createMenu({ items, x, y });

  return menu;
}

const exampleItemsArray = [
  // an array signifies a group of items, which gets rendered with a separator
  [
    {
      label: "Copy", // the text to display
      value: (e) => {}, // the function to call when clicked
    },
    {
      label: "Cut",
      value: (e) => {},
    },
    {
      label: "Paste",
      value: (e) => {},
    },
  ],
  {
    label: "Settings...",
    disabled: true, // if the item is disabled, it will not be clickable
    value: [
      // if the value is an object, it becomes a submenu, which has the same structure as the top level
      {
        label: "Font",
        value: (e) => {},
      },
      {
        label: "Theme",
        value: (e) => {},
      },
    ],
  },
];
