// KNN Classification
// A Beginner's Guide to Machine Learning with ml5.js
// The Coding Train / Daniel Shiffman
// 1: https://youtu.be/KTNqXwkLuM4
// 2: https://youtu.be/Mwo5_bUVhlA
// 3: https://youtu.be/JWsKay58Z2g
// https://thecodingtrain.com/learning/ml5/4.1-ml5-save-load-model.html
// https://editor.p5js.org/codingtrain/sketches/RERqlwJL

//
//pre-game variables
//
let knn; //ml5.js model I used
let features; //pre-trained model that knn is based off
let test_label = "nothing"; //label of image being classified
let model_ready = false; //model is ready when there exists at least one training image to classify
let video_ready = false; //video is ready when video element finishes loading
let model_paused = false; //true when model is actively classifying training data
let collectPressed = false; //if train button is pressed
let selected_button; //currently selected class

//
//while playing variables
//
let playing = false; //true when play button is pressed
let timer; //span between beginning a round and image capture, in seconds
let ai_move; //stores move computer played 
let bot_moves = ['rock', 'paper', 'scissors']; //possible moves bot can play
let acc_dict = {}; //dictionary storing number of images collected for each class 
let emoji_dict = {}; //maps move name to respective emoji
let counting = false; //if countdown is active
let win_matrix = {
  'rock': {'rock': 0, 'paper': -1, 'scissors': 1},  //stores as win_matrix[player_move][ai_move] = winner
  'paper': {'rock': 1, 'paper': 0, 'scissors': -1}, // 0 = tie, 1 = player_win, -1 = ai_win
  'scissors': {'rock': -1, 'paper': 1, 'scissors': 0}
}

//
//p5.element variables (for html elements)
//
let train_div; //training & settings div

//class button divs
let rock_button;
let paper_button;
let scissors_button;

//class button text elements
let rock;
let paper;
let scissors; 

let instructions; //instructions text
let reset; //reset button
let play; //play button
let collect; //train button

let bot; //computer component div
let player; //player component
let video; //html video element
let ai_move_text; //html text for ai_move
let player_text; //text element showing current classification
let winner; //countdown + winner html text 

