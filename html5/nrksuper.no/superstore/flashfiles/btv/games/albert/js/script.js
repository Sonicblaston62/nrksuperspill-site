var inited = false;
var dropBuffers = {};
var dropBuffer;
var topmargin = 100;
var	minHeight = 680; //Owerwritten by settings.xml
var	minWidth = 640; //Owerwritten by settings.xml
var bottomrightmargin = {right:150,bottom:100};
var topIndex = 10000;
var difficulty = "easy";
var boardid = 0;
var hash = "";
var dragOffset = {};
var boards = {};
var dragged;
var pieces;
var doc;
var boardbox;
var boardpos;
var gesture;
var mouseX;
var mouseY;
var boardURL;
var loadedPieces;
var totalPieces;
var throbber;
var win;
var hammer;
var down;
var settings;
var isThrobbing = false;
var touch = false;
var isFinished = false;
var touches = {};
var drags = {};
var multitouch = true;
var mousepressed = false;

var clicksound;
var shufflesound;
var picksound;
var dropsound;
var rightsound;
var winsound;
var music;
var soundsLoaded = false;

loadSounds();

$("body").ready(function(){	
	if(Modernizr.canvas) {
		loadSounds();	
			
		preloadImage("images/vandregif.gif");
		preloadImage("images/choose.png");
		preloadImage("images/choose-done.png");		
		preloadImage("images/helpbox.png");	
		preloadImage("images/winbox.png");	
		preloadImage("images/good.png");	
		preloadImage("images/help.png");	
		preloadImage("images/check.png");	
		preloadImage("images/back.png");		
		
		doc = $(document);
		doc.click(function(){
			startMusic();
			loadSounds();
			doc.unbind("click");
		});
		
		setTimeout("startMusic();loadSounds();", 500);
		
		$("#music").click(function(){
			if(muted) unmute();
			else mute();
			return false;
		});
			
		boardbox = $('#board');
		throbber = $('#throbber');	
		startThrobber();
		
		getSettings();
		
		$(window).resize(scale);
		$(window).bind('hashchange', gotoPage);	
		$("#back").click(function(e){
			var finishedpieces = $(".piece.right").length;
			console.log(finishedpieces);
			if(hash.indexOf("/")>-1 && finishedpieces>0 && finishedpieces<totalPieces) {
				if(confirm(t("confirmExit"))) {
					window.location.hash = $(this).attr("href").substr(1);
					makeClick();		
					return false;						
				} else return false;
				
			} else {		
				window.location.hash = $(this).attr("href").substr(1);
				makeClick();		
				return false;
			}
		});
		
		$("#difficulty a").each(function(){
			$(this).click(function(){
				loadSounds();
				if(!musicStarted) startMusic();
				else makeClick();
				window.location.hash = $(this).attr("href").substr(1);
				return false;
			});
		});
		
		scale();
		
		$(window).bind("blur",hiddenApp);
		$(window).bind("onpagehide",hiddenApp);
		$(window).bind("pagehide",hiddenApp);	
		$(window).bind("onunload",hiddenApp);	
		$(window).bind("onbeforeunload",hiddenApp);	
		
		$(window).bind("focus",shownApp)	
		$(window).bind("onpageshow",shownApp)		
		
		
		
		visibly.onHidden(hiddenApp);
		
		try {
			document.addEventListener(visibilityChange, hiddenApp);
		} catch(e) {}
	
	} else {
		$("body").html("<div style='padding:40px;'><h1>Error</h1>Your browser doesn't support HTML5, and cannot play this game</div>");
	}
	
});

function preloadImage(image) {
$('<img>').attr({src: image,}).appendTo('#preload');	
}

function startGame() {
	endThrobber();		
	gotoPage();	
}

function difficultyPage() {
	destroyBoard();
	$("#back").attr("href","#");		
	$("body").removeClass("choose board").addClass("front");
	$("#choose,#board,#help").hide();
	$("#title,#subtitle,#difficulty").css('opacity','1').hide().fadeIn(1000);
}

