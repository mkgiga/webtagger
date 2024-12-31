import { html } from '../html.js';

export default function imageEntry({
  src = '',
  tags = [],
}) {
  const el = html`
    <div class="image-entry">
      <img src="${src}" />
      <div class="tags">
        <textarea>
          ${tags.join(', ').trim()}
        </textarea>
      </div>
    </div>
  `;

  return el;
}