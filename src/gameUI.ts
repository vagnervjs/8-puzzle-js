import { fadeIn, fadeOut, qs, qsa } from './domUtils';
import type { BoardState, SearchNodeAction } from './types';
import { POS_ADJACENCY, NUM_SQUARES, isSolved as isBoardSolved, getIndexFromSquareNumber, getSquareNumberFromIndex } from './puzzleLogic';
import { performAStarSearch } from './astar';

/**
 * Manages the user interface, game state interactions, and event handling for the 8-puzzle game.
 */
export class GameUIController {
    /** The CSS selector ID for the currently empty square (e.g., '#sq-9'). */
    private freeSquareId: string;
    /** Tracks the number of moves made by the player. */
    private currentMoves: number = 0;
    /** Stores the sequence of actions for the bot's solution animation. */
    private solutionActions: SearchNodeAction[] = [];
    /** Bound event handler for square click events to ensure correct `this` context. */
    private readonly boundHandleSquareClick: (event: Event) => void;

    // DOM Element references
    private readonly mixButton: HTMLButtonElement | null;
    private readonly solveButton: HTMLButtonElement | null;
    private readonly movesInput: HTMLInputElement | null;
    private readonly movesNumArea: HTMLParagraphElement | null;
    private readonly botMessageArea: HTMLParagraphElement | null;
    private readonly gameArea: HTMLDivElement | null;
    private readonly squares: NodeListOf<HTMLLIElement>;

    /**
     * Initializes the GameUIController, querying DOM elements and setting up initial state.
     */
    constructor() {
        this.mixButton = qs<HTMLButtonElement>("#mix");
        this.solveButton = qs<HTMLButtonElement>("#solve");
        this.movesInput = qs<HTMLInputElement>("#moves");
        this.movesNumArea = qs<HTMLParagraphElement>("#moves_num");
        this.botMessageArea = qs<HTMLParagraphElement>("#bot_message");
        this.gameArea = qs<HTMLDivElement>('.game');
        this.squares = qsa<HTMLLIElement>(".square");

        if (!this.gameArea || this.squares.length !== NUM_SQUARES) { // Check for exact number of squares
            console.error("Critical game elements (.game area or .square) not found or incorrect count in the DOM.");
            // Consider throwing an error to halt execution if the UI is unusable
            // throw new Error("Failed to initialize GameUIController: Critical DOM elements missing.");
        }

        this.freeSquareId = this.findInitialFreeSquareIdSafe();
        // Bind event handler once and store it for consistent add/remove operations
        this.boundHandleSquareClick = this.handleSquareClick.bind(this);
        this.init();
    }

    /**
     * Initializes event listeners for UI controls and sets up the initial game UI state.
     * Called by the constructor.
     */
    private init(): void {
        this.bindSquareClicks();
        this.mixButton?.addEventListener("click", this.handleMixClick.bind(this));
        this.solveButton?.addEventListener("click", this.handleSolveClick.bind(this));
        this.updateMovesCounter(0, 'Player');
    }

    /**
     * Safely finds the initial free square ID from the DOM.
     * Iterates through squares to find one with the 'free' class.
     * If none is found, it defaults to the last square as defined by `NUM_SQUARES`
     * and attempts to mark it as free.
     * @returns The CSS selector string for the free square (e.g., '#sq-9').
     */
    private findInitialFreeSquareIdSafe(): string {
        for (const square of Array.from(this.squares)) {
            if (square.classList.contains('free')) {
                return `#${square.id}`;
            }
        }

        const lastSquareIdNum = NUM_SQUARES; // e.g., 9
        const lastSquareSelector = `#sq-${lastSquareIdNum}`;
        const lastSquareElement = qs<HTMLLIElement>(lastSquareSelector);

        if (lastSquareElement) {
            console.warn(`No square initially had the 'free' class. Defaulting to ${lastSquareSelector} and adding 'free' class.`);
            lastSquareElement.classList.add('free');
            return lastSquareSelector;
        }

        // Absolute fallback if HTML structure is severely broken (no #sq-X for last square)
        console.error(`Cannot find the last square (#sq-${lastSquareIdNum}) to designate as free. Defaulting to #sq-9.`);
        qs<HTMLLIElement>("#sq-9")?.classList.add("free"); // Attempt to mark #sq-9 if it exists
        return '#sq-9';
    }

    /**
     * Binds click event listeners to all puzzle squares.
     * It ensures that any existing listeners are removed before adding new ones to prevent duplicates.
     */
    private bindSquareClicks(): void {
        this.squares.forEach(square => {
            square.removeEventListener("click", this.boundHandleSquareClick); // Prevent duplicate listeners
            square.addEventListener("click", this.boundHandleSquareClick);
        });
    }

