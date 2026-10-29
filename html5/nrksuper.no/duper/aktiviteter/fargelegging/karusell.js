
var svt = svt || {};

svt.core = svt.core || {};
svt.core.Constants = {
	MOUSE_KEY_LEFT: 1,
	ANIMATION_PRE_LOADING_TIME: 300,
	ANIMATION_MIN_LOADING_TIME: 0,
	ANIMATION_DURATION: 250,
	ANIMATION_HIGHLIGHT_DURATION: 500,
	LOADER_DELAY: 1000,
	DBLCLICK_DELAY: 250,
	LAZYLOAD_OFFSET: 700,
	OPACITY_FADE_OUT: 0.1,
	OPACITY_FADE_IN: 1,
	UI_EFFECT_FADE_OUT: 'easeInOutCubic',
	UI_EFFECT_FADE_IN: 'easeInCubic',
	UI_EFFECT_FADE_INOUT: 'easeInOutCubic',
	MQ_S: 600
};

var Class = Class || {};

Class.extend = function(prop, extend){
	var superObj = {}, prototypeObj = {};
	var superPrototype = extend ? extend.prototype : {};
	
	var returnClass = function(){
		if(this._super._setSub){
			this._super._setSub(this);
		}
		if(this.init){
			this.init.apply(this, arguments);
		}
	}
	
	for(var name in prop){
		prototypeObj[name] = prop[name];
	}
	
	for(var name in superPrototype){
		if(prototypeObj[name] == undefined){
			prototypeObj[name] = superPrototype[name];
		}
		superObj[name] = superPrototype[name];
	}
	
	prototypeObj._super = superObj;
	
	//add a function for recursive setting of sub instance 
	prototypeObj._setSub = function(sub){
		this._sub = sub;
		if(this._super._setSub){
			this._super._setSub(sub._super);
		}
	}
	
	returnClass.constructor = returnClass;
	returnClass.prototype = prototypeObj;
	
	//add a static extend to the current class  
	returnClass.extend = function(prop){
		return Class.extend.call(this, prop, returnClass);
	}
	
	return returnClass;
};

/**
 * Lazy Load
 * Loading all the images upfront is expensive business, so only the
 * first element is rendered at page load. Means the other images
 * have to be loaded now, and they should be present as standard-
 * issue <span> tags with the class svtJsLazyLoadedImage.
 */

svt.core.LazyLoad = {

	options: {
		//effect: 'show',
		//effectSpeed: 200,
		attributeSrc   : 'src',
		attributeAlt   : 'alt',
		attributeClass : 'class',
		cssClass       : 'svtJsLazyLoadedImage',
		template       : 'svtLazyLoadedImage',
		defaultAlt     : '',
		defaultClass   : '',
		defaultTitle   : ''
	},

	/**
	 * Static method to lazy-load images.
	 * Use: svt.core.LazyLoad.init($container, options); // Where options are optional
	 * Example: svt.core.LazyLoad.init($('.svtCarousel'))
	 *
	 * @param {object} $container In which elements should we look for elements to lazy-load
	 * @param {object} options Optional settings
	 */
	init: function ($container, options) {
		var self = this;
		this.options = $.extend(true, this.options, options);

		$container.find('.' + this.options.cssClass).each(function () {
			var imgData = {
				src: $(this).data(self.options.attributeSrc),
				alt: $(this).data(self.options.attributeAlt) || self.options.defaultAlt,
				title: $(this).attr('title') || self.options.defaultTitle, // Using the real title attribute instead of data has to be more SEO friendly?
				cssClass: $(this).data(self.options.attributeClass) || self.options.defaultClass
			};

			// plug the data into the jqote template
			var img = '<img class="' + imgData.cssClass + '" src="' + imgData.src + '" alt="' + imgData.alt + '" title="' + imgData.title + '" />';

			// show the figcaption if there is one
			// This is for backwards compatibility but should be removed
			var svtFigure = $(this).parent().parent().parent();
			if (svtFigure.attr('class') && svtFigure.attr('class').indexOf('svtFigure') != -1) {
				svtFigure.find('.svtFigcaption').removeClass('svtXDisplayNone');
			}
			// ...and replace the div
			$(this).replaceWith($(img));
		});
	}
};