function choosePage(difficulty) {
	destroyBoard();
	$("#back").attr("href","#");		
//	$("#back").click(function(){window.location.hash = ""});
	$("#title,#subtitle").css('opacity','1').show();
	$("body").removeClass("front board").addClass("choose");
	scale();
	$("#difficulty,#board,#help").hide();
	$("#choose").hide().html("");
	startThrobber();	
	
	
	var num = eval("boards."+difficulty);
	for(i=0;i<num;i++) {
		var hash = difficulty+"/"+(i+1);
		var done = (sessionStorage.getItem(hash)) ?  "done" : "";
		
		$('<a>').attr({
			id: "board-"+i,
			'class': "boardThumb "+done,
			href: "#"+hash   
		}).css({
			background:"url('./boards/"+hash+"/thumb.png') no-repeat 0% 0%"
		}).html("<div class='over'></div>").appendTo('#choose');		
		
		$(".boardThumb").click(function(){makeClick()});
		
//		

	}
	scale();
	if(num%2) $(".boardThumb:last").addClass("center");
	
	doc.waitForImages(function(){
		endThrobber();	
		$("#choose").css('opacity','1').hide().fadeIn();	
	});	
}

function boardPage(hashes) {
	difficulty = hashes[0]; 
	boardid = hashes[1];
	startPuzzle(difficulty);
	if(!boardExists(hash)) window.location.hash = "";		
	$("body").removeClass("front choose done good").addClass("board");
	$("#title,#subtitle").css('opacity','1').show();
	$("#difficulty,#choose").hide();	
	$("#back").attr("href","#"+difficulty);	
	loadBoard(hash);
}

function boardExists(board) {
	var exists = UrlExists("./boards/"+board+"/board.xml");
	return exists;
}

function gotoPage(e) {
	hash = window.location.hash.substr(1);
	pageView((hash && hash != "") ? hash : "front");
	var hashes = hash.split("/");
	
	if(hashes[1]) boardPage(hashes);
	else if(hashes[0]=="easy") choosePage("easy");
	else if(hashes[0]=="medium") choosePage("medium");	
	else if(hashes[0]=="hard") choosePage("hard");		
	else difficultyPage();	
}

function gotSettings(xml) {	
	settings = $(xml);	
	$("#title").text(t('title'));
	$("#subtitle").text(t('subtitle'));
	$("#easyButton span").text(t('easy'));
	$("#mediumButton span").text(t('medium'));
	$("#hardButton span").text(t('hard'));	

	boards.easy = Number(settings.find("settings").find("boards").attr("easy"));
	boards.medium = Number(settings.find("settings").find("boards").attr("medium"));	
	boards.hard = Number(settings.find("settings").find("boards").attr("hard"));

	minWidth = Number(settings.find("settings").find("minsize").attr("width"));
	minHeight = Number(settings.find("settings").find("minsize").attr("height"));

	dropBuffers.mouse = {};
	dropBuffers.mouse.easy = Number(settings.find("settings").find("dropbuffer").find("mouse").attr("easy"));	
	dropBuffers.mouse.medium = Number(settings.find("settings").find("dropbuffer").find("mouse").attr("medium"));	
	dropBuffers.mouse.hard = Number(settings.find("settings").find("dropbuffer").find("mouse").attr("hard"));	
	
	dropBuffers.touch = {};
	dropBuffers.touch.easy = Number(settings.find("settings").find("dropbuffer").find("touch").attr("easy"));	
	dropBuffers.touch.medium = Number(settings.find("settings").find("dropbuffer").find("touch").attr("medium"));	
	dropBuffers.touch.hard = Number(settings.find("settings").find("dropbuffer").find("touch").attr("hard"));
	
	
	
	scale();
	doc.waitForImages(startGame);
}

function t(tag) {
	return settings.find("translations").find(tag).text();
}

function getSettings() {
	var xml = "./settings.xml";
	$.ajax({
		type: "GET",
		url: xml,
		dataType: "xml",
		success: gotSettings,
		error: function(e){console.log(e)}
	});
}

function scale(e) {

	w = $("#container");
	windowHeight = $(window).innerHeight();
	windowWidth = $(window).innerWidth();

	if(!win) win = {};	
	win.width = (windowWidth<minWidth) ? minWidth : windowWidth-20 ;
	win.height = (windowHeight<minHeight) ? minHeight : windowHeight ;	

	
	w.css({width: win.width,height: win.height});
	var chooseHeight = $("#choose").height();
	var chooseWidth = $("#choose").width();	
	var gentop = ((win.height-topmargin)/2)-(chooseHeight/2)+topmargin;
	$("#choose").css({
		top: (gentop>topmargin) ? gentop : topmargin,
		left: (win.width/2)-(chooseWidth/2)	
	});
	
		
//	win = {width:w.width(),height:w.height()};
	getBoardPosition();

	$(".piece:not(.right)").each(function(){
		placeInside(this);
	});	
}