//
//setup function: automatically is run once immediately when page is loaded
//
function setup() {
  noCanvas(); //removes default canvas
  
  //
  //divs are generally intialized hierarchically, from largest to smallest.
  //however, take note that children elements cannot be added to their parents
  //until both have been intialized. for this reason, child() calls occur at
  //the inverse end of the function.
  //
  let app = createDiv(''); //contains everything except the header
  app.class('app');

  //int battleground for game interface
  battleground = createDiv('');
  battleground.class('battleground');

  //init text in-between players
  let winner_div = createDiv('');
  winner_div.class('winner');
  winner = createP(' ');
  winner.class('big-text');
  winner_div.child(winner);

  //init player div with subcomponents
  player = createDiv('');
  player.class('competitor-div');
  let player_header = createP('Player');
  player_header.class('big-text');
  video = createCapture(VIDEO, videoReady);
  video.style('transform', 'scaleX(-1)');
  player_text = createP("Need training data");
  player_text.class("big-text");
  //add subcomponents to parent div
  player.child(player_header);
  player.child(video);
  player.child(player_text);

  //init bot div with subcomponents
  bot = createDiv('');
  let bot_header = createP('Computer');
  bot_header.class('big-text');
  let bot_img = createImg('images/robot.png');
  ai_move_text = createP('');
  ai_move_text.class('big-text');
  bot.class('competitor-div');
  //add subcomponents to parent div
  bot.child(bot_header);
  bot.child(bot_img);
  bot.child(ai_move_text);

  //add players and winner text to battleground
  battleground.child(player);
  battleground.child(winner_div);
  battleground.child(bot);

  //init training & setting panel
  train_div = createDiv('');
  train_div.class('train');
  //init instructions text
  instructions = createP("Select a class and hold the Space bar to begin training.");
  //init class buttons and subcomponents
  rock_button = createDiv('');
  paper_button = createDiv('');
  scissors_button = createDiv('');
  rock_button.class('class_div');
  paper_button.class('class_div');
  scissors_button.class('class_div');
  rock = createP();
  paper = createP();
  scissors = createP();
  rock.class('label');
  paper.class('label');
  scissors.class('label');
  rock_button.id('rock');
  paper_button.id('paper');
  scissors_button.id('scissors');
  rock.html('Rock ✊');
  paper.html('Paper ✋');
  scissors.html('Scissors ✌️');
  //add subcomponents to parents
  rock_button.child(rock);
  paper_button.child(paper);
  scissors_button.child(scissors);

  //init play, reset, and train buttons
  let settings = createDiv('');
  reset = createButton("Reset class");
  play = createButton("Play");
  collect = createButton("Train");
  play.class('button');
  reset.class('button');
  collect.class('button');
  collect.id('collect');
  //add play and reset to settings. train is not a part of settings.
  settings.child(play);
  settings.child(reset);
  settings.class('settings');

  //add all subcomponents to train & settings panel.
  //NOTE: order matters here. Each subcomponent is added in the order it appears on-screen
  train_div.child(instructions);
  train_div.child(settings);
  train_div.child(rock_button);
  train_div.child(paper_button);
  train_div.child(scissors_button);
  train_div.child(collect);

  //add training panel and game panel to app framework
  app.child(train_div);
  app.child(battleground);
  //
  //end html element initialization
  //

  //init ML models. features is the pre-trained model, 
  //knn is custom-made model
  features = ml5.featureExtractor("MobileNet");
  knn = ml5.KNNClassifier();

  //init emoji dictionary
  emoji_dict[rock_button.id()] = '✊';
  emoji_dict[paper_button.id()] = "✋";
  emoji_dict[scissors_button.id()] = '✌️';
  
  //
  //the for loop iterates through each class and initializes
  //its respective accumulator dictionary, as well the the event listener.
  //The event listen listens for a discreet button click, and when detected,
  //changes the selected_button variable to match accordingly, as well as the 
  //button styles. 
  //
  let classes = [rock_button, paper_button, scissors_button];
  for (let i = 0; i < classes.length; i++) {
    let this_button = classes[i];
    acc_dict[this_button.id()] = 0;
    //event listener
    this_button.mouseClicked(() =>  {
      // change old selected button back to the "unpressed" style
      if (selected_button) {
        selected_button.style('background-color', color(220));
        selected_button.style('box-shadow', '0 0 10px rgba(0, 0, 0, 0.4)');
      }
      // set new selected button to "pressed" style
      selected_button = this_button;
      selected_button.style('background-color', color('#cdcdcd'));
      selected_button.style('box-shadow', 'inset 0 0 5px rgba(0, 0, 0, 0.4)');
    });
  }

  //
  //Init the train button to respond to mouse/touch presses and releases.
  //These events are listened to continuously (each frame) rather than discreetly,
  //e.g. with mouseClicked().
  //
  collect.mousePressed(startFunction);
  collect.mouseReleased(stopFunction);
  collect.touchStarted(startFunction);
  collect.touchEnded(stopFunction);

  //init reset button event listener. When clicked, the reset button
  //clears the training data from the selected class.
  reset.mouseClicked(() => {
    if (selected_button){
      knn.clearLabel(selected_button.id());
      acc_dict[selected_button.id()] = 0;
      instructions.html("Select a class and hold the Space bar to begin training.");
      reset.elt.blur();
      model_ready = false;
      model_paused = false;
      winner.style('visibility', 'hidden');
    }
  });
  
  //init play button event listener. When clicked, attempt to play a round.
  play.mouseClicked(() => {
    goPlay();
  });
}
//
//end of setup()
//

//
//The main purpose of the following functions is to set booleans to true or false. 
//These booleans are important to conditionals in the draw() function, and let it
//know when certain code blocks can be executed. 
//

//called by createVideo component in setup(). Lets program
//know that the video is ready to collect training data.
function videoReady() {
  video.size(320, 240);
  video_ready = true;
}

//called when collect button is pressed/released, respectively. 
//when collectPressed = true, training data is collected from the camera. 
function startFunction() {
  collectPressed = true;
}

