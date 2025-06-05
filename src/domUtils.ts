

/**
 * Executes a callback function once the DOM is fully loaded and parsed.
 * If the DOM is already loaded, the callback is executed asynchronously via `setTimeout`.
 * @param fn The function to call once the DOM is ready.
 */
export function onDocumentReady(fn: () => void): void {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        // If the DOM is already loaded, execute the function immediately,
        // but use setTimeout to ensure it runs asynchronously like DOMContentLoaded,
        // preventing potential race conditions or unexpected synchronous execution.
        setTimeout(fn, 0);
    }
}

/**
 * A generic query selector function that optionally takes a type parameter for the returned element.
 * @template T The type of the HTMLElement to be returned. Defaults to HTMLElement.
 * @param selector The CSS selector string.
 * @returns The first element matching the selector, or `null` if no match is found. Typed as T or null.
 */
export function qs<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    return document.querySelector(selector) as T | null;
}

/**
 * A generic query selector all function that optionally takes a type parameter for the returned elements.
 * @template T The type of the HTMLElement to be returned in the NodeListOf. Defaults to HTMLElement.
 * @param selector The CSS selector string.
 * @returns A static NodeListOf<T> containing all elements matching the selector.
 */
export function qsa<T extends HTMLElement = HTMLElement>(selector: string): NodeListOf<T> {
    return document.querySelectorAll(selector) as NodeListOf<T>;
}