    /**
     * Enables or disables click interactions on all puzzle squares.
     * @param disabled `true` to disable clicks by removing the event listener, `false` to enable by re-binding.
     */
    private toggleSquareInteraction(disabled: boolean): void {
        this.squares.forEach(square => {
            if (disabled) {
                square.removeEventListener("click", this.boundHandleSquareClick);
            } else {
                // Re-bind, ensuring listener is added only once if called multiple times
                square.removeEventListener("click", this.boundHandleSquareClick);
                square.addEventListener("click", this.boundHandleSquareClick);
            }
        });
    }

    /**
     * Enables or disables the main control buttons ("Mix", "Solve with Bot").
     * @param disabled `true` to disable the buttons, `false` to enable them.
     */
    private toggleControlButtons(disabled: boolean): void {
        if (this.mixButton) this.mixButton.disabled = disabled;
        if (this.solveButton) this.solveButton.disabled = disabled;
    }

    /**
     * Displays a message in the designated bot message area on the UI.
     * @param text The message string to display.
     * @param _type The type of message (e.g., 'info', 'error', 'success'). Currently, this parameter is not used for styling.
     */
    private displayMessage(text: string, _type: 'info' | 'error' | 'success' = 'info'): void {
        if (this.botMessageArea) {
            this.botMessageArea.textContent = text;
        } else {
            console.warn("Bot message area not found in DOM. Message:", text);
        }
    }

    /**
     * Updates the displayed move counter on the UI.
     * @param count The number of moves to display. If `null`, the move counter display is cleared.
     * @param context A string indicating the source of the moves ('Player', 'Bot', or 'Mix').
     */
    private updateMovesCounter(count: number | null, context: 'Player' | 'Bot' | 'Mix'): void {
        if (this.movesNumArea) {
            if (count === null) {
                 this.movesNumArea.textContent = ""; // Clear message
            } else {
                 this.movesNumArea.textContent = `# of moves: ${count} (${context})`;
            }
        }
        // Bot moves are for display during animation; only player/mix moves update the internal counter.
        if (context !== 'Bot') {
            this.currentMoves = count ?? 0;
        }
    }

    /**
     * Visually moves a piece on the DOM from its current square to the target (empty) square.
     * This involves moving the piece's DOM element and updating CSS classes.
     * It also updates the internal `freeSquareId` to reflect the new empty square.
     * @param pieceToMoveSquareId The CSS selector for the square of the piece to be moved (e.g., '#sq-1').
     * @param targetFreeSquareId The CSS selector for the currently empty square where the piece will move.
     */
    private movePieceOnDOM(pieceToMoveSquareId: string, targetFreeSquareId: string): void {
        const pieceElement = qs<HTMLLIElement>(pieceToMoveSquareId);
        const targetElement = qs<HTMLLIElement>(targetFreeSquareId);

        if (pieceElement && targetElement) {
            const pieceContent: Element | null = pieceElement.firstElementChild;
            if (pieceContent) {
                targetElement.appendChild(pieceContent);
            }
            targetElement.classList.remove('free');
            // It's safer to explicitly clear the pieceElement if it might contain more than just the piece div
            // However, if structure is guaranteed (li > div), appendChild moving the div effectively empties it.
            // For robustness: pieceElement.innerHTML = '';
            pieceElement.classList.add('free');
            this.freeSquareId = pieceToMoveSquareId;
        } else {
            console.error(`Error moving piece: DOM element not found. PieceSquare: ${pieceToMoveSquareId}, TargetSquare: ${targetFreeSquareId}`);
        }
    }

    /**
     * Handles click events on puzzle squares when a player interacts with the board.
     * If a clicked square is adjacent to the free square, it triggers a move.
     * After the move, it increments the player's move count and checks for a win condition.
     * @param event The click `Event` object from the square.
     */
    private async handleSquareClick(event: Event): Promise<void> {
        const clickedSquareElement = event.currentTarget as HTMLLIElement | null;
        if (!clickedSquareElement?.id) {
            console.warn("Clicked square has no ID or is not an HTMLElement.");
            return;
        }

        const clickedSquareIdNumStr = clickedSquareElement.id.split('-')[1];
        const freeSquareIdNumStr = this.freeSquareId.split('-')[1]; // Assumes format like '#sq-X'

        if (!clickedSquareIdNumStr || !freeSquareIdNumStr) {
            console.error("Could not parse square IDs for move logic.");
            return;
        }
        const clickedSquareIdNum = parseInt(clickedSquareIdNumStr, 10);
        const freeSquareIdNum = parseInt(freeSquareIdNumStr, 10);

        // Check adjacency using the 1-indexed square numbers from POS_ADJACENCY
        if (POS_ADJACENCY[clickedSquareIdNum]?.includes(freeSquareIdNum)) {
            this.movePieceOnDOM(`#${clickedSquareElement.id}`, this.freeSquareId);
            this.currentMoves++;
            this.updateMovesCounter(this.currentMoves, 'Player');

            const currentBoardState = this.getBoardStateFromDOM();
            if (isBoardSolved(currentBoardState)) {
                this.displayMessage("Congratulations! You solved it!", "success");
                this.toggleControlButtons(true);
                this.toggleSquareInteraction(true);
                await this.triggerWinAnimation();
            }
        }
    }

