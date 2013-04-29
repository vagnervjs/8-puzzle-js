var pos = [];
	pos[1] = [2, 4];
	pos[2] = [1, 3, 5];
	pos[3] = [2, 6];
	pos[4] = [1, 7, 5];
	pos[5] = [2, 4, 6, 8];
	pos[6] = [3, 5, 9];
	pos[7] = [4, 8];
	pos[8] = [7, 5, 9];
	pos[9] = [8, 6];

$(document).ready(function() {
	$(".square").on("click", function(){
		var elem = $(this),
			current_elem = elem.attr('id').split("-");
			current_elem = current_elem[1];
			current_elem_id = '#sq-' + current_elem,
			freeElem = getFreeNeighbor(pos[current_elem]);

		if(freeElem){
			move(current_elem_id, freeElem);
			var r = isOk();
			if(r){
				$('.square div').addClass('success');
				setTimeout(function(){
					$('.main').fadeOut('slow');
				}, 500);

				setTimeout(function(){
					$('.main').html('<h1>Success!!!</h1>');
					$('.main').fadeIn('slow');
				}, 1000);
			}
		}
	});

	$("#mix").on("click", function(){
		var i = $("#moves").val();
		if(i === ''){
			i = 10000;
		}
		mix(i);
	});
});


function getFreeNeighbor(currentElemPos){
	for (var i = currentElemPos.length - 1; i >= 0; i--) {
		var neighbor = currentElemPos[i],
			neighbor_id = '#sq-' + neighbor;

		if ($(neighbor_id).hasClass('free')) {
			return neighbor_id;
		}
	}
}

function move(currentElem, freeElem){
	var currentChild = $(currentElem).children();
	$(freeElem).html(currentChild);
	$(freeElem).removeClass('free');
	$(currentElem).addClass('free');
}

function mix(moves){
	var m = 0, i = randomElem();

	while(m <= moves){
		var freeElem = getFreeNeighbor(pos[i]);
		if (freeElem) {
			move("#sq-" + i, freeElem);
			$("#moves_num").html('# of moves: ' + m);
			m++;
		} else {
			i = randomElem();
		}
	}
}

function randomElem(){
	i = Math.floor(Math.random() * 10);
	if (i === 0) {
		while (i === 0){
			i = Math.floor(Math.random() * 10);
		}
	}
	return i;
}

function isOk(){
	var c = 0;
	for(var i = 1; i<10; i++){
		var children = $('#sq-' + i).children(),
			children_id = children.attr('id');

		if(children_id){
			children_id = children_id.split("-");
			if(children_id[1] == i){
				c++;
			}
		} else {
			if (i != 9) {
				a = 0;
			}
			a = 0;
		}
	}

	if(c == 8){
		return true;
	} else {
		return false;
	}
}