function placeInside(piece,newpos) {
	var pos;
	var changed = false;
	var $this = $(piece);
	var d = $this.data("puzzle");
	
	if(!newpos) pos = $this.position();
	else pos = newpos;
	
	if(pos.top<-(win.height-boardpos.height)/2+topmargin) {
		pos.top = -(win.height-boardpos.height)/2+topmargin;
		changed = true;
	} else if(pos.top>(win.height-(win.height-boardpos.height)/2)-(d.height)) {
		pos.top = (win.height-(win.height-boardpos.height)/2)-d.height;
		changed = true;
	}
		
	if(pos.left<-(win.width-boardpos.width)/2) {
		pos.left = -(win.width-boardpos.width)/2;
		changed = true;		
	} else if(pos.left>(win.width-(win.width-boardpos.width)/2)-(d.width)) {
		pos.left = (win.width-(win.width-boardpos.width)/2)-d.width;
		changed = true;		
	}
	
	if(pos.left>(win.width-(win.width-boardpos.width)/2)-(d.width)-bottomrightmargin.right && pos.top>(win.height-(win.height-boardpos.height)/2)-(d.height)-bottomrightmargin.bottom) {
		if(win.width<win.height) pos.top = (win.height-(win.height-boardpos.height)/2)-d.height-bottomrightmargin.bottom;
		else pos.left = (win.width-(win.width-boardpos.width)/2)-d.width-bottomrightmargin.right;
		changed = true;	
	}
	
	if(newpos) return pos;
	else if(changed) $this.animate({top:pos.top,left:pos.left},{queue:false,complete:function(){checkPos($this)}});
}

function touchMove(e) {
//	if(e.touches.length<2) {
//		if(!dragged && !down) mouseDown(e);
//		touch = true;
		mouseMove(e);
//	} else {
//		mouseUp(e);
//		dragged = false;				
//	  	gesture = false;		
//	}
//	down = true;
}

function touchCancel(e) {
	updateMouse(e);
	if(!multitouch) mouseUp(e);
//	down = false;
//	mouseUp(e);

	/*
	for(i in e.changedTouches) {
		var t = e.changedTouches[i];
		if(t.identifier && touches[t.identifier]) {
			delete touches[t.identifier];
			if(drags[t.identifier]) delete drags[t.identifier];
		}
	}*/
	
//	console.log(touches);
//	mouseDown(e);
//	gesture = false;
}

function initBoard() {
	$("#help").click(help);
	startTouch()
}

function startTouch() {
	if(inited) return;
	inited = true;

	doc.mousedown(mouseDown);	
	doc.mouseup(mouseUp);	
	doc.mousemove(mouseMove);
	

	if(Modernizr.touch) {
		document.addEventListener('touchstart', mouseDown, false);
		document.addEventListener('touchmove', touchMove, false);
		document.addEventListener('touchcancel', touchCancel, false);
		document.addEventListener('touchend', touchCancel, false);					
	}	
}

function pauseTouch() {
	if(inited) {
		inited = false;
		
		doc.unbind("mousedown");
		doc.unbind("mouseup");
		doc.unbind("mousemove");
	
		if(Modernizr.touch) {
			document.removeEventListener('touchstart',mouseDown,false);
			document.removeEventListener('touchmove',touchMove,false);
			document.removeEventListener('touchcancel',touchCancel,false);
			document.removeEventListener('touchend',touchCancel,false);																										
		}
	}
}

function destroyBoard() {
//	if(inited) {
		inited = false;
		var $doc = $(doc);
		
		$doc.unbind("mousedown");
		$doc.unbind("mouseup");
		$doc.unbind("mousemove");
		
		$("#help").unbind("click").hide();
		clearTimeout(goodTime);
	
		if(Modernizr.touch) {
			document.removeEventListener('touchstart',mouseDown,false);
			document.removeEventListener('touchmove',touchMove,false);
			document.removeEventListener('touchcancel',touchCancel,false);
			document.removeEventListener('touchend',touchCancel,false);
//			document.removeEventListener('gestureend',touchCancel,false);
//			document.removeEventListener('gesturestart',touchCancel,false);
//			document.removeEventListener('gesturechange',touchCancel,false);
//			document.removeEventListener('touchcancel',touchCancel,false);																										
		}
//	}
}

