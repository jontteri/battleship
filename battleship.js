
"use strict";
var gameBoard = [];
var hitCount = 0;
var shipSizes = [5, 4, 3, 3, 2];
var takenCoordinates = [];
var shipCollection = [];
var score = 0;
var torpedoCounter = 1;
var gameBoardContainer;

$(document).ready(function () {

    //Listener for messages from service
    window.addEventListener("message", function (evt) {
        console.log("Received message", evt.data);
        var msg = evt.data;
        if (msg) {
            if (msg.messageType === "LOAD") {
                if (msg.gameState) {                    
                    score = msg.gameState.score;
                    torpedoCounter = msg.gameState.torpedoCounter;
                    hitCount = msg.gameState.hitCount;

                    if (msg.gameState.gameBoard) {
                        gameBoard = msg.gameState.gameBoard;
                    }
                }

                //send score to parent
                var scoreMessage = {
                    messageType: "SCORE",
                    score: score // Float

                };
                window.parent.postMessage(scoreMessage, "*");

                var messageBoard = document.getElementById("messageboard");
                messageBoard.innerHTML = "Game loaded!";

                initialize(true);
            }
            if (msg.messageType === "ERROR") {
                if (msg.info) {
                    var messageBoard = document.getElementById("messageboard");
                    messageBoard.innerHTML = msg.info;
                }
            }
        }
    });

    //send settings to parent
    var settingMessage = {
        messageType: "SETTING",
        options: {
            "width": 700,
            "height": 750
        }
    };
    window.parent.postMessage(settingMessage, "*");

    initialize(false);
});

function initialize(loadGame) {

    // set grid rows and columns and the size of each square
    var rows = 10;
    var cols = 10;
    var squareSize = 50;

    // get the container element
    if (document.getElementById("gameboard").innerHTML !== "") {
        document.getElementById("gameboard").innerHTML = "";
    }
    gameBoardContainer = document.getElementById("gameboard");

    // make the grid columns and rows
    for (i = 0; i < cols; i++) {
        for (j = 0; j < rows; j++) {

            // create a new div HTML element for each grid square and make it the right size
            var square = document.createElement("div");
            gameBoardContainer.appendChild(square);

            // give each div element a unique id based on its row and column, like "s00"
            square.id = 's' + j + i;

            // set each grid square's coordinates: multiples of the current row or column number
            var topPosition = j * squareSize;
            var leftPosition = i * squareSize;

            // use CSS absolute positioning to place each grid square on the page
            square.style.top = topPosition + 'px';
            square.style.left = leftPosition + 'px';
        
            
            if (loadGame) {
                if (gameBoard[j][i] === 2) {
                    square.style.background = 'red';
                }
                if (gameBoard[j][i] === 3) {
                    square.style.background = '#bbb';
                }
            }
            
            
        }
    }

    /* create the 2d array that will contain the status of each square on the board
       and place ships on the board (later, create function for random placement!)
    
       0 = empty, 1 = part of a ship, 2 = a sunken part of a ship, 3 = a missed shot
    */

    //Randomize ship positions
    for (var i = 0; i < shipSizes.length; i++) {
        var shipSize = shipSizes[i];
        var shipFits = false;
        var ship = [];

        do {
            //Randomize coordinates x,y
            var x = Math.floor(Math.random() * 10) + 1;
            var y = Math.floor(Math.random() * 10) + 1;

            //Randomize orientation
            var xModifier;
            var yModifier;

            var orientation = Math.floor(Math.random() * 4) + 1;
            if (orientation === 1) {
                // if orientation = 1 = go up = x stays same, reduce y
                xModifier = 0;
                yModifier = -1;
            } else if (orientation === 2) {
                // if orientation = 2 = go right = increment x, y stays same
                xModifier = 1;
                yModifier = 0;
            } else if (orientation === 3) {
                // if orientation = 3 = go down = x stays same, increment y
                xModifier = 0;
                yModifier = 1;
            } else {
                // if orientation = 4 = go left = reduce x, y stays same
                xModifier = -1;
                yModifier = 0;
            }

            //Check if the ship fits
            var coordinatesOK = false;
            for (var j = 0; j < shipSize; j++) {
                //Check if coordinate already exists in taken coordinates array (takenCoordinates)
                //Use modifiers and check if the ship fits the board

                var arrayContainsCoordinates = (takenCoordinates.indexOf(x + "," + y) > -1);

                if (arrayContainsCoordinates === false && (x >= 1 && x <= 10) && (y >= 1 && y <= 10)) {
                    //Green light, these fit, try next coordinates
                    coordinatesOK = true;
                    ship.push(x + "," + y);
                } else {
                    coordinatesOK = false;
                    break;
                }

                x += xModifier;
                y += yModifier;
            }
            //Create ship coordinates (including it's required space)
            //From start to finish
            if (coordinatesOK) {
                shipFits = true;
                //Push coordinates to takenCoordinates
                for (var k = 0; k < ship.length; k++) {
                    takenCoordinates.push(ship[k]);
                }
            } else {
                ship = [];
            }
        }
        while (shipFits === false);

        //Ship fits, so add it to the collection
        shipCollection.push(ship);
        ship = [];
    }

    //Create a single array of ship coordinates
    var takenCoords = [];
    for (var i = 0; i < shipCollection.length; i++) {
        var ship = shipCollection[i];

        for (var j = 0; j < ship.length; j++) {
            takenCoords.push(ship[j]);
        }
    }

    //Create the gameBoard
    //i = x
    //j = y
    if (!loadGame) {
        for (var i = 1; i <= 10; i++) {
            var rowArray = [];
            for (var j = 1; j <= 10; j++) {
                if (takenCoords.indexOf(i + "," + j) > -1) {
                    rowArray.push(1);
                } else {
                    rowArray.push(0);
                }
            }
            gameBoard.push(rowArray);
        }
    }

    // set event listener for all elements in gameboard, run fireTorpedo function when square is clicked
    gameBoardContainer.addEventListener("click", fireTorpedo, false);
}

