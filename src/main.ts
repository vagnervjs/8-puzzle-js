import { onDocumentReady } from './domUtils';
import { GameUIController } from './gameUI';

/**
 * Main entry point for the 8-Puzzle application.
 */
onDocumentReady(() => {
  new GameUIController();
});