function loadBoard(board) {
	if(!board) {
		console.log("no board to load");
		return;
	}

	$("body").addClass("good");

	startThrobber();
	initBoard();
		
	boardbox.html("");
	boardbox.hide();	
	
	var xml = "./boards/"+board+"/board.xml";
	boardURL = "./boards/"+board+"/"; 
	$.ajax({
		type: "GET",
		url: xml,
		dataType: "xml",
		success: loadedXML
	});
}

function loadedXML(xml) {
	var results = [];
	var board = $(xml);
	var board = board.find('layer');
	for(var i=0;i<board.length;i++) {
		var $this = $(board[i]);
		var pos = $this.attr("position").split(", ");		
		var file = "_"+zeroPad(board.length-i-1,4)+"_"+$this.text();
		file = file.replace(/ /g, '-' );
		var left = (Number(pos[0]) && pos[0]>0) ? pos[0] : pos[0];
		var top = (Number(pos[1]) && pos[1]>0) ? pos[1] : pos[1];
		left++;
		top++;
			
		
		results.push({file:String(file),x:left,y:top,width:Number($this.attr("layerwidth")),height:Number($this.attr("layerheight"))});
	};
	buildBoard(results);	
}


function buildBoard(board) {
	bg = board.shift();
	boardbox.css({
		width: bg.width,
		height: bg.height,
		background: "url("+boardURL+bg.file+") no-repeat"
	});
	getBoardPosition();
	
	loadedPieces = 0;
	totalPieces = board.length;
	
	for(var i=0;i<board.length;i++) {
		var elementID = 'piece_' + i; // Unique ID
		
		$('<canvas>').attr({
		    id: elementID,
		    width: board[i].width,
		    height: board[i].height,
			"class": "piece"		    
		}).css({
		    width: board[i].width + 'px',
		    height: board[i].height + 'px',
		    top: board[i].y,
		    left: board[i].x,
		    zIndex: (i+1)*1000
		}).appendTo('#board');
		
		var $this = $("#"+elementID);
		var d = {};
		d.piece = $this;
		d.tzIndex = (i+1)*10;	
		d.zIndex = (i+1)*1000;
		d.left = Number(board[i].x);
		d.top = Number(board[i].y);	
		d.width = board[i].width;
		d.height = board[i].height;
		d.imageData = [];
								
		var pos = $this.position();
		
		$(this).css("z-index",(i+1)*1000);
	      
     	d.imageObj = new Image();
     	$(d.imageObj).addClass("loading").load(function(e) {
	    	$(this).removeClass("loading");
   		    loadedPieces++;
   		    if(loadedPieces==totalPieces) setTimeout("drawPieces();",10);
   		    
    	});
    	
	    d.imageObj.src = boardURL+board[i].file;//+"?"+escape(new Date());	
		$this.data("puzzle",d);		
			
	}
	pieces = $('.piece');
		
}

function drawPieces() {
	$(document).waitForImages(function(){
		$("canvas.piece").each(function(){
			$this = $(this);
			var d = $this.data("puzzle");  
			console.log(d.imageObj);
			    	
			var canvas = document.getElementById($this.attr("id"));
			var context = canvas.getContext('2d');	    
			context.drawImage(d.imageObj, 0, 0);
			d.imageData = context.getImageData(0, 0, d.width, d.height);	
			$this.data("puzzle",d);				
		});
		
		startBoard();	
	});
}


function zeroPad(num, places) {
  var zero = places - num.toString().length + 1;
  return Array(+(zero > 0 && zero)).join("0") + num;
}

function startThrobber() {
	if(!isThrobbing) {
		throbber.hide().stop().delay(200).fadeIn(500,function(){isThrobbing=true;});

	}
}

function endThrobber() {
	throbber.stop();
	if(isThrobbing) {
		throbber.fadeOut();
		isThrobbing = false;
	} else throbber.hide();
}

function startBoard() {
	isFinished = false;
	endThrobber();
	boardbox.fadeIn();	
	getBoardPosition();
	goodAnimation();
	$("#help").text(t('help')).fadeIn();	
	setTimeout(initBoard, 1500);	
	shuffle();			
}

