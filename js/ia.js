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

  init: function() {
    $(".square").on("click", this.handleSquareClick.bind(this));
    $("#mix").on("click", this.handleMixClick.bind(this));
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
  }
};

$(document).ready(function() {
  Game.init();
});