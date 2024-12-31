
/**
 * @file informal.js
 * @description Library for converting HTML forms to JSON and vice versa.
 * @date 2024-12-10
 * @author mkgiga
 * @license MIT
 */

export function serialize({ element, options = {} }) {

}

export function deserialize({ json = "", options = {} }) {

}

function sanitizeHTMLValue(value = "") {
  return value
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function sanitizeValueToJSON(value = "") {
  return value
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '\"').replace(/&#039;/g, "'");
}


/**
 * Utility function to create an HTML element from a string.
 * @param {*} strings 
 * @param  {...any} values 
 * @returns {HTMLElement | null}
 */
function html(strings, ...values) {
  const template = document.createElement("template");
  template.innerHTML = strings.reduce((acc, str, i) => acc + values[i - 1] + str);
  return template.content.firstElementChild;
}

/**
 * @typedef {typeof styleOptions} StyleOptions
 */

/**
 * The default style options
 */
const styleOptions = {
  ["&"]: {},
  header: {
    ["&"]: {},
    label: {},
    add: {},
    remove: {}
  },
  list: {
    ["&"]: {},
    item: {
      label: {},
      text: {},
      checkbox: {},
      select: {
        ["&"]: {},
        option: {}
      },
      color: {},
      number: {},
      range: {},
      radio: {},
      file: {},
      textarea: {}
    },
  }
}

const exampleElement = html`
  <form id="example-form">
    <section name="User Information">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required default-value="" />
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required default-value="" />

      <!-- Nested section -->
      <section name="Personal Information">
        <label for="name" required>Name</label>
        <input type="text" id="name" name="name" default-value="" />
        <label for="birthday">Birthday</label>
        <input type="date" id="birthday" name="birthday" default-value="" />
        <label for="phone">Phone</label>
        <input type="tel" id="phone" name="phone" default-value="" />
        <label for="address">Address</label>
        <input type="text" id="address" name="address" default-value="" />
        <label for="city">City</label>
        <input type="text" id="city" name="city" default-value="" />
        <label for="state">State</label>
        <input type="text" id="state" name="state" default-value="" />
        <label for="zip">Zip</label>
        <input type="text" id="zip" name="zip" default-value="" />
      </section>
    </section>

    <section name="Preferences">
      <label for="theme">Theme</label>
      <select id="theme" name="theme" default-value="light" value="light">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <label for="notifications">Notifications</label>
      <input type="checkbox" id="notifications" name="notifications" default-value="true" />
    </section>

    <section name="Profile Picture">
      <label for="profile-picture">Profile Picture</label>
      <input type="file" id="profile-picture" name="profile-picture" accept="image/*" />
    </section>

    <input type="submit" value="Submit" />
  </form>
`;