function shuffle() {
	$(document).waitForImages(function(){
		setTimeout(makeShuffle, 500);
		$(".piece").each(function(){
			var $this = $(this);
			var d = $this.data("puzzle");		
			
			pos = newPos(d);
			$this.delay(700+(Math.random()*800)).animate({top:pos.top,left:pos.left},700);		

		});
	});	

}

function updateMouse(e) {	
	var old = touches;
	
	if(multitouch && e.touches) {  
		var touchlist = e.touches;
		
		touches = {};
//		touches = e.touches;
		if(touchlist[0] && !touchlist[0].identifier) {	
			multitouch = false;
			return updateMouse(e);			
		}
			

		for(i in touchlist) {
			var touchitem = (touchlist.item(i)) ? touchlist.item(i) : e.touches[i];
			
					
			if(touchitem.identifier || touchitem.identifier===0) {
				var id = (touchitem.identifier) ? touchitem.identifier : "touch";
				var id = String(touchitem.identifier);
				var touch = touches[id] = touchitem;
				if(!multitouch) break;
			} else console.log("NO IDENTIFIER");
		}
		 
	} else {
		if(e.pageX || e.clientX || (e.touches[0] && e.touches[0].pageX)) {				
			touches["cursor"] = {};
			touches["cursor"].identifier = "cursor";
			if(e.pageX) {
				touches["cursor"].screenX = touches["cursor"].clientX = touches["cursor"].pageX = e.pageX+$("body").scrollLeft();
				touches["cursor"].screenY = touches["cursor"].clientY = touches["cursor"].pageY = e.pageY+$("body").scrollTop();			
			} else if(e.clientX) {
				touches["cursor"].screenX = touches["cursor"].clientX = touches["cursor"].pageX = e.clientX+$("body").scrollLeft();
				touches["cursor"].screenY = touches["cursor"].clientY = touches["cursor"].pageY = e.clientY+$("body").scrollTop();		
			} else if(e.touches[0].pageX) {
				touches["cursor"].screenX = touches["cursor"].clientX = touches["cursor"].pageX = e.touches[0].pageX;//+$("body").scrollLeft();
				touches["cursor"].screenY = touches["cursor"].clientY = touches["cursor"].pageY = e.touches[0].pageY;//+$("body").scrollTop();						
			}
		}
		
	}
/*
	if(e.touches && e.touches[0].pageX) {
		mouseX = e.touches[0].pageX;
		mouseY = e.touches[0].pageY;
	} else if(e.pageX) {
		mouseX = e.pageX+$("body").scrollLeft();
		mouseY = e.pageY+$("body").scrollTop();			
	} else if(e.clientX) {
		mouseX = e.clientX+$("body").scrollLeft();
		mouseY = e.clientY+$("body").scrollTop();		
	}*/	
	

	for(i in old) {
		if(old[i].identifier) {
			if(!touches[old[i].identifier] && drags[old[i].identifier]) stopDrag(e,old[i].identifier);			
		}		
	}

}

function mouseMove(e) {
	if(dragged) {
		updateMouse(e);		
//		e.preventDefault();	
		for(i in drags) if(touches[i]) {	
			var touch = touches[i];
			var $this = drags[i].piece;
			var offsetX = drags[i].x;
			var offsetY = drags[i].y;			
			var d = $this.data('puzzle');
			var pos = $this.position();	
			var containerOffset = $("#container").offset();
			$this.css({left:touch.pageX-boardpos.left-offsetX-containerOffset.left, top:touch.pageY-boardpos.top-offsetY-containerOffset.top});
		}
	}
	
/*	if(dragged) {
		updateMouse(e);	
		e.preventDefault();		
		var $this = dragged;
		var d = $this.data('puzzle');
		var pos = $this.position();	
		var containerOffset = $("#container").offset();
		$this.css({left:mouseX-boardpos.left-dragOffset.x-containerOffset.left, top:mouseY-boardpos.top-dragOffset.y-containerOffset.top})
	}*/
}

function mouseUp(e) {
	if(!Modernizr.touch) {
		if(!mousepressed) return;
		mousepressed = false;		
	}
	if(!touches.cursor) return;
	delete touches.cursor;
	stopDrag(e,"cursor");

	touchCancel(e);
//	if(drags.length<1) {
//		if(e) e.preventDefault();	
//		fixed = stopDrag();
//		if(!fixed) placeInside(dragged);		
//		dragged = false;
//		touch = false;

//	}
}