function stopFunction() {
  collectPressed = false;
}
//
//end boolean functions
//

//
//model-specific functions. The following functions are used to train the ML
//model and classify subsequent test images.
//

//Add image captured from video component to the currently selected button,
//parameterized here as button. 
//Called by draw() if startFunction() has been called
function train(button) {
  if (acc_dict[button.id()] < 100) {
    const logits = features.infer(video);
    knn.addExample(logits, button.id());
    acc_dict[button.id()]++;
  }
}

//attempts to classify the image captured by video. classification
//occurs if and only if there exists one class with viable
//training data.
function goClassify() {
  const logits = features.infer(video);
  knn.classify(logits, function (error, result) {
    if (error) {
      console.error(error);
    } else if (!model_paused) {
      test_label = result.label;
      player_text.html(emoji_dict[result.label]);
      goClassify();
    }
  });
}
//
//end model-specific functions
//

//
//game-specific functions. the following functions control when
//and how game rounds can be called.
//

//attempt to start a round. fails if there isn't at least one viable class
//with training data.
function goPlay() {
  if (!model_ready) {
    instructions.html('You must train a class to being playing!');
  } else {    
    timer = 3; //countdown in seconds
    model_paused = false; //begin classifying again if paused
    model_ready = false; 
    playing = true; //starts countdown in draw()
  }
}

//helper function that simulates the AI "choosing" a move while playing = true.
function rollAI() {
  ai_move_text.html(emoji_dict[bot_moves[frameCount % 3]]);
}

//countdown function. Called by goPlay() once a viable round beings. 
//it's a bit overengineered because it relys on the current frameCount, but
//in summary it will count down from timer (seconds) to zero. At zero seconds, 
//the ML model is paused and the last image captured is passed to findWinner(), 
//along with a random move chosen for the computer opponent.
function countdown() {
  if (frameCount % 60 != 0) {
    if (counting == false) {
      winner.style('visibility', 'hidden');
      return;
    }
  }
  if (counting == false) {
    counting = true;
    winner.style('visibility', 'visible');
  }
  if (frameCount % 5 == 0) rollAI(); //change AI move
  if (frameCount % 60 == 59) {
    if (timer > 0) timer--;
    if (timer == 0) {
      playing = false;
      model_paused = true;
      counting = false;
      //randomly select AI move
      ai_move = bot_moves[Math.floor(Math.random() * bot_moves.length)]; 
      ai_move_text.html(emoji_dict[ai_move]);
      findWinner();
    }
  }
}

//called by countdown() when timer = 0. Evaluates the player's move against
//the computer's move and chooses a winner using win_matrix. 
function findWinner() {
  if (win_matrix[test_label][ai_move] > 0) winner.html("Player's " + test_label + " beats Computers's " + ai_move + '. you win!');
  else if (win_matrix[test_label][ai_move] < 0) winner.html("Computers's " + ai_move + " beats Player's " + test_label + '. you lose!');
  else (winner.html('Player and Computer both threw ' + test_label + '. It\'s a tie!'));
}
//
//end play-specific functions
//

