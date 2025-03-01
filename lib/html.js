
/**
 * Utility function to create an HTML element from a string.
 * @param {*} strings 
 * @param  {...any} values 
 * @returns {HTMLElement | null}
 */
export function html(strings, ...values) {
  const template = document.createElement("template");
  template.innerHTML = strings.reduce((acc, str, i) => acc + values[i - 1] + str);
  return template.content.firstElementChild;
}

/**
 * Utility function to create a style element from a template literal.
 * @param {*} strings - Array of string literals
 * @param  {...any} values - Interpolated values
 * @returns {HTMLStyleElement} The created style element
 */
export function css(strings, ...values) {
  const style = document.createElement("style");
  style.textContent = strings.reduce((acc, str, i) => acc + values[i - 1] + str);
  return style;
}

export default { html };