function mouseDown(e) {
	if(!soundsLoaded) {
		loadSounds();
		soundsLoaded = true;
		
	}
	if(!Modernizr.touch) {
		if(mousepressed) return;
		mousepressed = true;		
	}
	if(drags.cursor) return;
		
	updateMouse(e);
//	if(dragged || gesture) return false;


	for(ti in touches) {
		if(touches[ti].identifier) {
			var over = getOver(touches[ti]);
			for(var i = 0; i<over.length; i++) {
				var $this = over[i].item;
				var d = $this.data('puzzle');	
				var x = Math.floor(over[i].x);
				var y = Math.floor(over[i].y);		
			
			
				var alpha = d.imageData.data[(((y - 1) * (Math.floor(d.imageData.width) * 4)) + ((x - 1) * 4))+3]; 
				if(alpha>125) {
					e.preventDefault();	
//					dragOffset.x = x;
//					dragOffset.y = y;	
					startDrag($this,touches[ti].identifier,x,y);
					break;
					return;
				}
			}
		}
	}
	

/*	updateMouse(e);
	if(dragged || gesture) return false;
	var over = getOver();

	for(var i = 0; i<over.length; i++) {
		var $this = over[i].item;
		var d = $this.data('puzzle');	
		var x = Math.floor(over[i].x);
		var y = Math.floor(over[i].y);		
		
		
		var alpha = d.imageData.data[(((y - 1) * (Math.floor(d.imageData.width) * 4)) + ((x - 1) * 4))+3]; 
		if(alpha>125) {
			e.preventDefault();	
			dragOffset.x = x;
			dragOffset.y = y;
			dragged = $this;	
			startDrag();
			return;
		}
	}
	
	dragged = false;	*/
}

function getOver(touch) {
	var over = new Array();
	var mx = touch.pageX;
	var my = touch.pageY;	
	
	pieces.each(function(){
		$this = $(this);
		var pos = $this.offset();
		var pw = $this.width();
		var ph = $this.height();		
		var px = pos.left;
		var py = pos.top;//-$("body").scrollTop()
		if(mx>=px && mx<=(px+pw) && my>=py && my<=(py+ph)) {		
			var obj = {};
			obj.item = $this;
			obj.x = mx-px;
			obj.y = my-py;			
			over.push(obj);
		}
	});
	return over.sort(indexSort);
}


function clickPiece(e) {
	var $this = $(e.target);
	var d = $this.data("puzzle");
	topIndex++;
	d.zIndex = topIndex;
	$this.data("puzzle",d);
	$this.css({zIndex:topIndex});
	checkPos($this);
}

function startDrag(piece,identifier,x,y) {
	var $this = piece;
	var d = $this.data("puzzle");
	if(d.dragging) {
		var it = false;
		for(i in drags) {

			if(drags[i].piece && $(drags[i].piece).attr("id")==$this.attr("id")) it=true;
		}
		if(it) {
			return;
		} else {
			console.log("was set to dragging, but didn't exist in object");
		}

	}
//	console.log("starting drag");
	
	dragged = true;
	drags[identifier] = {piece:piece,x:x,y:y};
	
	d.dragging = true;	
	topIndex++;
	d.zIndex = topIndex;
	$this.data("puzzle",d);	
	$this.css({zIndex:topIndex});
	$this.addClass('hover');
	$this.stop().removeClass('right');	
	makePick();	
}

function stopDrag(e,identifier) {
		if(!drags[identifier]) {
			 return
		}

		var $this = drags[identifier].piece;
		if(!$this) return;
		var d = $this.data("puzzle");
		d.dragging = false;
		delete drags[identifier];

		$this.removeClass('hover');	
		$this.data("puzzle",d);	
		fixed = checkPos($this);
		if(!fixed) placeInside($this);
}

function checkPos($this) {
	var d = $this.data('puzzle');
	var pos = $this.position();
	var over = false;
	var overpos = false;
	dropBuffer = eval("dropBuffers."+((touch)?"touch":"mouse")+"."+difficulty);

	if(pos.left>d.left-dropBuffer && pos.left<d.left+dropBuffer && pos.top>d.top-dropBuffer && pos.top<d.top+dropBuffer) {
		$this.css({
			left: d.left,
			top: d.top,
			zIndex: d.tzIndex
		});
		d.zIndex = d.tzIndex;
		$this.data("puzzle",d);
		$this.addClass("right");
		makeRight();

		if($(".piece.right").length==totalPieces) winGame();
		else rightPiece();
		return true;
	} else {
		makeDrop();	
		$this.removeClass("right");	
		return false;
	}

}

