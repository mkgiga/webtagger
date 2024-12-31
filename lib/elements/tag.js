import { html } from "../html.js";
export default function tag({
  text = "mature_male"
}) {
  const el = html`
    <div class="visual-tag">
      <p class="tag-text">${text}</p>
    </div>
  `;
  
}

function colorFromText(string = "mature_male") {
  const hash = string.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const hue = hash % 360;
  return `hsl(${hue}, 50%, 50%)`;
}