

// saw this format used to get around the issue of
// ensuring that these do not run before loading the page despite using defer
// using a obj here to better keep track of DOM later
// 
// create all vars for all the DOM you will 
// need and then assign them using a function
//
// I wanted to try it but it made it harder to read as a result

const DOM_IDS = {
  map: "map",
  question: "question",
  feedback: "feedback",
  score: "score",
  progress: "progress",
  timer: "timer",
  highScore: "highScore",
  restartButton: "restartButton"
};

let map;
let currentQuestionIndex = 0;
let correctCount = 0;
let incorrectCount = 0;
let quizFinished = false;
let rectangles = [];
let startTime = null;
let timerInterval = null;

const elements = {};

function cacheElements() {
  elements.map = document.getElementById(DOM_IDS.map);
  elements.question = document.getElementById(DOM_IDS.question);
  elements.feedback = document.getElementById(DOM_IDS.feedback);
  elements.score = document.getElementById(DOM_IDS.score);
  elements.progress = document.getElementById(DOM_IDS.progress);
  elements.timer = document.getElementById(DOM_IDS.timer);
  elements.highScore = document.getElementById(DOM_IDS.highScore);
  elements.restartButton = document.getElementById(DOM_IDS.restartButton);
}


// array to handle all vals of locaitons
const QUIZ_LOCATIONS = [
  {
    name: "Bookstore",
    bounds: {
      north: 34.237775,
      south: 34.236956,
      east: -118.527530,
      west: -118.528724
    }
  },
  {
    // assigned personally
    name: "Union Arena",
    bounds: {
      north: 34.242584,
      south: 34.241108,
      east: -118.525271,
      west: -118.527147
    }
  },
  {
    name: "Live Oak Hall",
    bounds: {
      north: 34.238417,
      west: -118.528862,
      south: 34.238156,
      east: -118.527500
    }
  },
  {
    name: "Jacaranda Hall",
    bounds: {
      north: 34.242175,
      west: -118.529579,
      south: 34.241049,
      east: -118.527745
    }
  },
  {
    name: "Library",
    bounds: {
      north: 34.240424,
      west: -118.530072,
      south: 34.239717,
      east: -118.528599
    }
  },
  {
    name: "Sierra Hall",
    bounds: {
      north: 34.238506,
      west: -118.531478,
      south: 34.238106,
      east: -118.529991
    }
  }
];

// Google Maps callback 
// didn't realize this had to be global for Google Maps script to call it
// was so glad to see it working properlly for the first time, api was gaving me issues
window.initMap = function initMap() {
  cacheElements();
  // const to keep track of all map specific style specifications to ensure no names/labels pop up
  const cleanMap = [
    { color: "#6f6f6f" },
    { weight: 1.5 },
    // removes all labels
    {
      featureType: "all",
      elementType: "labels",
      stylers: [{ visibility: "off" }]
    },
    // grass and stuff still show up to make it easier
    {
      featureType: "landscape.natural",
      elementType: "geometry.fill",
      stylers: [
        { visibility: "on" },
        { color: "#b8d8a8" }
      ]
    },
    {
      featureType: "poi.park",
      elementType: "geometry.fill",
      stylers: [
        { visibility: "on" },
        { color: "#a8d08d" }
      ]
    },
  ];


  map = new google.maps.Map(elements.map, {
    center: { lat: 34.2398, lng: -118.5284 },
    zoom: 17,

    // keep panning and zooming turned off
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    keyboardShortcuts: false,
    gestureHandling: "none",

    // clean up unnecessary controls
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    clickableIcons: false,

    styles: cleanMap
  });

  map.addListener("click", handleMapDoubleClick);

  if (elements.restartButton)
    elements.restartButton.addEventListener("click", restartQuiz);

  showHighScore();
  restartQuiz();
};

function restartQuiz() {
  // zero everything and call restart functions
  currentQuestionIndex = 0;
  correctCount = 0;
  incorrectCount = 0;
  quizFinished = false;
  startTime = Date.now();

  // declared towards the bottom to make more readable
  clearRectangles();
  clearElement(elements.feedback);
  clearElement(elements.score);

  startTimer();
  showQuestion();
}