function winGame() {
	setTimeout(function(){
		destroyBoard();
		sessionStorage.setItem(hash,true);
		$("body").addClass("done");
		makeWin();
		$("#info").addClass("win").html("<h1>"+t("doneTitle")+"</h1><p>"+t("doneDescription")+"</p><a href='#' class='button positive'>"+t("yes")+"</a><a href='#' class='button negative'>"+t("no")+"</a>").fadeIn();

		$("#info .positive").click(function(e){
			makeClick();
			$("#info a").unbind("click");
			$("#info").empty().hide();
			window.location.hash = "";

		});
		
		$("#info .negative").click(function(e){	
			makeClick();
			e.preventDefault();			
			$("#info a").unbind("click");
			$("#info").empty().hide();
/*
			setTimeout(function(){
				gotoPage(hash);
			},500);*/
		});
	
		isFinished = true;
		finishPuzzle(difficulty);

	
//	alert("Du klarte det!");
//	loadBoard("medium/1");
	},200);
	
}

function help(e) {
		pauseTouch();
		makeClick();
		$("body").addClass("help");
		$("#help").css("opacity",0);
		$("#info").html("<h1>"+t("helpTitle")+"</h1><p>"+t("helpDescription")+"</p><a href='#' class='button positive'>"+t("yes")+"</a><a href='#' class='button negative'>"+t("no")+"</a>").fadeIn();
		$("#info .positive").click(function(e){
			
			makeClick();
			var $this = $(".piece:not(.right):eq(0)");
			var d = $this.data("puzzle");
			topIndex++;
			$this.css({zIndex:topIndex});

			$this.addClass("right").animate({top:d.top,left:d.left},{queue:false,complete:function(){
					checkPos($this)
				}
			});
			e.preventDefault();			
			$("#info a").unbind("click");
			$("#info").empty().hide();
			$("body").removeClass("help");			
			goodAnimation();
			gotHelp(difficulty);
			startTouch();
			return false;
		});
		
		$("#info .negative").click(function(e){	
			makeClick()
			e.preventDefault();			
			$("#info a").unbind("click");
			$("#info").empty().hide();
			$("body").removeClass("help");	
			goodAnimation();
			startTouch();					
			return false;			
		});
	
	e.preventDefault();			
	return false;
}

function newPos(d) {
	var side = Math.floor(Math.random()*2);
	var bredde = (win.width<win.height) ? true : false;

	var left = 0;
	var top = 0;
	var width = win.width;
	var height = win.height;	
	if(bredde) {
		height = ((height-boardpos.height)/2)-d.height;
		if(height<0) height = 0;
		if(side==1) top = win.height-height-d.height;		
	} else {
		width = ((width-boardpos.width)/2)-d.width;
		if(width<0) width = 0;
		if(side==1) left = win.width-width-d.width;		
	}

	var pos = randPos(d,left,top,width,height);
	placeInside(d.piece,pos);

	return pos;

}

function randPos(d,left,top,width,height){
	if(!left) left =  0;
	if(!top) top =  0;
	if(!width && width!==0) width = win.width;
	if(!height && height!==0) height = win.height;		

	var pos = {};
	var ww = width;
	var wh = height;	
	
	pos.left = (Math.random()*ww)-(boardpos.left)+left;
	pos.top  = (Math.random()*wh)-(boardpos.top)+top;	
	return pos;
}


function indexSort(a,b) {
	var da = a.item.data("puzzle");
	var db = b.item.data("puzzle");	
	return (db.zIndex-da.zIndex);
}

function getBoardPosition() {
	if(!boardpos) boardpos = {};
	boardpos.width = boardbox.width();
	boardpos.height = boardbox.height();	
	
	boardpos.left = (win.width/2)-(boardpos.width/2);
	boardpos.top = (win.height/2)-(boardpos.height/2);	
	
	boardbox.css({top:boardpos.top,left:boardpos.left});
	
}

function UrlExists(url)
{
    var http = new XMLHttpRequest();
	    http.open('HEAD', url, false);
    	http.send();    	
    return http.status!=404;
}