svt.util = svt.util || {};
svt.util.Animation = {

	transitionExpandClass: 'svtTransitionTarget-100w',
	transitionHightlightClass: 'svtTransitionTarget-highlight',
	highlightColor: '#FFFFCC',
	bgcolor: '#FFFFFF',
	_highlightTimer: undefined,


	expand: function ($animationNode) {
		var width = '100%';
		/* The browser supports CSS Transform */
		if (Modernizr.csstransitions) {
			$animationNode.addClass(this.transitionExpandClass);
			/* Non-transform fallback */
		} else {
			this.animateWidth($animationNode, width, function () {
				$animationNode.addClass(this.transitionExpandClass);
			});
		}
	},

	contract: function ($animationNode, width) {

		if (width === undefined) {
			width = '35%';
		}

		/* The browser supports CSS Transform */
		if (Modernizr.csstransitions) {
			$animationNode.removeClass(this.transitionExpandClass);
		} else {
			$animationNode.removeClass(this.transitionExpandClass);
			this.animateWidth($animationNode, width);
		}
	},


	animateWidth: function ($animationNode, width, theCallback) {

		if (theCallback === undefined) {
			theCallback = null;
		}

		$animationNode.animate({
			width: width
		}, svt.core.Constants.ANIMATION_DURATION, theCallback);
	},

	scrollTo: function ($scrollToNode, hideBody, duration, callback) {
		if (hideBody) {
			$('body').css('visibility', 'hidden');
		}
		if (!duration) {
			duration = svt.core.Constants.ANIMATION_DURATION;
		}

		$('html,body').animate({
			scrollTop: $scrollToNode.offset().top - 10
		}, duration, function () {
			// Animation complete.
			$('body').removeAttr('style');
			// If a callback function has been set then activate the callback
			if (callback) {
				callback();
			}

		});
	},


	svtFadeIn: function ($animationNode) {
		$animationNode.fadeIn(svt.core.Constants.ANIMATION_DURATION);
	},

	svtHighlight: function ($animationNode) {
		var self = this;
		// TODO: Do transition when supported transition.
		$animationNode.css({
			backgroundColor: self.highlightColor
		}).animate({
			backgroundColor: self.bgcolor
		}, svt.core.Constants.ANIMATION_HIGHLIGHT_DURATION, function () {
			$animationNode.removeAttr('style');
		});
	},

	windowLightsOut: function () {
		$(window).animate({
			opacity: svt.core.Constants.OPACITY_FADE_OUT
		}, svt.core.Constants.ANIMATION_DURATION);
	}

};

