
/**
 * Utility function to create an HTML element from a string.
 * @param {*} strings 
 * @param  {...any} values 
 * @returns {HTMLElement | null}
 */
export default function html(strings, ...values) {
  const template = document.createElement("template");
  template.innerHTML = strings.reduce((acc, str, i) => acc + values[i - 1] + str);
  return template.content.firstElementChild;
}

export { html };