var goodTime;
function rightPiece() {
	goodAnimation();
}

function goodAnimation() {
	clearTimeout(goodTime);
	$("body").addClass("good");
	$("#help").css("opacity",0);	
	goodTime = setTimeout(function(){
		$("body").removeClass("good");
		$("#help").css("opacity",1);	
	},10000);
}


function loadSounds() {
	clicksound = new buzz.sound( "sounds/click", {
		preload: true,
		autoplay: false,
		loop: false,
		formats: ["m4a", "mp3", "wav", "ogg"]
	});
	

	
	shufflesound = new buzz.sound( "sounds/shuffle", {
		preload: true,
		autoplay: false,
		loop: false,
		formats: ["m4a", "mp3", "wav", "ogg"]
	});
	
/*	
	picksound = new buzz.sound( "sounds/pick", {
		preload: true,
		autoplay: false,
		loop: false,
		formats: ["m4a", "mp3", "wav", "ogg"]
	});
*/	
	
	dropsound = new buzz.sound( "sounds/drop", {
		preload: true,
		autoplay: false,
		loop: false,
		formats: ["m4a", "mp3", "wav", "ogg"]
	});

	
	rightsound = new buzz.sound( "sounds/right", {
		preload: true,
		autoplay: false,
		loop: false,
		formats: ["m4a", "mp3", "wav", "ogg"]
	}); 	

	winsound = new buzz.sound( "sounds/win", {
		preload: true,
		autoplay: false,
		loop: false,
		formats: ["m4a", "mp3", "wav", "ogg"]
	}); 		
}	

function makeClick() {	
	if(muted) return;
	clicksound.stop();
	clicksound = new buzz.sound( "sounds/click", {
		autoplay: true,
		loop: false,
		formats: ["m4a", "mp3", "wav", "ogg"]
	});
		clicksound.bind("ended", function(e) {
		clicksound.setVolume(0);
    	clicksound.stop();
    });
	clicksound.play();
}




function makeShuffle() {
	if(muted) return;
	shufflesound = new buzz.sound( "sounds/shuffle", {
		preload: true,
		autoplay: true,
		loop: false,
		formats: ["m4a", "mp3", "wav", "ogg"]
	});
	
//	shufflesound.setTime(0);
	shufflesound.play();	
}


 		

function makePick() {
/*	if(muted) return;
	picksound.setTime(0);
	picksound.play();	*/
}



function makeDrop() {
	if(muted) return;
//	dropsound.setTime(0);
	dropsound.play();	
}



    		
function makeRight() {	
	if(muted) return;
//	rightsound.setTime(0);
	rightsound.play();	
}

function makeWin() {	
	if(muted) return;
//	winsound.setTime(0);
	winsound.play();	
}


var musicStarted = false;

function startMusic() {
	if(musicStarted) return;
	if(music) music.stop();

	music = new buzz.sound( "sounds/music", {
		loop: false,
		autoplay: true,
    	formats: ["m4a", "mp3", "wav", "ogg"]
	});

	music.bind("play", function(e) {
    	musicStarted = true;
    });

	
	music.play();
	
}

function hiddenApp() {
	if(music) music.mute();
}

function shownApp() {
	if(music && !muted) music.unmute();
}

var muted = false;
function mute() {
	muted = true;
	music.mute();
	music.stop();
	$("#music").addClass("off").removeClass("on");	
}

function unmute() {
	muted = false;
	music.unmute();
	$("#music").addClass("on").removeClass("off");			
}
/*
function scale($this,width,height) {
 	var w = $this.width();
 	var h = $this.height();
 	
 	var scale = (w/width>h/height) ? w/width : w/width;

	$this.css({
		"transform", "scale("+scale+","+scale+")",
		"-ms-transform", "scale("+scale+","+scale+")",
		"-webkit-transform", "scale("+scale+","+scale+")",
		"-o-transform", "scale("+scale+","+scale+")",
		"-moz-transform", "scale("+scale+","+scale+")"
	});
	
	return $this;
}

*/


$.fn.extend({ 
        disableSelection : function() { 
                this.each(function() { 
                        this.onselectstart = function() { return false; }; 
                        this.unselectable = "on"; 
                        $(this).css('-moz-user-select', 'none'); 
                        $(this).css('-webkit-user-select', 'none'); 
                }); 
        } 
});