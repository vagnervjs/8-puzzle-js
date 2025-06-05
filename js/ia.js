/* ======================
Jogo dos Quadrados
Inteligência Artificial
FCT - Unesp
Author: Vagner Santana
RA: 1288549
v0.1
File: ia.js
=========================*/

const Game = {
  pos: {
    1: [2, 4],
    2: [1, 3, 5],
    3: [2, 6],
    4: [1, 7, 5],
    5: [2, 4, 6, 8],
    6: [3, 5, 9],
    7: [4, 8],
    8: [7, 5, 9],
    9: [8, 6]
  },
  NUM_SQUARES: 9,
  NUM_PIECES: 8,
  freeSquareId: '#sq-9', // Assuming 9th square is initially free
  GOAL_STATE: [1, 2, 3, 4, 5, 6, 7, 8, 0], // 0 represents the empty square
  currentSolutionActions: [], // Stores actions from A* solution

  init: function() {
    this.currentSolutionActions = []; // Initialize solution actions
    this.boundHandleSquareClick = this.handleSquareClick.bind(this); // Store bound handler
    this.bindSquareClicks(); // Initial binding
    $("#mix").on("click", this.handleMixClick.bind(this));
    $("#solve").on("click", this.solveWithBot.bind(this));
    // Ensure the initial free square is correctly identified if it's not always #sq-9
    // This could involve checking the HTML on load if necessary.
  },

  handleSquareClick: function(event) {
    const elem = $(event.currentTarget);
    let current_elem_id_parts = elem.attr('id').split("-");
    let current_elem_num = parseInt(current_elem_id_parts[1], 10);
    const current_elem_id = '#sq-' + current_elem_num;

    // Check if the clicked square is a neighbor of the current free square
    const freeSquareNum = parseInt(this.freeSquareId.split('-')[1], 10);
    if (this.pos[current_elem_num].includes(freeSquareNum)) {
        this.move(current_elem_id, this.freeSquareId); // Move current element to the free square
        if (this.isOk()) {
            $('.square div').addClass('success');
            setTimeout(function() {
                $('.game').fadeOut('slow');
            }, 500);

            setTimeout(function() {
                const msg = '<h1>Parabéns!!!</h1><a href="index.html" class="btn">Jogar Novamente</a>';
                $('.game').html(msg);
                $('.game').fadeIn('slow');
            }, 1000);
        }
    }
  },

  handleMixClick: function() {
    let movesToMix = parseInt($("#moves").val(), 10);
    if (isNaN(movesToMix) || movesToMix <= 0) { // Ensure moves is a positive number
      movesToMix = 1000; // Default moves if input is invalid
    }
    this.mix(movesToMix);
  },

  // getFreeNeighbor is kept for mix's strategy, but mix is improved.
  // This function as originally designed finds an empty square adjacent to a given squareNum.
  // The new mix strategy doesn't strictly need it if it always knows the free square.
  getFreeNeighbor: function(squareNum) {
    const neighbors = this.pos[squareNum];
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor_num = neighbors[i];
      const neighbor_id = '#sq-' + neighbor_num;
      if ($(neighbor_id).hasClass('free')) {
        return neighbor_id;
      }
    }
    return null;
  },

  move: function(pieceToMoveId, targetFreeSquareId) {
    const pieceContent = $(pieceToMoveId).children();
    $(targetFreeSquareId).html(pieceContent).removeClass('free');
    $(pieceToMoveId).empty().addClass('free'); // Piece's original square is now free
    this.freeSquareId = pieceToMoveId; // Update the tracked free square ID
  },

  mix: function(moves) {
    let m = 0;
    // Start with the current free square's numerical ID.
    let currentFreeSquareNum = parseInt(this.freeSquareId.split('-')[1], 10);

    for (let i = 0; i < moves; i++) {
      // Get the list of squares that are neighbors of the current free square.
      // These are the pieces that can move into the free square.
      const possibleMovers = this.pos[currentFreeSquareNum];

      // Select one of these neighbors randomly.
      const randomMoverIndex = Math.floor(Math.random() * possibleMovers.length);
      const moverNum = possibleMovers[randomMoverIndex];
      const moverId = '#sq-' + moverNum;

      // Perform the move: the selected mover moves into the currentFreeSquare.
      // The moverId (where the piece was) becomes the new free square.
      this.move(moverId, '#sq-' + currentFreeSquareNum);

      // Update currentFreeSquareNum for the next iteration.
      currentFreeSquareNum = moverNum;
      m++;
    }
    $("#moves_num").html('# of moves: ' + m); // Update moves count after the loop.
  },

  // Helper to get a random square number (1 to NUM_SQUARES)
  // Not directly used by the current mix logic, but could be useful.
  getRandomSquareNum: function() {
    return Math.floor(Math.random() * this.NUM_SQUARES) + 1;
  },

  isOk: function() {
    let correctPiecesCount = 0;
    // Iterate from 1 to NUM_SQUARES (e.g., 1 to 9)
    for (let i = 1; i <= this.NUM_SQUARES; i++) {
      const squareId = '#sq-' + i;
      const children = $(squareId).children(); // Get the piece (if any) in the square

      if (children.length > 0) { // If there is a piece in this square
        const children_id_attr = children.attr('id');
        if (children_id_attr) {
          // Extract the number from the piece's ID (e.g., "pc-X" -> X)
          const piece_num = parseInt(children_id_attr.split("-")[1], 10);
          // Check if the piece number matches the square number
          if (piece_num === i) {
            correctPiecesCount++;
          }
        }
      }
    }

    // Win condition: NUM_PIECES are in their correct final positions.
    // The 9th square (if it's the empty one) being empty is implicit
    // if all NUM_PIECES are correctly placed.
    if (correctPiecesCount === this.NUM_PIECES) {
      return true;
    }
    return false;
  },

  getBoardState: function() {
    const boardState = [];
    for (let i = 1; i <= this.NUM_SQUARES; i++) {
      const squareId = '#sq-' + i;
      if (squareId === this.freeSquareId) {
        boardState.push(0); // Represent empty square with 0
      } else {
        const piece = $(squareId).children().first(); // Get the first child, which should be the piece div
        if (piece.length > 0 && piece.attr('id')) {
          const pieceNum = parseInt(piece.attr('id').split('-')[1], 10);
          boardState.push(pieceNum);
        } else {
          // This case should ideally not happen in a valid game state if not the free square
          // but as a fallback, push a value indicating an error or unexpected state,
          // or handle appropriately. For now, pushing -1 (or null) if unexpected.
          boardState.push(null); // Or handle error appropriately
        }
      }
    }
    return boardState;
  },

  getManhattanDistance: function(boardState) {
    let totalDistance = 0;
    const dimension = Math.sqrt(this.NUM_SQUARES);

    for (let i = 0; i < boardState.length; i++) {
      const tileValue = boardState[i];

      if (tileValue !== 0 && tileValue !== null) { // 0 is the empty space
        // Current position
        const currentRow = Math.floor(i / dimension);
        const currentCol = i % dimension;

        // Target position
        // The GOAL_STATE stores values 1-8 and 0 for empty.
        // The tileValue directly corresponds to what we search in GOAL_STATE.
        const targetIndex = this.GOAL_STATE.indexOf(tileValue);
        const targetRow = Math.floor(targetIndex / dimension);
        const targetCol = targetIndex % dimension;

        totalDistance += Math.abs(currentRow - targetRow) + Math.abs(currentCol - targetCol);
      }
    }
    return totalDistance;
  },

  // --- A* Search Implementation ---

  // Helper function to create SearchNode objects
  _createSearchNode: function(state, parent, action, g, h) {
    return {
      state: state,       // 1D array board state
      parent: parent,     // Parent SearchNode
      action: action,     // Action taken: { tileValue, fromIndex, toIndex }
      g: g,               // Cost from start (depth)
      h: h,               // Heuristic (Manhattan distance)
      f: g + h            // Total cost
    };
  },

  areArraysEqual: function(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    return true;
  },

  reconstructPath: function(node) {
    const path = [];
    let currentNode = node;
    while (currentNode.parent) {
      path.unshift(currentNode.action); // Add action to the beginning of the path
      currentNode = currentNode.parent;
    }
    return path; // Path of actions from start to goal
  },

  aStarSearch: function() {
    const initialState = this.getBoardState();
    if (this.areArraysEqual(initialState, this.GOAL_STATE)) {
        $("#bot_message").text("Board is already solved!");
        return []; // Already solved
    }

    const startNode = this._createSearchNode(initialState, null, null, 0, this.getManhattanDistance(initialState));
    const openSet = [startNode]; // Priority queue (min-heap by 'f' score)
    const closedSet = new Set(); // Stores stringified states

    closedSet.add(initialState.toString());

    while (openSet.length > 0) {
      // Sort by f-score to simulate priority queue (inefficient for large sets, but simple)
      openSet.sort((a, b) => a.f - b.f);
      const currentNode = openSet.shift();

      // Goal check
      if (this.areArraysEqual(currentNode.state, this.GOAL_STATE)) {
        return this.reconstructPath(currentNode);
      }

      // Find empty square (0)
      const emptyIdx = currentNode.state.indexOf(0);
      if (emptyIdx === -1) {
        console.error("Error: No empty square found in current state during A* search.");
        return null; // Should not happen
      }

      // The "number" of the square where the empty slot is (1-indexed for this.pos)
      const emptySquareNumber = emptyIdx + 1;

      // Get possible pieces that can move into the empty slot
      // These are identified by their square numbers (1-indexed)
      const movablePieceSquareNumbers = this.pos[emptySquareNumber];

      for (const movablePieceSquareNum of movablePieceSquareNumbers) {
        const neighborState = [...currentNode.state]; // Create a new state array

        // Index of the piece that will move (0-indexed)
        const pieceToMoveIdx = movablePieceSquareNum - 1;
        const tileValueMoved = neighborState[pieceToMoveIdx];

        // Perform the swap: move piece into empty slot, old piece slot becomes empty
        neighborState[emptyIdx] = tileValueMoved;
        neighborState[pieceToMoveIdx] = 0; // New empty slot

        const neighborStateStr = neighborState.toString();
        if (closedSet.has(neighborStateStr)) {
          continue;
        }

        const gScore = currentNode.g + 1;
        const hScore = this.getManhattanDistance(neighborState);
        const fScore = gScore + hScore;

        // Check if neighbor is in openSet and if this path is better
        let existingNodeInOpenSet = false;
        for (let i = 0; i < openSet.length; i++) {
          if (this.areArraysEqual(openSet[i].state, neighborState)) {
            if (openSet[i].f <= fScore) {
              existingNodeInOpenSet = true;
            } else {
              // Found a better path to this existing node, remove old one
              openSet.splice(i, 1);
            }
            break;
          }
        }

        if (existingNodeInOpenSet) {
          continue;
        }

        // Action: { tileValue, fromIndex (original tile index), toIndex (empty slot index) }
        const action = { tileValue: tileValueMoved, fromIndex: pieceToMoveIdx, toIndex: emptyIdx };
        const neighborNode = this._createSearchNode(neighborState, currentNode, action, gScore, hScore);

        openSet.push(neighborNode);
        closedSet.add(neighborStateStr); // Add to closed set when expanded or pushed to open
      }
    }
    return null; // No solution found
  },

  solveWithBot: function() {
    $('#bot_message').text("Solving, please wait...");
    $('#solve, #mix').prop('disabled', true);

    // Allows UI to update before potentially long A* execution
    setTimeout(() => {
      // aStarSearch calls getBoardState itself if it needs the current state.
      // Pass nothing to aStarSearch if it's designed to fetch current state.
      this.currentSolutionActions = this.aStarSearch();

      if (this.currentSolutionActions && this.currentSolutionActions.length > 0) {
        $('#bot_message').text("Solution found! Animating " + this.currentSolutionActions.length + " moves...");
        this.animateSolution();
      } else if (this.currentSolutionActions && this.currentSolutionActions.length === 0) {
        // This case means aStarSearch found the board is already solved.
        // The message "Board is already solved!" is set by aStarSearch.
        $('#solve, #mix').prop('disabled', false);
      } else { // null solution
        $('#bot_message').text("No solution found for the current board configuration.");
        $('#solve, #mix').prop('disabled', false);
      }
    }, 50);
  },

  bindSquareClicks: function() {
    $(".square").off("click", this.boundHandleSquareClick).on("click", this.boundHandleSquareClick);
  },

  animateSolution: function() {
    if (!this.currentSolutionActions || this.currentSolutionActions.length === 0) {
      $('#bot_message').text("No solution to animate or already solved.");
      $('#solve, #mix').prop('disabled', false);
      this.bindSquareClicks(); // Ensure clicks are enabled
      return;
    }

    // Disable square clicks during animation
    $(".square").off("click");
    // Buttons Solve and Mix are already disabled by solveWithBot

    let moveIndex = 0;
    const animationSpeed = 500; // ms per move

    const performNextMove = () => {
      if (moveIndex >= this.currentSolutionActions.length) {
        $('#bot_message').text("Animation complete!");
        $('#solve, #mix').prop('disabled', false);
        this.bindSquareClicks(); // Re-enable square clicks
        this.currentSolutionActions = []; // Clear actions
        if(this.isOk()){ // Check if board is solved, then show success
            $('.square div').addClass('success');
            setTimeout(() => { $('.game').fadeOut('slow'); }, 500);
            setTimeout(() => {
                const msg = '<h1>Parabéns!!!</h1><a href="index.html" class="btn">Jogar Novamente</a>';
                $('.game').html(msg).fadeIn('slow');
            }, 1000);
        }
        return;
      }

      const action = this.currentSolutionActions[moveIndex];
      // action is { tileValue, fromIndex (of tile), toIndex (of empty spot where tile moves) }

      // The tile that will move is at 'fromIndex'. Its ID is '#sq-(fromIndex+1)'
      const tileToMoveSquareId = '#sq-' + (action.fromIndex + 1);
      // The empty spot where this tile will move is 'toIndex'. Its ID is '#sq-(toIndex+1)'
      // This 'toIndex' should correspond to the current this.freeSquareId for the move function.
      const targetEmptySpotSquareId = '#sq-' + (action.toIndex + 1);

      // Verify this.freeSquareId matches where the tile is supposed to go
      if (this.freeSquareId !== targetEmptySpotSquareId) {
          console.error("Animation Error: Mismatch between this.freeSquareId (" + this.freeSquareId + ") and action's target empty spot (" + targetEmptySpotSquareId + "). Action:", action);
          $('#bot_message').text("Animation error. Please reset.");
          $('#solve, #mix').prop('disabled', false);
          this.bindSquareClicks();
          return;
      }

      this.move(tileToMoveSquareId, targetEmptySpotSquareId); // piece at tileToMoveSquareId moves into targetEmptySpotSquareId
      $('#moves_num').html('# of moves: ' + (moveIndex + 1) + ' (Bot)');

      moveIndex++;
      setTimeout(performNextMove, animationSpeed);
    };

    performNextMove(); // Start the animation sequence
  }
};

$(document).ready(function() {
  Game.init();
});