    /**
     * Triggers the visual animation sequence for winning the game.
     * Adds a 'success' class to all piece divs and then fades out the game board
     * to display a congratulatory message with a "Play Again" button.
     */
    private async triggerWinAnimation(): Promise<void> {
        qsa<HTMLDivElement>('.square div').forEach(div => div.classList.add('success'));
        if (this.gameArea) {
            await fadeOut(this.gameArea, 500);
            // Security note: Using innerHTML with fixed strings is generally okay.
            // If 'msg' involved user input, it would need sanitization.
            const msg: string = '<h1>Parabéns!!!</h1><a href="index.html" class="btn">Jogar Novamente</a>';
            this.gameArea.innerHTML = msg;
            await fadeIn(this.gameArea, 500);
        }
    }

    /**
     * Reads the current visual state of the puzzle from the DOM and translates it
     * into a {@link BoardState} array.
     * @returns A `BoardState` array representing the puzzle, with `0` for the empty square.
     *          Entries can be `null` if a square's piece DOM is malformed.
     */
    private getBoardStateFromDOM(): BoardState {
        const boardState: BoardState = [];
        for (let i = 1; i <= NUM_SQUARES; i++) {
            const squareSelector = `#sq-${i}`;
            if (squareSelector === this.freeSquareId) {
                boardState.push(0); // 0 represents the empty square
            } else {
                const squareElement = qs<HTMLLIElement>(squareSelector);
                const pieceElement = squareElement?.firstElementChild as HTMLElement | undefined;
                if (pieceElement?.id) {
                    const pieceNumStr = pieceElement.id.split('-')[1]; // e.g., "pc-5" -> "5"
                    if (pieceNumStr) {
                        boardState.push(parseInt(pieceNumStr, 10));
                    } else {
                        // Piece ID format is unexpected (e.g., "pc-")
                        console.warn(`Malformed piece ID '${pieceElement.id}' in square ${squareSelector}.`);
                        boardState.push(null);
                    }
                } else {
                    // No piece element or piece ID found in a non-free square
                    console.warn(`No valid piece found in square ${squareSelector}.`);
                    boardState.push(null);
                }
            }
        }
        return boardState;
    }

    /**
     * Handles the click event for the "Mix" (Embaralhar) button.
     * Shuffles the puzzle by making a specified number of random valid moves.
     * Updates the UI to reflect the shuffled state and move count.
     */
    private handleMixClick(): void {
        let movesToMake = 1000; // Default number of shuffles
        if (this.movesInput?.value) { // Use optional chaining for safety
            const parsedVal = parseInt(this.movesInput.value, 10);
            if (!isNaN(parsedVal) && parsedVal > 0) {
                movesToMake = parsedVal;
            }
        }
        this.displayMessage(`Shuffling ${movesToMake} times...`, "info");
        this.toggleControlButtons(true);
        this.toggleSquareInteraction(true); // Disable clicks during shuffle

        let successfulMixMoves = 0;
        // Get the number part of the freeSquareId (e.g., '9' from '#sq-9')
        let currentFreeSquareNumForMix = parseInt(this.freeSquareId.substring(this.freeSquareId.lastIndexOf('-') + 1), 10);

        for (let i = 0; i < movesToMake; i++) {
            const possibleMovers = POS_ADJACENCY[currentFreeSquareNumForMix];
            if (!possibleMovers || possibleMovers.length === 0) {
                console.error(`No possible moves from free square ${currentFreeSquareNumForMix} during mix.`);
                continue;
            }

            const randomMoverIndex = Math.floor(Math.random() * possibleMovers.length);
            const moverSquareNum = possibleMovers[randomMoverIndex]!; // This is the square number of the tile to move

            this.movePieceOnDOM(`#sq-${moverSquareNum}`, `#sq-${currentFreeSquareNumForMix}`);
            currentFreeSquareNumForMix = moverSquareNum; // The square the tile moved FROM is now the new free square
            successfulMixMoves++;
        }
        this.updateMovesCounter(successfulMixMoves, 'Mix');
        this.displayMessage(`Shuffled ${successfulMixMoves} times. Good luck!`, "info");
        this.toggleControlButtons(false);
        this.toggleSquareInteraction(false); // Re-enable clicks after shuffle
        this.currentMoves = 0; // Reset player's move count
    }

