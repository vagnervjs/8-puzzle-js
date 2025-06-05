/**
 * Fades out an HTML element over a specified duration.
 * @param element The HTML element to fade out. Can be `null`, in which case the function resolves immediately.
 * @param duration The duration of the fade-out animation in milliseconds. Defaults to 300ms.
 * @returns A Promise that resolves when the fade-out animation is complete and the element's display is set to 'none'.
 */
export function fadeOut(element: HTMLElement | null, duration: number = 300): Promise<void> {
    return new Promise(resolve => {
        if (!element) {
            resolve();
            return;
        }
        element.style.opacity = '1';
        element.style.transition = `opacity ${duration}ms ease-in-out`;
        // Timeout to ensure transition property is applied before opacity change
        setTimeout(() => {
            element.style.opacity = '0';
            setTimeout(() => {
                element.style.display = 'none';
                // Clear transition and opacity for future reuse if element is shown again
                element.style.transition = '';
                element.style.opacity = '';
                resolve();
            }, duration);
        }, 10);
    });
}

/**
 * Fades in an HTML element over a specified duration.
 * @param element The HTML element to fade in. Can be `null`, in which case the function resolves immediately.
 * @param duration The duration of the fade-in animation in milliseconds. Defaults to 300ms.
 * @param displayStyle The CSS display value to apply to the element when making it visible (e.g., 'block', 'flex'). Defaults to 'block'.
 * @returns A Promise that resolves when the fade-in animation is complete.
 */
export function fadeIn(element: HTMLElement | null, duration: number = 300, displayStyle: string = 'block'): Promise<void> {
    return new Promise(resolve => {
        if (!element) {
            resolve();
            return;
        }
        element.style.display = displayStyle;
        element.style.opacity = '0'; // Start transparent
        element.style.transition = `opacity ${duration}ms ease-in-out`;
        // Timeout to allow display property to take effect and element to be rendered
        // before starting the opacity transition.
        setTimeout(() => {
            element.style.opacity = '1'; // Fade to fully visible
            setTimeout(() => {
                 // Clear transition and opacity for future reuse if element is faded again
                element.style.transition = '';
                element.style.opacity = ''; // Consistent with fadeOut
                resolve();
            }, duration);
        }, 10);
    });
}

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
