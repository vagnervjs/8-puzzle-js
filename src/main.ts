import { onDocumentReady } from './domUtils';
import { GameUIController } from './gameUI';

// Module-level TSDoc clarifying the purpose of this entry point file.
/**
 * Main entry point for the 8-Puzzle application.
 *
 * This file is responsible for initializing the game's user interface controller
 * once the DOM is fully loaded. It orchestrates the setup by creating an instance
 * of `GameUIController`, which then handles all further game logic, UI interactions,
 * and event bindings.
 *
 * Type definitions are centralized in `src/types.ts`.
 * Core puzzle state logic and constants are in `src/puzzleLogic.ts`.
 * The A* search algorithm is implemented in `src/astar.ts`.
 * DOM manipulation utilities are available in `src/domUtils.ts`.
 * The primary UI and game flow management is handled by `GameUIController` in `src/gameUI.ts`.
 */

/**
 * Callback function executed when the DOM is ready.
 * Initializes and starts the game by creating an instance of {@link GameUIController}.
 */
onDocumentReady(() => {
  // Initialize the game UI and logic.
  // The GameUIController's constructor handles all necessary setup,
  // including querying DOM elements and binding initial event listeners.
  new GameUIController();
});

// Example: For debugging purposes, one might expose the instance to the window:
//
// onDocumentReady(() => {
//   const gameInstance = new GameUIController();
//   (window as any).currentGameInstance = gameInstance;
//   console.log("Game instance available on window.currentGameInstance for debugging.");
// });

// The previous monolithic 'Game' object has been refactored and its responsibilities
// have been distributed across the more modular structure outlined above.
// This `main.ts` file now serves only as the clean entry point to bootstrap the application.