// initial code via http://www.kirupa.com/html5/handling_events_for_many_elements.htm:
function fireTorpedo(e) {
    // if item clicked (e.target) is not the parent element on which the event listener was set (e.currentTarget)
    var messageBoard = document.getElementById("messageboard");
	if (e.target !== e.currentTarget) {
        // extract row and column # from the HTML element's id
		var row = e.target.id.substring(1,2);
		var col = e.target.id.substring(2,3);
        //alert("Clicked on row " + row + ", col " + col);
				
		// if player clicks a square with no ship, change the color and change square's value
		if (gameBoard[row][col] == 0) {
			e.target.style.background = '#bbb';
			// set this square's value to 3 to indicate that they fired and missed
            gameBoard[row][col] = 3;
            if (score > 0) {
                score -= 100;
            }
            messageBoard.innerHTML = "<p>Torpedo " + torpedoCounter + " missed!</p>";
			
		// if player clicks a square with a ship, change the color and change square's value
		} else if (gameBoard[row][col] == 1) {
			e.target.style.background = 'red';
			// set this square's value to 2 to indicate the ship has been hit
            gameBoard[row][col] = 2;
            score += 300;
            messageBoard.innerHTML = "<p>Torpedo " + torpedoCounter + " hit!</p>";
			
			// increment hitCount each time a ship is hit
			hitCount++;
			// this definitely shouldn't be hard-coded, but here it is anyway. lazy, simple solution:
            if (hitCount == 17) {
                messageBoard.innerHTML = "All enemy battleships have been defeated! You win!";
                gameBoardContainer.removeEventListener("click", fireTorpedo, false);
			}
			
		// if player clicks a square that's been previously hit, let them know
        } else if (gameBoard[row][col] > 1) {
            messageBoard.innerHTML = "Stop wasting your torpedos! You already fired at this location.";
        }
        torpedoCounter += 1;
    }

    //send score to parent
    var scoreMessage = {
        messageType: "SCORE",
        score: score // Float
    };
    window.parent.postMessage(scoreMessage, "*");

    e.stopPropagation();
}

function saveGame() {
    //send gameState to parent
    var saveMessage = {
        messageType: "SAVE",
        gameState: {
            gameBoard: gameBoard,
            score: score,
            torpedoCounter: torpedoCounter,
            hitCount: hitCount
        }
    };

    saveMessageJSON = JSON.stringify(saveMessage);
    console.log(saveMessageJSON);
    window.parent.postMessage(saveMessage, "*");
}

$("#restart-button").click(function () {
    gameBoardContainer.removeEventListener("click", fireTorpedo, false);
    gameBoard = [];
    hitCount = 0;
    takenCoordinates = [];
    shipCollection = [];
    score = 0;
    torpedoCounter = 1;

    var messageBoard = document.getElementById("messageboard");
    messageBoard.innerHTML = "Game restarted!";

    initialize(false);
});

$("#load-button").click(function () {

    var messageBoard = document.getElementById("messageboard");
    messageBoard.innerHTML = "Game load request sent!";

    //send loadRequest to parent
    var loadRequestMessage = {
        messageType: "LOAD_REQUEST"
    };

    window.parent.postMessage(loadRequestMessage, "*");
});

$("#save-button").click(function () {

    var messageBoard = document.getElementById("messageboard");
    messageBoard.innerHTML = "Game saved!";

    saveGame();
});