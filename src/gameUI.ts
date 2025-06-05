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
    /** Stores the ID of the square being dragged. */
    private draggedSquareId: string | null = null;

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
        this.boundHandleSquareClick = this.handleSquareClick.bind(this); // For click
        this.init();
    }

    private init(): void {
        this.bindSquareClicks(); // For click interactions
        this.bindDragDropEvents(); // For D&D interactions
        this.updateDraggableStatus(); // Set initial draggable states

        this.mixButton?.addEventListener("click", this.handleMixClick.bind(this));
        this.solveButton?.addEventListener("click", this.handleSolveClick.bind(this));
        this.updateMovesCounter(0, 'Player');
    }

    private findInitialFreeSquareIdSafe(): string {
        for (const square of Array.from(this.squares)) {
            if (square.classList.contains('free')) return `#${square.id}`;
        }
        const lastSquareSelector = `#sq-${NUM_SQUARES}`;
        const lastSquareElement = qs<HTMLLIElement>(lastSquareSelector);
        if (lastSquareElement) {
            console.warn(`No square initially had 'free' class. Defaulting to ${lastSquareSelector}.`);
            lastSquareElement.classList.add('free');
            return lastSquareSelector;
        }
        console.error(`Cannot find last square (#sq-${NUM_SQUARES}). Defaulting to #sq-9.`);
        qs<HTMLLIElement>("#sq-9")?.classList.add("free");
        return '#sq-9';
    }

    private bindSquareClicks(): void {
        this.squares.forEach(square => {
            square.removeEventListener("click", this.boundHandleSquareClick);
            square.addEventListener("click", this.boundHandleSquareClick);
        });
    }

    private bindDragDropEvents(): void {
        this.squares.forEach(square => {
            // Events for the square (drop target)
            square.addEventListener('dragover', this.handleDragOver.bind(this));
            square.addEventListener('drop', this.handleDrop.bind(this));
            // Could add dragenter/dragleave for visual feedback on drop target

            // Event for the piece content (draggable item)
            const pieceContent = square.firstElementChild as HTMLElement | null;
            if (pieceContent && !square.classList.contains('free')) {
                pieceContent.addEventListener('dragstart', this.handleDragStart.bind(this));
            }
        });
    }

    private setDraggable(squareElement: HTMLLIElement, isDraggable: boolean): void {
        const pieceContent = squareElement.firstElementChild as HTMLElement | null;
        if (pieceContent) {
            pieceContent.draggable = isDraggable;
            // Optionally, add/remove a class to indicate draggable state visually
            // if (isDraggable) pieceContent.classList.add('draggable-piece');
            // else pieceContent.classList.remove('draggable-piece');
        }
    }

    private updateDraggableStatus(): void {
        this.squares.forEach(square => {
            const isFree = square.classList.contains('free');
            this.setDraggable(square, !isFree);
        });
    }

    private toggleSquareInteraction(disabled: boolean): void {
        this.squares.forEach(square => {
            if (disabled) {
                square.removeEventListener("click", this.boundHandleSquareClick);
                this.setDraggable(square, false); // No dragging when interaction is disabled
            } else {
                // Re-bind click
                square.removeEventListener("click", this.boundHandleSquareClick);
                square.addEventListener("click", this.boundHandleSquareClick);
                // Update draggable status based on whether it's free or not
                this.setDraggable(square, !square.classList.contains('free'));
            }
        });
        if (disabled) { // If disabling all interactions, ensure no piece is draggable
            this.squares.forEach(sq => this.setDraggable(sq, false));
        } else { // If enabling, call updateDraggableStatus to set correctly
            this.updateDraggableStatus();
        }
    }

    private handleDragStart(event: DragEvent): void {
        const pieceContent = event.target as HTMLElement;
        const squareElement = pieceContent.parentElement as HTMLLIElement | null;

        if (squareElement && !squareElement.classList.contains('free')) {
            this.draggedSquareId = squareElement.id;
            event.dataTransfer?.setData('text/plain', squareElement.id);
            if(event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
            // Optional: Add a class for visual feedback during drag
            // pieceContent.classList.add('dragging');
        } else {
            event.preventDefault(); // Prevent dragging if not a valid piece
        }
    }

    private handleDragOver(event: DragEvent): void {
        event.preventDefault(); // Necessary to allow drop
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
        // Optional: Add class to potential drop target for visual feedback
        // const targetSquare = event.currentTarget as HTMLLIElement;
        // if (targetSquare.classList.contains('free')) {
        //     targetSquare.classList.add('drag-over-target');
        // }
    }

    private async handleDrop(event: DragEvent): Promise<void> {
        event.preventDefault();
        const targetSquareElement = event.currentTarget as HTMLLIElement;
        // Optional: Remove drag-over visual feedback class
        // targetSquareElement.classList.remove('drag-over-target');

        const sourceSquareDomId = event.dataTransfer?.getData('text/plain');

        if (!sourceSquareDomId || !this.draggedSquareId || sourceSquareDomId !== this.draggedSquareId) {
            console.warn("Drop event with invalid or mismatched draggedSquareId.", { sourceSquareDomId, dragged: this.draggedSquareId});
            this.draggedSquareId = null;
            return;
        }

        // Ensure the drop target is the currently free square
        if (!targetSquareElement.classList.contains('free') || `#${targetSquareElement.id}` !== this.freeSquareId) {
            this.draggedSquareId = null;
            return; // Not a valid drop (not the free square)
        }

        const draggedFromSquareId = this.draggedSquareId; // Store before resetting
        this.draggedSquareId = null; // Reset for next drag operation

        // Validate if the dragged piece can move to the target (free) square
        const sourceSqNum = parseInt(draggedFromSquareId.split('-')[1]!, 10);
        const targetSqNum = parseInt(targetSquareElement.id.split('-')[1]!, 10);

        if (POS_ADJACENCY[sourceSqNum]?.includes(targetSqNum)) {
            // Valid move, call the core move logic
            await this.handleMoveLogic(draggedFromSquareId, `#${targetSquareElement.id}`);
        } else {
            console.warn("Invalid drop: piece cannot move to target square.");
            // Optional: Visual feedback for invalid drop
        }
    }

    /** Core logic for handling a move, used by both click and D&D */
    private async handleMoveLogic(sourceSquareDomId: string, targetSquareDomId: string): Promise<void> {
        this.toggleSquareInteraction(true);
        this.toggleControlButtons(true);

        await this.movePieceOnDOM(sourceSquareDomId, targetSquareDomId);

        this.currentMoves++;
        this.updateMovesCounter(this.currentMoves, 'Player');
        this.updateDraggableStatus(); // Update draggable states after move

        const currentBoardState = this.getBoardStateFromDOM();
        if (isBoardSolved(currentBoardState)) {
            this.displayMessage("Congratulations! You solved it!", "success");
            // Buttons and square interaction remain disabled by win
            await this.triggerWinAnimation(); // toggleSquareInteraction(true) is called in here
        } else {
            this.toggleSquareInteraction(false); // Re-enable if not solved
            this.toggleControlButtons(false);
        }
    }

    private toggleControlButtons(disabled: boolean): void {
        if (this.mixButton) this.mixButton.disabled = disabled;
        if (this.solveButton) this.solveButton.disabled = disabled;
    }

    private displayMessage(text: string, _type: 'info' | 'error' | 'success' = 'info'): void {
        if (this.botMessageArea) this.botMessageArea.textContent = text;
        else console.warn("Bot message area not found. Message:", text);
    }

    private updateMovesCounter(count: number | null, context: 'Player' | 'Bot' | 'Mix'): void {
        if (this.movesNumArea) {
            if (count === null) this.movesNumArea.textContent = "";
            else this.movesNumArea.textContent = `# of moves: ${count} (${context})`;
        }
        if (context !== 'Bot') this.currentMoves = count ?? 0;
    }

    private movePieceOnDOM(pieceSquareIdToMove: string, targetFreeSquareId: string): Promise<void> {
        const movingSquareEl = qs<HTMLLIElement>(pieceSquareIdToMove);
        const targetSquareEl = qs<HTMLLIElement>(targetFreeSquareId);

        if (!movingSquareEl || !targetSquareEl) {
            console.error('Cannot find squares for animation', { pieceSquareIdToMove, targetFreeSquareId });
            return Promise.resolve();
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

            movingSquareEl.style.zIndex = '100';
            movingSquareEl.style.transform = `translateX(${dx}px) translateY(${dy}px) translateZ(25px)`;

            const onTransitionEnd = (event: TransitionEvent) => {
                if (event.propertyName !== 'transform' || event.target !== movingSquareEl) return;
                movingSquareEl.removeEventListener('transitionend', onTransitionEnd);
                movingSquareEl.style.transition = 'none';
                movingSquareEl.style.transform = 'translateZ(5px)';
                movingSquareEl.style.zIndex = '';
                void movingSquareEl.offsetHeight;

                targetSquareEl.appendChild(movingPieceContentEl);
                movingSquareEl.classList.add('free');
                targetSquareEl.classList.remove('free');
                this.freeSquareId = `#${movingSquareEl.id}`;

                setTimeout(() => { movingSquareEl.style.transition = ''; }, 0);
                resolve();
            };
            movingSquareEl.addEventListener('transitionend', onTransitionEnd);
        });
    }

    private async handleSquareClick(event: Event): Promise<void> {
        const clickedSquareElement = event.currentTarget as HTMLLIElement | null;
        if (!clickedSquareElement?.id || clickedSquareElement.classList.contains('free')) return; // Can't click free space

        const clickedSquareIdNumStr = clickedSquareElement.id.split('-')[1];
        const freeSquareIdNumStr = this.freeSquareId.startsWith('#sq-') ? this.freeSquareId.substring(4) : null;
        if (!clickedSquareIdNumStr || !freeSquareIdNumStr) return;

        const clickedSquareIdNum = parseInt(clickedSquareIdNumStr, 10);
        const freeSquareIdNum = parseInt(freeSquareIdNumStr, 10);

        if (POS_ADJACENCY[clickedSquareIdNum]?.includes(freeSquareIdNum)) {
            await this.handleMoveLogic(`#${clickedSquareElement.id}`, this.freeSquareId);
        }
    }

    private async triggerWinAnimation(): Promise<void> {
        this.squares.forEach(squareLi => {
            if (!squareLi.classList.contains('free')) {
                const pieceDiv = squareLi.firstElementChild as HTMLElement | null;
                if (pieceDiv) pieceDiv.classList.add('success');
            }
        });
        if (this.botMessageArea) {
            this.botMessageArea.innerHTML = '<h1>Parabéns!!!</h1><button id="play_again" class="btn">Jogar Novamente</button>';
            this.botMessageArea.classList.add('win-display');
            this.botMessageArea.style.display = 'block';
            qs<HTMLButtonElement>('#play_again', this.botMessageArea)?.addEventListener('click', () => window.location.reload());
        }
        this.toggleSquareInteraction(true);
        this.toggleControlButtons(true);
    }

    private getBoardStateFromDOM(): BoardState {
        const boardState: BoardState = [];
        for (let i = 1; i <= NUM_SQUARES; i++) {
            const squareSelector = `#sq-${i}`;
            if (squareSelector === this.freeSquareId) {
                boardState.push(0);
            } else {
                const pieceElement = qs<HTMLLIElement>(squareSelector)?.firstElementChild as HTMLElement | undefined;
                if (pieceElement?.id) {
                    const pieceNumStr = pieceElement.id.split('-')[1];
                    if (pieceNumStr) boardState.push(parseInt(pieceNumStr, 10));
                    else { console.warn(`Malformed piece ID '${pieceElement.id}'`); boardState.push(null); }
                } else { console.warn(`No valid piece in ${squareSelector}.`); boardState.push(null); }
            }
        }
        return boardState;
    }

    private handleMixClick(): void { // Shuffle logic should not use animations for speed
        let movesToMake = 1000;
        if (this.movesInput?.value) {
            const parsedVal = parseInt(this.movesInput.value, 10);
            if (!isNaN(parsedVal) && parsedVal > 0) movesToMake = parsedVal;
        }
        this.displayMessage(`Shuffling ${movesToMake} times...`, "info");
        this.toggleControlButtons(true); this.toggleSquareInteraction(true);

        let successfulMixMoves = 0;
        let currentFreeSqNum = parseInt(this.freeSquareId.substring(4), 10);

        for (let i = 0; i < movesToMake; i++) {
            const possibleMovers = POS_ADJACENCY[currentFreeSqNum];
            if (!possibleMovers || possibleMovers.length === 0) continue;
            const moverSqNum = possibleMovers[Math.floor(Math.random() * possibleMovers.length)]!;

            const pieceToMoveEl = qs<HTMLLIElement>(`#sq-${moverSqNum}`);
            const targetFreeEl = qs<HTMLLIElement>(`#sq-${currentFreeSqNum}`);
            if(pieceToMoveEl && targetFreeEl) {
                const pieceContent = pieceToMoveEl.firstElementChild;
                if (pieceContent) targetFreeEl.appendChild(pieceContent);
                targetFreeEl.classList.remove('free');
                pieceToMoveEl.classList.add('free');
                this.freeSquareId = `#${pieceToMoveEl.id}`;
                currentFreeSqNum = parseInt(this.freeSquareId.substring(4), 10);
                successfulMixMoves++;
            }
        }
        this.updateMovesCounter(successfulMixMoves, 'Mix');
        this.displayMessage(`Shuffled ${successfulMixMoves} times. Good luck!`, "info");
        this.toggleControlButtons(false); this.toggleSquareInteraction(false); // This calls updateDraggableStatus
        this.currentMoves = 0;
    }

    private handleSolveClick(): void {
        this.displayMessage("Solving, please wait...", "info");
        this.toggleControlButtons(true); this.toggleSquareInteraction(true);

        setTimeout(() => {
            const currentBoardState = this.getBoardStateFromDOM();
            if (currentBoardState.includes(null)) {
                this.displayMessage("Error: Invalid board state.", "error");
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
                this.solutionActions = []; // Clear actions
                // Check win and re-enable controls after win animation if any, or directly
                if (isBoardSolved(this.getBoardStateFromDOM())) {
                    await this.triggerWinAnimation(); // triggerWinAnimation itself disables controls
                } else { // Should be solved if animation completed, but as a fallback
                    this.toggleControlButtons(false); this.toggleSquareInteraction(false);
                }
                return;
            }
            const action = this.solutionActions[moveIndex];
            if (!action) {
                console.error("Animation Error: Undefined action."); this.displayMessage("Animation error.", "error");
                this.toggleControlButtons(false); this.toggleSquareInteraction(false); return;
            }
            const pieceSquareIdToMove = `#sq-${getSquareNumberFromIndex(action.fromIndex)}`;
            const targetEmptySquareId = `#sq-${getSquareNumberFromIndex(action.toIndex)}`;

            if (this.freeSquareId !== targetEmptySquareId) {
                console.error(`Animation Error: Mismatch. UI free: ${this.freeSquareId}, Action target: ${targetEmptySquareId}`, action);
                this.displayMessage("Animation state error.", "error");
                this.toggleControlButtons(false); this.toggleSquareInteraction(false); return;
            }

            await this.movePieceOnDOM(pieceSquareIdToMove, targetEmptySquareId);
            this.updateMovesCounter(moveIndex + 1, 'Bot');
            this.updateDraggableStatus(); // Update draggable after bot move
            moveIndex++;
            setTimeout(performNextMove, this.animationDuration + 100); // Ensure prev anim completes + buffer
        };
        await performNextMove();
    }
}
