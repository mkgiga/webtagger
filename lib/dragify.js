import { html } from "./html.js";

const DRAGGABLE_CLASS = "draggable";
const DROP_ZONE_CLASS = "drop-zone";
const DRAGGING_CLASS = "dragging";

/**
 * Call to make an element draggable.
 * @param {
 *   element: HTMLElement,
 * } param0 
 */
export default function dragify({
  element = document.createElement("div"),
  snapback = true // whether the element should snap back to its original position if not dropped in a drop zone
}) {
  element.classList.add(DRAGGABLE_CLASS);

  element.addEventListener("mousedown", (event) => {
    event.preventDefault();

    element.classList.add(DRAGGING_CLASS);

    const offsetX = event.offsetX;
    const offsetY = event.offsetY;

    const originalX = element.offsetLeft;
    const originalY = element.offsetTop;
    const originalParent = element.parentElement;
    const originalNextSibling = element.nextSibling;
    const originalPosition = element.style.position;
    const originalZIndex = element.style.zIndex;
    
    const drag = (event) => {
      element.style.left = `${event.clientX - offsetX}px`;
      element.style.top = `${event.clientY - offsetY}px`;
    }

    element.style.position = "fixed";
    element.style.left = `${originalX}px`;
    element.style.top = `${originalY}px`;
    element.style.zIndex = 1000;


    /**
     * 
     * @param {MouseEvent} e 
     */
    const stop = (e) => {
      element.classList.remove(DRAGGING_CLASS);

      const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
      const foundOne = false;

      // find the first element not an ancestor of the draggable element which is a drop zone
      for (const el of elementsAtPoint) {
        if (el.classList.contains(DROP_ZONE_CLASS) && !element.contains(el)) {
          el.appendChild(element);
          element.style.left = "0px";
          element.style.top = "0px";
          element.style.position = "static";
          foundOne = true;
        }
      }

      if (!foundOne && snapback) {
        originalParent.insertBefore(element, originalNextSibling);
        element.style.position = originalPosition;
        element.style.left = `${originalX}px`;
        element.style.top = `${originalY}px`;
        element.style.zIndex = originalZIndex;
        
      }

      document.removeEventListener("mousemove", drag);
      document.removeEventListener("mouseup", stop);
    }

    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", stop);
  });

  return element;
}