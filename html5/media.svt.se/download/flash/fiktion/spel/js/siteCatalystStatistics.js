var catalyststat = {};


catalyststat = {

	logstat: function (o) {

		if (!o || !o.game) {
			return false;
		}

		var analytics = window['svtlib-statistics'];

		//defaults
		o.category = o.category || barn;
		o.section = o.section || bolibompa;

		var gameName = this._normalize(o.game);
        var section = this._normalize(o.section);

		analytics.pageName = "svt.se:barnkanalen:spel:"+gameName;

		analytics.channel = o.category;
		analytics.prop2 = o.navlevel2;
		analytics.prop3 = o.navlevel3;
		analytics.prop7 = o.category;
		analytics.prop8 = this._getPageUrl();
		analytics.prop9 = "svt.se";
		analytics.prop10 = this._getBrowserSize();
		
		analytics.contextData = {
           'svt_domain': 'svt.se',
           'svt_level1': 'barnkanalen',
           'svt_level2': 'spel',
           'svt_level3': gameName
          }

		analytics.t();
		
	},

	_getPageUrl: function () {
		var pageUrl = $(location).attr('href');
		if (pageUrl) {
			pageUrl = (pageUrl.lastIndexOf('/') == pageUrl.length - 1) ? pageUrl.substring(pageUrl.lastIndexOf('/'), 0) : pageUrl;
		}
		return pageUrl;
	},

	_getBrowserSize: function () {
		var browserWidth = $(window).width(),
			browserWidthMode = 'xsmall';

		if (browserWidth > 600 && browserWidth <= 800) {
			browserWidthMode = 'small';
		} else if (browserWidth > 800 && browserWidth <= 1024) {
			browserWidthMode = 'medium';
		} else if (browserWidth > 1024 && browserWidth <= 1824) {
			browserWidthMode = 'large';
		} else if (browserWidth > 1824) {
			browserWidthMode = 'xlarge';
		}

		return browserWidthMode;
	},

	 _normalize: function (input) {
     	try {
            var output = input;
            output = output.toLowerCase();
            output = output.replace(/ä|å/g, 'a');
            output = output.replace(/ö/g, 'o');
            output = output.replace(/ú|ü/g, 'u');
            output = output.replace(/é/g, 'e');
            output = output.replace(/&/g, 'och');
            output = output.replace('\"', '').replace('\'', '').replace('\`', '');
            output = output.trim().replace(/ /g, '-');

            //console.log(output);
            return output;
        } catch(e) {
        	console.error('statisticsUtil-normalize-Error: ', e);
        }  
    }

   

}