svt.barn = svt.barn || {};
svt.barn.MultiCarousel = Class.extend({
	_animating: false,              // avoid double clicks
	_options: undefined,
	_itemsPerMove: undefined,       // items to move per click/swipe - percent vs a constant
	_itemsTotal: undefined,
	_itemsFit: undefined,
	_current: undefined,
	_rotateData: undefined,
	_moveCounter: 0,

	_viewportWidth: undefined, // wrapper
	_visibleWidth: undefined,
	_itemWidth: undefined,
	_sliderWidth: undefined,
	_maxMargin: undefined, // For infinite=false carousels

	_touchStartX: null,
	_touchStartY: null,
	_touchCurrentX: null,
	_touchCurrentY: null,

	_cssTransition: undefined,
	_vP: undefined,
	_transitionEnd: undefined,
	_transform: undefined,

	$_wrapper: undefined,
	$_carousel: undefined,
	$_slider: undefined,
	$_items: undefined,
	$_nav: undefined,
	$_viewport: undefined,

	Direction: {
		LEFT: 'Left',
		RIGHT: 'Right'
	},

	CSS: {
		item: 'svtJsMultiCarouselItem',
		nav: 'svtJsMultiCarouselNav',
		navItem: 'svtJsMultiCarouselNavItem',
		navItemInactive: 'inactive',
		slider: 'svtJsMultiCarouselSlider',
		transition: 'svtTransition',
		viewport: 'svtJsMultiCarouselViewport',
		active: 'active'
	},

	_defaults: {
		speed       : svt.core.Constants.ANIMATION_DURATION * 2, // animation speed
		easing      : 'linear'//svt.core.Constants.UI_EFFECT_FADE_INOUT, // easing effect
		,minItems    : 1, // min number of items to show
		current     : 0, // index of current item
		itemWidth   : 110,
		border      : 0,
		margin      : 0,
		randClasses : undefined,
		infinite    : false
	},

	_tmpCounter : 0,

	/**
	 * @constructor
	 * @param {string} container Javascript-element to use as $container
	 * @param {object} options Optional settings
	 */
	init: function (container, options) {
		this._options = $.extend(true, {}, this._defaults, options);

		this.$_nav =  {
			left: undefined,
			right: undefined
		};

		this._cssTransition = Modernizr.csstransitions;
		this.$_carousel = $(container);
		
		this.$_slider = this.$_carousel.find('.' + this.CSS.slider + ':first');

		this.$_wrapper = this.$_carousel.parent();
		this.$_viewport = this.$_carousel.find('.' + this.CSS.viewport + ':first');
		if (!this.$_viewport || this.$_viewport.length < 1) {
			this.$_viewport = this.$_carousel; // Backwards compatiblity
		}
		this._refreshValues();
		this._setup();
		this._setupNavigation();
		this._bindEvents();
		this._lazyLoadImages(true);
	},

	/**
	 * Lazy load images
	 */
	_lazyLoadImages: function (initial, direction) {
		var $loadUs = {};
		if (initial == true) {
			// Load first one.
			try {
				svt.core.LazyLoad.init(this.$_items.first());
			} catch (err1) {
				//Handle errors here
			}
		} else {
			try {
				svt.core.LazyLoad.init(this.$_items);
			} catch (err2) {
				//Handle errors here
			}
		}
	},

	/**
	 * Set up browser specific variables
	 */
	_setBrowserVars: function () {
		if ($.browser.webkit) {
			this._vP = "-webkit-";
			this._transitionEnd = "webkitTransitionEnd";
		} else if ($.browser.msie) {
			this._vP = "-ms-";
			this._transitionEnd = "msTransitionEnd";
		} else if ($.browser.mozilla) {
			this._vP = "-moz-";
			this._transitionEnd = "transitionend";
		} else if ($.browser.opera) {
			this._vP = "-o-";
			this._transitionEnd = "oTransitionEnd";
		}
		this._transform = this._vP + "transform";
	},

	/**
	 * Toggle transition-class to $container, to be able to disable/enable CSS-animations
	 * @param {boolean} enable Optional parameter to explicitly enable/disable transitions.
	 */
	_toggleTransition: function (enable) {
		if (this._cssTransition) {
			if (enable == true) {
				this.$_carousel.addClass(this.CSS.transition);
			} else if (enable == false) {
				this.$_carousel.removeClass(this.CSS.transition);
			} else {
				this.$_carousel.toggleClass(this.CSS.transition);
			}
		}
	},

	/**
	 * Refresh values, used everytime the items are manipulated in width, amount etc.
	 */
	_refreshValues: function () {
		this.$_slider = this.$_carousel.find('.' + this.CSS.slider + ':first');
		this.$_items = this.$_carousel.find('.' + this.CSS.slider + ':first ' + '.' + this.CSS.item);
		this._visibleWidth = this.$_viewport.width();
		this._itemsTotal = this.$_items.length;
		this._refreshResizeValues();
	},

	/**
	 * Refresh resize values, used on window resize etc
	 */
	_refreshResizeValues: function () {
		this._itemWidth = this._options.itemWidth;
		this._viewportWidth = this.$_viewport.width();
		
		this._itemsFit = Math.floor(this._viewportWidth / this._itemWidth);
		this._maxMargin = -((this.$_items.length * this._itemWidth) - this._visibleWidth); // this._maxMargin is only used when infinite=false
		this._refreshSliderWidth();
	},

	/**
	 * Refresh slider width, used on window resize etc
	 */
	_refreshSliderWidth: function () {
		this._sliderWidth = (this._itemWidth * this._itemsTotal);
		this.$_slider.css({
			width: this._sliderWidth
		});
	},

	/**
	 * Setup run once upon initialization.
	 */
	_setup: function () {
		this._setBrowserVars();
		this._addRandClasses(); // hehe
		this._current = this._options.current;

		// test to see if we need to initially resize the items
		var itemsOccupyMinWidth = this._options.minItems * (this._options.itemWidth + 2 * this._options.border) + (this._options.minItems - 1) * this._options.margin;

		if (this._visibleWidth < itemsOccupyMinWidth) {
			var newDimension = (this._viewportWidth - (this._options.minItems - 1) * this._options.margin) / this._options.minItems;
			this._setDimensions(newDimension);
			this._refreshResizeValues();

			this._itemsFit = this._options.minItems;
		} else {
			this._setDimensions();
			this._refreshResizeValues();
			this._moveElements();
		}
		this._refreshResizeValues();

		//this._refreshAndRotateImages(); // See method-comments

		var initialScrollValue = this._getStartMoveWidth();

		//this._move: function (direction, value, animate, callback) {
		this._move(this.Direction.RIGHT, initialScrollValue, false, false);
	},

	_addRandClasses: function () {
		var self = this;
		var rand;
		if (self._options.randClasses) {
			this.$_items.each(function (index) {
				rand = Math.floor(Math.random() * self._options.randClasses.length);
				$(this).addClass(self._options.randClasses[rand]);
			});
		}

	},

	/**
	 * It would be nice to rotate the images as if they were hanging on a rope, but in didnt manage to get this smooth.
	 * Saving the code though.
	 */
	 /*
	_refreshAndRotateImages: function () {
		var imagesToShow = this._itemsFit + 2;
		var maxRotation = 6;
		var paddingStep = 15;
		var currentPadding = 0;
		var rotate = 0;
		var result = [];
		var moreThanHalf = false;
		var halfway = imagesToShow/2;

		for (var i = 0; i < imagesToShow; i++) {
			if (i+1 < halfway && i+1 > halfway)  {
				currentPadding = currentPadding + paddingStep;
				rotate = 0;
			} else if (i+1 < halfway || i+1 == halfway) {
				currentPadding = currentPadding + paddingStep;
				rotate = maxRotation;
			} else {
				if (i != halfway) {
					currentPadding = currentPadding - paddingStep;
				}
				rotate = -maxRotation;
			}

			result[i] = {'padding-top': currentPadding + 'px'};
			//result[i] = {rotate: rotate, 'padding-top': currentPadding};
		}
		this._rotateData = result;
		this._rotateImages();
	},

	_rotateImages: function () {
		rotateData = this._rotateData;
		console.log('rotateData.length: ' + rotateData.length);
		console.log('this.$_items.length: ' + this.$_items[0]);
		for (var i = 0; i < rotateData.length; i++) {
			console.log(rotateData[i]);
			this.$_items.parent().find('.' + this.CSS.item + ':eq(' + i + ')').animate(rotateData[i], (this._defaults.speed / 2));
		}
	},
	*/

	_getStartMoveWidth: function () {
		var amount;
		if (this._options.infinite == true) {
			var visibleItemsWidth = this._itemsFit * this._itemWidth;
			amount = -(this._itemWidth - Math.abs((this._viewportWidth - visibleItemsWidth) / 2));
		} else {
			amount = 0;
		}
		return amount;
	},

	_moveElements: function () {
		if (this._options.infinite == true) {
			var tmp = Math.floor(this._itemsTotal / this._itemsFit);
			if (tmp > 0) {
				var lastElement = this.$_items.last().clone();
				this.$_slider.prepend(lastElement);
			}
			this._refreshValues();
		}
	},

	_setDimensions: function (width) {
		this.$_items.css({
			marginRight: this._options.margin,
			width: width || this._options.itemWidth + 2 * this._options.border
		}).children('a').css({
			borderWidth: this._options.border
		});
	},

	/**
	 * Setup navigation. Check if a navigation is needed (enough items?) and
	 * add if so. If there already is a navigation that should be removed (because of window
	 * resize) - do so!
	 */
	_setupNavigation: function () {
		if ((this.$_items.length > this._itemsFit) && this.$_nav.right == undefined) {
			this._addNavigation();
			this._toggleTransition(true);
		} else {
			if ((this.$_items.length <= this._itemsFit) && this.$_nav.right !== undefined) {
				this._removeNavigation();
			}
		}
		this._checkNavigation();
	},

	/**
	 * Add navigation
	 * @private
	 */
	_addNavigation: function () {
		this.$_nav.right = $('<a href="#" class="' + this.CSS.navItem + ' right"></a>');
		this.$_nav.left = $('<a href="#" class="' + this.CSS.navItem + ' left"></a>');
		this.$_carousel
			.append(this.$_nav.right)
			.append(this.$_nav.left);
	},

	/**
	 * Remove navigation
	 * @private
	 */
	_removeNavigation: function () {
		this.$_nav.left.remove();
		this.$_nav.right.remove();
	},

	/**
	 * Check navigation, if we should disable/enable arrows.
	 * This method should only be used when this._options.infinite == true
	 * @private
	 */
	_checkNavigation: function (currentMargin) {
		if (this._options.infinite === false) {

			// Make sure arrows exist
			if (this.$_nav.left && this.$_nav.right) {
				// marginValue is set
				if (!currentMargin && currentMargin !== 0) {
					currentMargin = parseInt(this.$_slider.css('marginLeft'), 10);
				}

				if (currentMargin === 0) {
					// You shouldnt go more left
					this.$_nav.left.addClass(this.CSS.navItemInactive);
				} else if (currentMargin === this._maxMargin) {
					// You shouldnt go more right
					this.$_nav.right.addClass(this.CSS.navItemInactive);
				}

				if (currentMargin < 0) {
					this.$_nav.left.removeClass(this.CSS.navItemInactive);
				}

				if (currentMargin > this._maxMargin) {
					this.$_nav.right.removeClass(this.CSS.navItemInactive);
				}
			}
		}
	},

	/**
	 * Show/hide navigation
	 * Not in use, since the carousel is always infinite as it is written now.
	 */
	/*
	_toggleNavigation: function (status, direction) {
		if (status && direction) {
			if (status == 1) {
				(direction == this.Direction.LEFT) ? this.$_nav.left.show() : this.$_nav.right.show()
			} else {
				(direction == this.Direction.RIGHT) ? this.$_nav.left.hide() : this.$_nav.right.hide()
			}
		} else if (status) {
			if (status == 1) {
				this.$_nav.left.show();
				this.$_nav.right.show();
			} else if (status == 0) {
				this.$_nav.left.hide();
				this.$_nav.right.hide();
			}
		}
	},
	*/

	/**
	 * Method to move carousel left. Used by the bind-method and the touchBind-method
	 */
	_moveLeft: function () {
		var self = this;
		if (this._options.infinite == true) {
			self._refreshValues();
			var startSlice = self.$_items.length - (self._itemsFit + 1);
			var endSlice = self.$_items.length - 1;
			var moveUs = self.$_items.slice(startSlice, endSlice).clone();

			try {
				svt.core.LazyLoad.init(moveUs);
			} catch (err1) {
				//Handle errors here
			}

			self.$_slider.prepend(moveUs);
			// self._rotateImages(); // See method-comments
			self._move(self.Direction.RIGHT, undefined, false);
			self._move(self.Direction.LEFT, undefined, true, function () {
				self.$_slider.find("li:gt(" + (self.$_items.length - (self._itemsFit + 1)) + ")").remove();
				self._defaultCallback();
			});
			self._refreshValues();
		} else {
			self._move(self.Direction.LEFT);
		}
	},

	/**
	 * Method to move carousel right. Used by the bind-method and the touchBind-method
	 */
	_moveRight: function () {
		var self = this;

		if (this._options.infinite == true) {
			self._refreshValues();
			var startSlice = self.$_items.length - (self._itemsFit + 1);
			var endSlice = self.$_items.length - 1;
			var moveUs = self.$_items.slice(1, (self._itemsFit + 1)).clone();
			self.$_slider.append(moveUs);
			self._move(self.Direction.RIGHT, undefined, true, function () {
				self.$_slider.find("li:lt(" + self._itemsFit + ")").remove();
				self._defaultCallback();
				self._move(self.Direction.LEFT, self._getStartMoveWidth(), false);
			});
			self._refreshValues();
		} else {
			self._move(self.Direction.RIGHT);
		}
	},

	/**
	 * Bind events onload
	 */
	_bindEvents: function () {
		var self = this;

		if (this.$_nav.left && this.$_nav.right) {
			this.$_nav.left.bind('click.multicarousel', function (e) {
				
				e.preventDefault();
				self._moveLeft();
			});
			this.$_nav.right.bind('click.multicarousel', function (e) {
				e.preventDefault();
				self._moveRight();
			});
		}

		if (Modernizr.touch) {
			this._bindTouchEvents();
		}

		$(window).bind('resize.multicarousel', function (e) {
			self._refreshValues();
			clearTimeout(self.resetTimeout);
			self.resetTimeout = setTimeout(function () {
				if (self._options.infinite == true) {
					self._moveToCurrent(true, self._setupNavigation());
				} else {
					self._setupNavigation();
				}
			}, 200);
		});
	},

	/**
	 * Bind touch navigation
	 */
	_bindTouchEvents: function () {
		var self = this;
		var sensitivity = 100;
		this.$_slider.bind('touchstart', function (e) {
			var originalEvent = e.originalEvent;
			self._touchStartX = originalEvent.targetTouches[0].pageX;
		});

		this.$_slider.bind('touchmove', function (e) {
			var originalEvent = e.originalEvent;
			self._touchCurrentX = originalEvent.targetTouches[0].pageX;
		});

		this.$_slider.bind('touchend', function (e) {
			if (!self._touchStartX || !self._touchCurrentX) {
				self._resetTouch();
				return;
			}

			if (self._touchCurrentX > (self._touchStartX + sensitivity)) {
				e.preventDefault();
				self._moveLeft();
			} else if (self._touchCurrentX < (self._touchStartX - sensitivity)) {
				e.preventDefault();
				self._moveRight();
			}
			self._resetTouch();
		});
	},

	/**
	 * Helper-method to reset touch properties
	 */
	_resetTouch: function () {
		this._touchStartX = null;
		this._touchStartY = null;
		this._touchCurrentX = null;
		this._touchCurrentY = null;
	},

	_move: function (direction, value, animate, callback) {
		if (this._moveCounter > 0) {
			this._lazyLoadImages(false);
		}
		this._moveCounter++;
		var self = this;
		// If animate is undefined, it should default to true, otherwise use its input value
		
		animate = (animate === undefined) ? true : animate;
		
		// Avoid double clicks
		if (this._isAnimating() === true) {
			return false;
		}

		var currentMarginLeft = parseFloat(this.$_slider.css('margin-left'));

		// value is undefined unless you want an exact location
		if (value === undefined) {
			
			var amount = Math.abs(this._itemsFit * this._itemWidth);
			
			
			// If everything fails
			if (amount < 0) {
				return false;
			}

			var currentMargin = parseInt(this.$_slider.css('marginLeft'), 10); // 10 is radix parameter for jslint
			if (direction == this.Direction.RIGHT) {
				value = currentMargin - amount;
			} else {
				value = currentMargin + amount;
			}

			// If its not infinite, we should not go above 0 when going LEFT and not above (totalWidth-
			if (this._options.infinite != true) {
				if (value > 0) {
					value = 0;
				} else if (value < this._maxMargin) {
					value = this._maxMargin;
				}
				this._checkNavigation(value);
			}
		} else {
			var futureMarginLeft = Math.abs(value);
			
			
			if (Math.max(this._sliderWidth, this._visibleWidth) - futureMarginLeft < this._visibleWidth) {
				value = -(Math.max(this._sliderWidth, this._visibleWidth) - this._visibleWidth);
				if (value !== 0) {
					value += this._options.margin;
				}
				futureMarginLeft = Math.abs(value);
			}
		}

		if (animate === true) {
			this._setAnimating(true);
		}

		var sliderCSS = { marginLeft : value };
/*
		if (this._cssTransition) {
			this.$_carousel.bind(self._transitionEnd, function () {
				self.$_carousel.unbind(self._transitionEnd);
				if ($.isFunction(callback)) {
					callback.call();
				} else {
					self._defaultCallback(self);
				}
			});
			this.$_slider.css(sliderCSS);

		} else {
*/
		$.fn.applyStyle = (animate == true) ? $.fn.animate : $.fn.css;
		this.$_slider.applyStyle(sliderCSS, $.extend(true, [], {
			duration: this._options.speed,
			easing: this._options.easing,
			complete: function () {
				if ($.isFunction(callback)) {
					callback.call();
				} else {
					self._defaultCallback(self);
				}
			}
		}));
/*
		}
*/
	},

	/**
	 * Default callback method if no other is specified
	 * @param {object} self Current scope
	 */
	_defaultCallback: function (self) {
		self = (self === undefined) ? this : self;
		self._setAnimating(false);
	},

	/**
	 * Move to start current, used on window resize
	 * @param {boolean} animate
	 */
	_moveToCurrent: function (animate, callback) {
		var amount = this._getStartMoveWidth();
		this._move('', amount, animate, callback);
	},

	/**
	 * Move to start current, used on window resize
	 * @param {boolean} value
	 */
	_setAnimating: function (value) {
		this._animating = value;
	},

	_getAnimating: function () {
		return this._animating;
	},

	_isAnimating: function () {
		/*if (this._getAnimating() == true) {
			return true;
		}
		return false;*/
		return this._getAnimating();
	}

});
