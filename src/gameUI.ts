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
    private readonly boundHandleSquareClick: (event: Event) => Promise<void>;

    // DOM Element references
    private readonly mixButton: HTMLButtonElement | null;
    private readonly solveButton: HTMLButtonElement | null;
    private readonly movesInput: HTMLInputElement | null;
    private readonly movesNumArea: HTMLParagraphElement | null;
    private readonly botMessageArea: HTMLParagraphElement | null;
    private readonly gameArea: HTMLDivElement | null;
    private readonly squares: NodeListOf<HTMLLIElement>;

    /** Duration for tile movement animations in milliseconds. */
    private readonly animationDuration: number = 300; // Should match CSS transition on .square

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

        if (!this.gameArea || this.squares.length !== NUM_SQUARES) {
            console.error("Critical game elements (.game area or .square) not found or incorrect count in the DOM.");
        }

        this.freeSquareId = this.findInitialFreeSquareIdSafe();
        this.boundHandleSquareClick = this.handleSquareClick.bind(this);
        this.init();
    }

    /**
     * Initializes event listeners for UI controls and sets up the initial game UI state.
     */
    private init(): void {
        this.bindSquareClicks();
        this.mixButton?.addEventListener("click", this.handleMixClick.bind(this));
        this.solveButton?.addEventListener("click", this.handleSolveClick.bind(this));
        this.updateMovesCounter(0, 'Player');
    }

    /**
     * Safely finds the initial free square ID from the DOM.
     */
    private findInitialFreeSquareIdSafe(): string {
        for (const square of Array.from(this.squares)) {
            if (square.classList.contains('free')) {
                return `#${square.id}`;
            }
        }
        const lastSquareSelector = `#sq-${NUM_SQUARES}`;
        const lastSquareElement = qs<HTMLLIElement>(lastSquareSelector);
        if (lastSquareElement) {
            console.warn(`No square initially had the 'free' class. Defaulting to ${lastSquareSelector} and adding 'free' class.`);
            lastSquareElement.classList.add('free');
            return lastSquareSelector;
        }
        console.error(`Cannot find the last square (#sq-${NUM_SQUARES}) to designate as free. Defaulting to #sq-9.`);
        qs<HTMLLIElement>("#sq-9")?.classList.add("free");
        return '#sq-9';
    }

    /**
     * Binds click event listeners to all puzzle squares.
     */
    private bindSquareClicks(): void {
        this.squares.forEach(square => {
            square.removeEventListener("click", this.boundHandleSquareClick);
            square.addEventListener("click", this.boundHandleSquareClick);
        });
    }

    /**
     * Enables or disables click interactions on all puzzle squares.
     */
    private toggleSquareInteraction(disabled: boolean): void {
        this.squares.forEach(square => {
            if (disabled) {
                square.removeEventListener("click", this.boundHandleSquareClick);
            } else {
                square.removeEventListener("click", this.boundHandleSquareClick);
                square.addEventListener("click", this.boundHandleSquareClick);
            }
        });
    }

    /**
     * Enables or disables the main control buttons.
     */
    private toggleControlButtons(disabled: boolean): void {
        if (this.mixButton) this.mixButton.disabled = disabled;
        if (this.solveButton) this.solveButton.disabled = disabled;
    }

    /**
     * Displays a message in the bot message area.
     */
    private displayMessage(text: string, _type: 'info' | 'error' | 'success' = 'info'): void {
        if (this.botMessageArea) this.botMessageArea.textContent = text;
        else console.warn("Bot message area not found. Message:", text);
    }

    /**
     * Updates the displayed move counter.
     */
    private updateMovesCounter(count: number | null, context: 'Player' | 'Bot' | 'Mix'): void {
        if (this.movesNumArea) {
            if (count === null) this.movesNumArea.textContent = "";
            else this.movesNumArea.textContent = `# of moves: ${count} (${context})`;
        }
        if (context !== 'Bot') this.currentMoves = count ?? 0;
    }

    /**
     * Animates the visual movement of a piece on the DOM and updates the logical game state.
     * The piece in `pieceSquareIdToMove` slides into the `targetFreeSquareId`.
     * @returns A Promise that resolves when the animation and DOM updates are complete.
     */
    private movePieceOnDOM(pieceSquareIdToMove: string, targetFreeSquareId: string): Promise<void> {
        const movingSquareEl = qs<HTMLLIElement>(pieceSquareIdToMove);
        const targetSquareEl = qs<HTMLLIElement>(targetFreeSquareId);

        if (!movingSquareEl || !targetSquareEl) {
            console.error('Cannot find squares for animation', { pieceSquareIdToMove, targetFreeSquareId });
            return Promise.resolve(); // Resolve immediately if elements aren't found
        }
        const movingPieceContentEl = movingSquareEl.firstElementChild as HTMLElement | null;
        if (!movingPieceContentEl) {
            console.error('Moving square has no piece content', { pieceSquareIdToMove });
            return Promise.resolve();
        }

        return new Promise(resolve => {
            const movingRect = movingSquareEl.getBoundingClientRect();
            const targetRect = targetSquareEl.getBoundingClientRect();
            const dx = targetRect.left - movingRect.left;
            const dy = targetRect.top - movingRect.top;

            // 1. Prepare the moving square for animation
            movingSquareEl.style.zIndex = '100'; // Lift above others
            // CSS transition for transform is already defined on .square

            // 2. Apply the transform to make it slide and lift
            movingSquareEl.style.transform = `translateX(${dx}px) translateY(${dy}px) translateZ(25px)`;

            // 3. Listen for the end of the transition
            const onTransitionEnd = (event: TransitionEvent) => {
                // Ensure we're reacting to the transform transition specifically, if other transitions exist
                if (event.propertyName !== 'transform') return;

                movingSquareEl.removeEventListener('transitionend', onTransitionEnd);

                // 4. Reset visual state of the (now logically empty) movingSquareEl
                movingSquareEl.style.transition = 'none'; // Disable transitions for immediate reset
                movingSquareEl.style.transform = 'translateZ(5px)'; // Its resting Z position
                movingSquareEl.style.zIndex = '';       // Reset z-index
                void movingSquareEl.offsetHeight;      // Force reflow

                // 5. Perform the DOM content swap and class update
                targetSquareEl.appendChild(movingPieceContentEl); // Move the piece div
                movingSquareEl.classList.add('free');
                targetSquareEl.classList.remove('free');

                // 6. Update internal state
                this.freeSquareId = `#${movingSquareEl.id}`;

                // 7. Re-enable CSS transitions for future interactions (hover, etc.)
                // The timeout ensures this happens after the "snap back" from 'none'
                setTimeout(() => {
                    movingSquareEl.style.transition = ''; // Let CSS class handle it
                }, 0);

                resolve(); // Animation and DOM update complete
            };
            movingSquareEl.addEventListener('transitionend', onTransitionEnd);
        });
    }

    /**
     * Handles click events on puzzle squares.
     */
    private async handleSquareClick(event: Event): Promise<void> {
        const clickedSquareElement = event.currentTarget as HTMLLIElement | null;
        if (!clickedSquareElement?.id) return;

        const clickedSquareIdNumStr = clickedSquareElement.id.split('-')[1];
        // Use current this.freeSquareId which is like "#sq-X"
        const freeSquareIdNumStr = this.freeSquareId.startsWith('#sq-') ? this.freeSquareId.substring(4) : null;

        if (!clickedSquareIdNumStr || !freeSquareIdNumStr) {
            console.error("Could not parse square IDs for move logic.", { clicked: clickedSquareIdNumStr, free: freeSquareIdNumStr });
            return;
        }
        const clickedSquareIdNum = parseInt(clickedSquareIdNumStr, 10);
        const freeSquareIdNum = parseInt(freeSquareIdNumStr, 10);

        if (POS_ADJACENCY[clickedSquareIdNum]?.includes(freeSquareIdNum)) {
            this.toggleSquareInteraction(true); // Disable clicks during animation
            this.toggleControlButtons(true);    // Disable buttons too

            await this.movePieceOnDOM(`#${clickedSquareElement.id}`, this.freeSquareId);

            this.currentMoves++;
            this.updateMovesCounter(this.currentMoves, 'Player');

            const currentBoardState = this.getBoardStateFromDOM();
            if (isBoardSolved(currentBoardState)) {
                this.displayMessage("Congratulations! You solved it!", "success");
                // Buttons remain disabled, square interaction remains disabled by win
                await this.triggerWinAnimation();
            } else {
                this.toggleSquareInteraction(false); // Re-enable clicks if not solved
                this.toggleControlButtons(false);   // Re-enable buttons
            }
        }
    }

    /**
     * Triggers the visual animation for winning the game.
     */
    private async triggerWinAnimation(): Promise<void> {
        // Ensure only non-empty squares get the success class on their piece div
        qsa<HTMLLIElement>('.square:not(.free) div').forEach(div => div.classList.add('success'));
        if (this.gameArea) {
            await fadeOut(this.gameArea, 500);
            const msg: string = '<h1>Parabéns!!!</h1><a href="index.html" class="btn">Jogar Novamente</a>';
            this.gameArea.innerHTML = msg;
            await fadeIn(this.gameArea, 500);
        }
    }

    /**
     * Reads the current visual state of the puzzle from the DOM.
     */
    private getBoardStateFromDOM(): BoardState {
        const boardState: BoardState = [];
        for (let i = 1; i <= NUM_SQUARES; i++) {
            const squareSelector = `#sq-${i}`;
            if (squareSelector === this.freeSquareId) {
                boardState.push(0);
            } else {
                const squareElement = qs<HTMLLIElement>(squareSelector);
                const pieceElement = squareElement?.firstElementChild as HTMLElement | undefined;
                if (pieceElement?.id) {
                    const pieceNumStr = pieceElement.id.split('-')[1];
                    if (pieceNumStr) boardState.push(parseInt(pieceNumStr, 10));
                    else {
                        console.warn(`Malformed piece ID '${pieceElement.id}' in square ${squareSelector}.`);
                        boardState.push(null);
                    }
                } else {
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
     * Uses a simplified, non-animated DOM update for speed.
     */
    private handleMixClick(): void {
        let movesToMake = 1000;
        if (this.movesInput?.value) {
            const parsedVal = parseInt(this.movesInput.value, 10);
            if (!isNaN(parsedVal) && parsedVal > 0) movesToMake = parsedVal;
        }
        this.displayMessage(`Shuffling ${movesToMake} times...`, "info");
        this.toggleControlButtons(true);
        this.toggleSquareInteraction(true);

        let successfulMixMoves = 0;
        let currentFreeSquareNumForMix = parseInt(this.freeSquareId.substring(this.freeSquareId.lastIndexOf('-') + 1), 10);

        for (let i = 0; i < movesToMake; i++) {
            const possibleMovers = POS_ADJACENCY[currentFreeSquareNumForMix];
            if (!possibleMovers || possibleMovers.length === 0) continue;
            const randomMoverIndex = Math.floor(Math.random() * possibleMovers.length);
            const moverSquareNum = possibleMovers[randomMoverIndex]!;

            const pieceToMoveEl = qs<HTMLLIElement>(`#sq-${moverSquareNum}`);
            const targetFreeEl = qs<HTMLLIElement>(`#sq-${currentFreeSquareNumForMix}`);
            if(pieceToMoveEl && targetFreeEl) {
                const pieceContent = pieceToMoveEl.firstElementChild;
                if (pieceContent) targetFreeEl.appendChild(pieceContent);
                targetFreeEl.classList.remove('free');
                pieceToMoveEl.classList.add('free');
                // Update this.freeSquareId using the ID of the element that became free
                this.freeSquareId = `#${pieceToMoveEl.id}`;
                currentFreeSquareNumForMix = parseInt(pieceToMoveEl.id.substring(pieceToMoveEl.id.lastIndexOf('-') + 1), 10);
                successfulMixMoves++;
            }
        }
        this.updateMovesCounter(successfulMixMoves, 'Mix');
        this.displayMessage(`Shuffled ${successfulMixMoves} times. Good luck!`, "info");
        this.toggleControlButtons(false);
        this.toggleSquareInteraction(false);
        this.currentMoves = 0;
    }

    /**
     * Handles the click event for the "Solve with Bot" button.
     */
    private handleSolveClick(): void {
        this.displayMessage("Solving, please wait...", "info");
        this.toggleControlButtons(true);
        this.toggleSquareInteraction(true);

        setTimeout(() => {
            const currentBoardState = this.getBoardStateFromDOM();
            if (currentBoardState.includes(null)) {
                this.displayMessage("Error: Invalid board state. Cannot solve.", "error");
                this.toggleControlButtons(false); this.toggleSquareInteraction(false); return;
            }
            this.solutionActions = performAStarSearch(currentBoardState, POS_ADJACENCY) || [];
            if (this.solutionActions.length > 0) {
                this.displayMessage(`Solution found! Animating ${this.solutionActions.length} moves...`, "info");
                this.animateSolution();
            } else {
                if (isBoardSolved(currentBoardState)) this.displayMessage("Board is already solved!", "success");
                else this.displayMessage("No solution found.", "error");
                this.toggleControlButtons(false); this.toggleSquareInteraction(false);
            }
        }, 50);
    }

    /**
     * Animates the sequence of moves found by the A* search algorithm.
     */
    private async animateSolution(): Promise<void> {
        if (this.solutionActions.length === 0) {
            this.displayMessage("No solution to animate or already solved.", "info");
            this.toggleControlButtons(false); this.toggleSquareInteraction(false); return;
        }
        this.toggleSquareInteraction(true);

        let moveIndex = 0;
        const performNextMove = async (): Promise<void> => {
            if (moveIndex >= this.solutionActions.length) {
                this.displayMessage("Animation complete!", "success");
                this.toggleControlButtons(false); this.toggleSquareInteraction(false);
                this.solutionActions = [];
                if (isBoardSolved(this.getBoardStateFromDOM())) await this.triggerWinAnimation();
                return;
            }
            const action = this.solutionActions[moveIndex];
            if (!action) {
                console.error("Animation Error: Undefined action."); this.displayMessage("Animation error.", "error");
                this.toggleControlButtons(false); this.toggleSquareInteraction(false); return;
            }
            const tileSquareIdToMove = `#sq-${getSquareNumberFromIndex(action.fromIndex)}`;
            const targetEmptySquareId = `#sq-${getSquareNumberFromIndex(action.toIndex)}`;

            if (this.freeSquareId !== targetEmptySquareId) {
                console.error(`Animation Error: Mismatch. UI free: ${this.freeSquareId}, Action target: ${targetEmptySpotSquareId}`, action);
                this.displayMessage("Animation state error.", "error");
                this.toggleControlButtons(false); this.toggleSquareInteraction(false); return;
            }

            await this.movePieceOnDOM(tileSquareIdToMove, targetEmptySquareId);
            this.updateMovesCounter(moveIndex + 1, 'Bot');
            moveIndex++;
            // Schedule next move after current one visually completes + small buffer
            setTimeout(performNextMove, this.animationDuration + 50);
        };
        await performNextMove(); // Start the first move
    }
}