// this was a pain to keep track of until i made the check in a sepret funciton
function handleMapDoubleClick(event) {
  if (quizFinished) return;

  const currentLocation = QUIZ_LOCATIONS[currentQuestionIndex];
  // pain in the butt
  const isCorrect = isInsideBounds(event.latLng, currentLocation.bounds);

  if (isCorrect) {
    correctCount += 1;
    addFeedback(`Where is ${currentLocation.name}?`, "Your answer is correct!", "correct");
    drawTargetArea(currentLocation.bounds, "green");
  } else {
    incorrectCount += 1;
    addFeedback(`Where is ${currentLocation.name}?`, "Sorry, wrong location.", "incorrect");
    drawTargetArea(currentLocation.bounds, "red");
  }

  currentQuestionIndex += 1;

  if (currentQuestionIndex >= QUIZ_LOCATIONS.length) {
    endQuiz();
  } else {
    showQuestion();
  }
}

function addFeedback(questionText, resultText, statusClass) {
  if (!elements.feedback) return;

  const questionLine = document.createElement("div");
  questionLine.className = `feedback-question ${statusClass}`;
  questionLine.textContent = questionText;

  const resultLine = document.createElement("div");
  resultLine.className = `feedback-result ${statusClass}`;
  resultLine.textContent = resultText;

  elements.feedback.appendChild(questionLine);
  elements.feedback.appendChild(resultLine);
}


// I shoudlve randomized but didnt want to mess with
// keeping track of what was already accessed
function showQuestion() {
  const currentLocation = QUIZ_LOCATIONS[currentQuestionIndex];
  setText(
    elements.question,
    `Please double click on the map where this location is: ${currentLocation.name}`
  );
  setText(
    elements.progress,
    `Question ${currentQuestionIndex + 1} of ${QUIZ_LOCATIONS.length}`
  );
}

function endQuiz() {
  quizFinished = true;
  stopTimer();

  const elapsedSeconds = getElapsedSeconds();

  setText(elements.question, "Quiz complete!");
  setText(elements.progress, `Finished all ${QUIZ_LOCATIONS.length} locations.`);
  setText(
    elements.score,
    `${correctCount} Correct, ${incorrectCount} Incorrect`
  );

  saveHighScore(correctCount, elapsedSeconds);
  showHighScore();
}


// timer thigns
// alot easier this time since I do not have to mess with paddings
function startTimer() {
  stopTimer();
  updateTimerDisplay();

  timerInterval = window.setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
  if (timerInterval) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  setText(elements.timer, `Time: ${getElapsedSeconds()}s`);
}

function getElapsedSeconds() {
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}



// score saving
// use the key to save on previous attmps and carry through loadup/restart
function saveHighScore(score, seconds) {
  const key = "csunMapQuizHighScore";
  const previous = JSON.parse(localStorage.getItem(key) || "null");

  const current = {
    score,
    seconds,
    total: QUIZ_LOCATIONS.length
  };

  const shouldSave =
    !previous ||
    current.score > previous.score ||
    (current.score === previous.score && current.seconds < previous.seconds);

  if (shouldSave) {
    localStorage.setItem(key, JSON.stringify(current));
  }
}

function showHighScore() {
  if (!elements.highScore) return;

  const saved = JSON.parse(localStorage.getItem("csunMapQuizHighScore") || "null");

  if (!saved) {
    elements.highScore.textContent = "High Score: none yet";
    return;
  }

  elements.highScore.textContent =
    `High Score: ${saved.score}/${saved.total} in ${saved.seconds}s`;
}


// final helpers
function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function clearElement(element) {
  if (element) {
    element.textContent = "";
  }
}

function clearRectangles() {
  rectangles.forEach((rectangle) => rectangle.setMap(null));
  rectangles = [];
}

// helped a bunch because I was mixing up the <= and >= for some checks
function isInsideBounds(latLng, bounds) {
  const lat = latLng.lat();
  const lng = latLng.lng();

  return (
    lat <= bounds.north &&
    lat >= bounds.south &&
    lng <= bounds.east &&
    lng >= bounds.west
  );
}

function drawTargetArea(bounds, color) {
  // originally had it take the bounds and a boolean 
  // but realized it would be easier if I just sent the color I wanted instead of if it was right or not
  const rectangle = new google.maps.Rectangle({
    map,
    bounds,
    strokeColor: color,
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: color,
    fillOpacity: 0.25
  });

  rectangles.push(rectangle);
}