//
// draw is called everyframe after setup()-- 60 frames per second(!)
//
function draw() {
  
  //call train() if there is a valid button selected, the video is ready to capture,
  //and either the space bar or train button are being pressed.
  if (selected_button && video_ready) {
    if (keyIsDown(32) || collectPressed) {
      train(selected_button);
    }
  }

  //call goClassify() if there exists at least one valid class with training data
  if (!model_ready && knn.getNumLabels() > 0) {
    goClassify();
    model_ready = true;
  }

  //playing=true while play has been pressed and the timer has yet to reach 0.
  if (playing) {
    winner.html(timer);
    instructions.html("Capturing in " + timer + " seconds...");
    countdown();
  } else if (acc_dict[rock_button.id()] == 100 && acc_dict[paper_button.id()] == 100 && acc_dict[scissors_button.id()] == 100) {
    instructions.html('Click Play and hold up a move!');
  }
}
//
//init training bars. each training bar is inside 1 of 3 p5 instances,
//each with its own canvas element. Each p5 instance below has its own
//setup() and draw() loop. These function the same as the main setup()/draw()
//loop, but they have their own local variables and functions. 
//
let canvas_width = 450;
let canvas_height = 60;
let text_height = 40
let text_width = 140;
// init rock frame count
let rock_sketch = function(p) {
  let canvas;
  let run_me;
  p.setup = function() {
    // p.background('#f0f0f0');
    canvas = p.createCanvas(canvas_width, canvas_height);
    // console.log(p.rock_button);
    // canvas.parent(rock_button);
    // console.log(document.getElementById('collect'));
    // canvas.parent('rock');
    run_me = true;
    p.background(255);
    p.textSize(24);
    p.fill(0);
    p.text('0 frames collected', text_width, text_height); // Adjusted Y-coordinate
  };
  //draw rock frame count
  p.draw = function() {
    if (run_me) {
      canvas.parent(rock_button);
      run_me = false;
      //console.log('adding canvas to rock parent');
    }
    if (selected_button == rock_button) {
      p.background(255);
      // Calculate the width of the bar based on the accumulator value
      let barWidth = p.map(acc_dict['rock'], 0, 100, 0, p.width);
  
      // Interpolate the color from red to gree
      let barColor = p.lerpColor(p.color('red'), p.color('#0f0'), acc_dict['rock'] / 100);
       
      // Draw the bar
       p.fill(barColor);
       p.rect(0, 0, barWidth, 100);
  
       p.textSize(24);
       p.fill(0);
       p.text(acc_dict['rock'] + ' frames collected', text_width, text_height); // Adjusted Y-coordinate
    }
  };
};
//init paper frame count
let paper_sketch = function(p) {
  let canvas;
  let run_me;
  p.setup = function() {
    //p.background(220);
    canvas = p.createCanvas(canvas_width, canvas_height);
    p.background(255);
    p.textSize(24);
    p.fill(0);
    run_me = true
    p.text('0 frames collected', text_width, text_height); // Adjusted Y-coordinate
  };
  //draw paper frame count
  p.draw = function() {
    if (run_me) {
      canvas.parent(paper_button);
      run_me = false;
    }
    if (selected_button == paper_button) {
      p.background(255);
      // Calculate the width of the bar based on the accumulator value
      let barWidth = p.map(acc_dict['paper'], 0, 100, 0, p.width);
  
      // Interpolate the color from red to gree
      let barColor = p.lerpColor(p.color('red'), p.color('#0f0'), acc_dict['paper'] / 100);
       
      // Draw the bar
       p.fill(barColor);
       p.rect(0, 0, barWidth, 100);
  
       p.textSize(24);
       p.fill(0);
       p.text(acc_dict['paper'] + ' frames collected', text_width, text_height); // Adjusted Y-coordinate
    }
  };
};
// init scissors frame count
let scissors_sketch = function(p) {
  let canvas;
  let run_me;
  p.setup = function() {
    //p.background(220);
    canvas = p.createCanvas(canvas_width, canvas_height);
    p.background(255);
    p.textSize(24);
    p.fill(0);
    run_me = true;
    p.text('0 frames collected', text_width, text_height); // Adjusted Y-coordinate
  };

  //draw scissors frame count
  p.draw = function() {
    if (run_me) {
      canvas.parent(scissors_button);
      run_me = false;
    }
    if (selected_button == scissors_button) {
      p.background(255);
      // Calculate the width of the bar based on the accumulator value
      let barWidth = p.map(acc_dict['scissors'], 0, 100, 0, p.width);
  
      // Interpolate the color from red to gree
      let barColor = p.lerpColor(p.color('red'), p.color('#0f0'), acc_dict['scissors'] / 100);
       
      // Draw the bar
       p.fill(barColor);
       p.rect(0, 0, barWidth, 100);
  
       p.textSize(24);
       p.fill(0);
       p.text(acc_dict['scissors'] + ' frames collected', text_width, text_height); // Adjusted Y-coordinate
    }
  };
};

//instantiate all canvases so they actually run
let rock_canvas = new p5(rock_sketch);
let paper_canvas =  new p5(paper_sketch);
let scissors_canvas = new p5(scissors_sketch);


