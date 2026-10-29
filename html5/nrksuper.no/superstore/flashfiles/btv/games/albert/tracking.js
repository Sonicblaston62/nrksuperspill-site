var baseUrl = "/puslespill/canvas/"; // Url to the game (realtive from domain) on embedded site - should end with trailing slash

// Page view in game
function pageView(page) {  // page is the url hash string like "easy/1". Front page is set to "front"
	try{
		console.log("Track pageView: "+page);
		_gaq.push(['_trackPageview', baseUrl+page]);
	} catch(err) {};
}

// User starts a puzzle
function startPuzzle(difficulty) { // difficulty is a string like "easy"
	try{
		console.log("Track: startPuzzle: "+difficulty+", "+board);	
		_gaq.push(['_trackEvent', 'AlbertÅbergPuslespill', 'start puzzle',difficulty]);		
	} catch(err){};
}

// User finishes a puzzle
function finishPuzzle(difficulty) { // difficulty is a string like "easy"
	try{
		console.log("Track: finishPuzzle: "+difficulty+", "+board);		
		_gaq.push(['_trackEvent', 'AlbertÅbergPuslespill', 'finish puzzle',difficulty]);		
	} catch(err){};
}

// User asked for help
function gotHelp(difficulty) { // difficulty is a string like "easy"
	try{
		console.log("Track: gotHelp: "+difficulty+", "+board);		
		_gaq.push(['_trackEvent', 'AlbertÅbergPuslespill', 'got help',difficulty]);		
	} catch(err){};
}