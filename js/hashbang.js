// Hashbang 1.3.0

// Copyright (c) 2013 Kevin Pancake
// Hashbang may be freely distributed under the MIT license.


(function (root) {
	"use strict";

	// Setup
	// -----

	var document = root.document,
		location = root.location;

	// Top-level namespace.
	var HB = root.HB = {

		// Current version.
		version: "1.3.0",

		// REST API endpoint.
		endpoint: "api/:handle",

		// This holds all the requested collections.
		collections: {},

		// Turn off `cache` to disable the use of cached collections.
		cache: true,

		// Call this to fire up Hashbang.
		main: function (home, target) {
			this.home = home || document.getElementsByTagName("a")[0].hash;
			this.target = target || document.querySelector("[data-role=target]");

			this.title = {
				text: document.title,
				spec: document.getElementsByTagName("title")[0].dataset.spec
			};

			this.router = new Router();
			this.router.match();
		}
	};

	// HB.Template
	// -----------

	// 
	var Template = HB.Template = function (type) {
		this.type = type;

		if (Template.templates[this.type] === undefined) {
			var selector = "template[data-type={}]".format(this.type),
				source = document.querySelector(selector).innerHTML;

			source = source.replace(whitespaceStripper, "");
			source = source.replace(printMatcher, "',$1,'");
			source = source.split("{%").join("');");
			source = source.split("%}").join("a.push('");

			Template.templates[this.type] = templateFunction.format(source);
		}

		this.source = Template.templates[this.type];
	};

	// 
	Template.prototype.render = function (data) {
		Template.placeholder.innerHTML = new Function("data", this.source)(data);

		return Array.apply(null, Template.placeholder.childNodes);
	};

	// Object to hold stripped templates.
	Template.templates = {};

	// Placeholder element.
	Template.placeholder = document.createElement("div");

	// 
	var whitespaceStripper = /\s{2,}/g,
		printMatcher = /\{%=(.*?)%\}/g,
		templateFunction = "var a=[];a.push('{}');return a.join('');";

	// HB.Router
	// ---------

	// 
	var Router = HB.Router = function () {
		this.route = [];
		root.addEventListener("hashchange", this.match.bind(this), false);
	};

	// 
	Router.prototype.match = function () {
		var hash = location.hash.split("#!/")[1];

		if (hash) {
			this.route = hash.split("/");

			if (HB.collections[this.route[0]] !== undefined && HB.cache) {
				HB.collections[this.route[0]].show(this.route[1]);
			} else {
				HB.request.get({
					handle: this.route[0]
				});
			}
		} else {
			location.hash = HB.home;
		}
	};

	// HB.Request
	// ----------

	// 
	var Request = HB.Request = function () {
		this.xhr = new XMLHttpRequest();
		this.xhr.addEventListener("load", Request.callback, false);
	};

	// 
	Request.prototype.get = function (parameters) {
		document.body.classList.add("loading");

		this.xhr.open("GET", HB.endpoint.format(parameters), true);
		this.xhr.setRequestHeader("Accept", "application/json");
		this.xhr.send(null);
	};

	// 
	Request.callback = function () {
		if (this.status === 200) {
			var data = JSON.parse(this.response);

			HB.collections[data.handle] = new Collection(data);
			HB.collections[data.handle].show(HB.router.route[1]);
		} else {
			location.hash = HB.home;
		}

		document.body.classList.remove("loading");
	};

	// 
	HB.request = new Request();

	// HB.Collection
	// -------------

	// 
	var Collection = HB.Collection = function (data) {
		for (var item in data) {
			this[item] = data[item];
		}

		this.blocks = data.blocks.map(function (block) {
			return new Block(block);
		});

		this.template = new Template(data.type);
	};

	// 
	Collection.prototype.show = function (blockHandle) {
		var self = HB.collection = this;

		if (blockHandle) {
			var blocks = this.blocks.filter(function(block) {
				return block.handle === blockHandle;
			});

			if (blocks.length) {
				self = {
					title: blocks[0].title,
					template: blocks[0].template,
					blocks: blocks
				};
			} else {
				return location.hash = "#!/{}".format(this.handle);
			}
		}

		while (HB.target.firstChild) {
			HB.target.removeChild(HB.target.firstChild);
		}

		self.template.render(self).forEach(function (element) {
			HB.target.appendChild(element);
		});

		document.body.classList.remove(lastType);
		document.body.classList.add(lastType = self.template.type);

		document.title = HB.title.spec.format(HB.title.text, self.title);
	};

	// Variable to hold last used `type`.
	var lastType;

	// HB.Block
	// --------

	// 
	var Block = HB.Block = function (data) {
		for (var item in data) {
			this[item] = data[item];
		}

		this.time = new Date(data.time);
		this.template = new Template(data.type);
	};

	// Helpers
	// -------

	// Formats a string (`:param` or `{n}` and/or `{}`).
	String.prototype.format = function (data) {
		var i = 0;

		if (typeof data !== "object") {
			// `Array.apply` doesn't work with array's that have a single number.
			data = [].slice.call(arguments);
		}

		return this.replace(formatMatcher, function (undefined, $1, $2) {
			return data[$1 || $2 || i++];
		});
	};

	// Cached regex to match part of string.
	var formatMatcher = /:(\w+)|\{([0-9])?\}/g;

	// It's kinda like `date` in PHP.
	Date.prototype.format = function (spec) {
		var date = this.getDate(),
			day = this.getDay(),
			month = this.getMonth(),
			year = this.getFullYear(),
			hours = this.getHours(),
			twelve = hours > 12 ? hours - 12 : hours,
			minutes = this.getMinutes(),
			seconds = this.getSeconds(),

			options = {
				d: date < 10 ? "0" + date : date,
				D: days[day].substr(0, 3),
				j: date,
				l: days[day] + "day",
				N: day + 1,
				S: date > 3 && date < 21 ? ordinals[0] : ordinals[date % 10] || ordinals[0],
				w: day,
				F: months[month],
				m: month < 10 ? "0" + month : month,
				M: months[month].substr(0, 3),
				n: month + 1,
				Y: year,
				y: ("" + year).substr(2, 2),
				a: hours < 12 ? "am" : "pm",
				A: hours < 12 ? "AM" : "PM",
				g: twelve,
				G: hours,
				h: twelve < 10 ? "0" + twelve : twelve,
				H: hours < 10 ? "0" + hours : hours,
				i: minutes < 10 ? "0" + minutes : minutes,
				s: seconds < 10 ? "0" + seconds : seconds
			};

		return spec.replace(/\\?([a-z])/gi, function ($0, $1) {
			return options[$0] !== undefined ? options[$0] : $1;
		});
	};

	// Text strings.
	var ordinals = ["th", "st", "nd", "rd"],
		days = ["Mon", "Tues", "Wednes", "Thurs", "Fri", "Satur", "Sun"],
		months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
})(this);