    /**
     * Handles the click event for the "Solve with Bot" button.
     * Retrieves the current board state, initiates an A* search for a solution,
     * and if a solution is found, triggers the animation of the solution steps.
     * Updates the UI with messages regarding the solver's progress.
     */
    private handleSolveClick(): void {
        this.displayMessage("Solving, please wait...", "info");
        this.toggleControlButtons(true);
        this.toggleSquareInteraction(true);

        // Use setTimeout to allow the UI to update (e.g., show "Solving...") before the potentially blocking A* search.
        setTimeout(() => {
            const currentBoardState = this.getBoardStateFromDOM();

            if (currentBoardState.includes(null)) {
                this.displayMessage("Error: Invalid board state. Cannot solve.", "error");
                this.toggleControlButtons(false);
                this.toggleSquareInteraction(false);
                return;
            }

            this.solutionActions = performAStarSearch(currentBoardState, POS_ADJACENCY) || [];

            if (this.solutionActions.length > 0) {
                this.displayMessage(`Solution found! Animating ${this.solutionActions.length} moves...`, "info");
                this.animateSolution(); // Note: animateSolution is async, but we don't await it here.
                                     // It manages its own UI updates upon completion/error.
            } else {
                // A* returns empty array if already solved, null if no path.
                if (isBoardSolved(currentBoardState)) {
                    this.displayMessage("Board is already solved!", "success");
                } else {
                    this.displayMessage("No solution found for the current configuration.", "error");
                }
                this.toggleControlButtons(false);
                this.toggleSquareInteraction(false);
            }
        }, 50); // 50ms delay
    }

    /**
     * Animates the sequence of moves (solution path) found by the A* search algorithm.
     * Disables UI interactions during the animation and re-enables them upon completion or error.
     * Updates the move counter and displays messages reflecting the animation progress.
     */
    private async animateSolution(): Promise<void> {
        if (this.solutionActions.length === 0) {
            this.displayMessage("No solution to animate or already solved.", "info");
            this.toggleControlButtons(false);
            this.toggleSquareInteraction(false);
            return;
        }

        // Note: UI interactions (buttons, square clicks) should have been disabled by handleSolveClick already.
        // For safety, ensure they are, or re-disable if necessary.
        this.toggleSquareInteraction(true); // Explicitly ensure squares are not clickable

        let moveIndex = 0;
        const animationSpeed = 500; // Milliseconds per move

        // Define performNextMove as an arrow function to maintain 'this' context if it were not already.
        // It's async because it might await triggerWinAnimation.
        const performNextMove = async (): Promise<void> => {
            if (moveIndex >= this.solutionActions.length) {
                this.displayMessage("Animation complete!", "success");
                this.toggleControlButtons(false);
                this.toggleSquareInteraction(false);
                this.solutionActions = []; // Clear the stored actions

                const currentBoardState = this.getBoardStateFromDOM();
                if (isBoardSolved(currentBoardState)) { // Verify before triggering win animation
                   await this.triggerWinAnimation();
                }
                return;
            }

            const action = this.solutionActions[moveIndex];
            if (!action) { // Should not happen if solutionActions.length is checked
                console.error("Animation Error: Undefined action in solution path.");
                this.displayMessage("Animation error. Please reset.", "error");
                this.toggleControlButtons(false);
                this.toggleSquareInteraction(false);
                return;
            }

            const tileToMoveSquareId = `#sq-${getSquareNumberFromIndex(action.fromIndex)}`;
            const targetEmptySpotSquareId = `#sq-${getSquareNumberFromIndex(action.toIndex)}`;

            if (this.freeSquareId !== targetEmptySpotSquareId) {
                console.error(`Animation Error: Mismatch between UI's freeSquareId (${this.freeSquareId}) and action's target empty spot (${targetEmptySpotSquareId}). Action:`, JSON.stringify(action));
                this.displayMessage("Animation error. State mismatch. Please reset game.", "error");
                this.toggleControlButtons(false);
                this.toggleSquareInteraction(false);
                return;
            }

            this.movePieceOnDOM(tileToMoveSquareId, targetEmptySpotSquareId);
            this.updateMovesCounter(moveIndex + 1, 'Bot');

            moveIndex++;
            setTimeout(performNextMove, animationSpeed); // Schedule the next step
        };

        await performNextMove(); // Start the animation sequence
    }
}
