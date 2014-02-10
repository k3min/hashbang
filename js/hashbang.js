// Hashbang 1.3.5

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
		version: "1.3.5",

		// REST API endpoint.
		endpoint: "api/:handle",

		// This holds all the requested collections.
		collections: {},

		// Turn off `cache` to disable the use of cached collections.
		cache: true,

		// Call this to fire up Hashbang.
		main: function (home, root) {
			this.home = home || document.getElementsByTagName("a")[0].hash;
			this.root = root || document.querySelector("[data-role=root]");

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
		var selector = "template[data-type={}]".format(type),
			element = document.querySelector(selector);

		if (element === null) {
			throw new Error("TemplateError: type '{}' is not defined".format(type));
		}

		if (Template.functions[type] === undefined) {
			var source = element.innerHTML;

			source = source.replace(whitespaceMatcher, "");
			source = source.replace(templateMatcher, "',$1,'");
			source = source.split("{%").join("');");
			source = source.split("%}").join("a.push('");
			source = templateFunction.format(source);

			Template.functions[type] = new Function(source);
		}

		this.type = type;
		this.element = element;
	};

	// 
	Template.prototype.render = function (data) {
		Template.temp.innerHTML = Template.functions[this.type].call(data);
		return Array.apply(null, Template.temp.childNodes);
	};

	// Object to cache template functions.
	Template.functions = {};

	// Placeholder element.
	Template.temp = document.createElement("div");

	// Cached regexes to match part of string.
	var whitespaceMatcher = /\s{2,}/g,
		templateMatcher = /\{%=(.*?)%\}/g;

	// Function to construct templates.
	var templateFunction = "var a=[];a.push('{}');return a.join('');";

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

		if (hash !== undefined) {
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
		this.id = data.id;
		this.handle = data.handle;
		this.title = data.title;
		this.type = data.type;
		this.template = new Template(data.type);

		this.blocks = data.blocks.map(function (data) {
			return new Block(data);
		});

		this.sort(this.template.element.dataset.sort || "id");
	};

	// Returns a clone of the `Collection`.
	Collection.prototype.clone = function () {
		return Object.create(this);
	};

	// Shows the `Collection` (or `Block` if `blockHandle` is specified).
	Collection.prototype.show = function (blockHandle) {
		var data = HB.collection = blockHandle ?
				this.search("handle", blockHandle) : this,

			title = this.title,
			template = this.template;

		if (blockHandle) {
			if (data.blocks.length === 0) {
				return location.hash = "#!/{}".format(this.handle);
			}

			title = data.blocks[0].title;
			template = data.blocks[0].template;
		}

		while (HB.root.firstChild) {
			HB.root.removeChild(HB.root.firstChild);
		}

		template.render(data).forEach(function (element) {
			HB.root.appendChild(element);
		});

		document.body.classList.remove(lastType);
		document.body.classList.add(lastType = template.type);

		document.title = HB.title.spec.format(HB.title.text, title);
	};

	// This returns a clone of the `Collection` with found `blocks`.
	Collection.prototype.search = function (key, value) {
		var data = this.clone();

		data.blocks = data.blocks.filter(function (block) {
			return block.reduce(key) === value;
		});

		return data;
	};

	// Sorts the `blocks` and returns a clone of the `Collection`.
	Collection.prototype.sort = function (by) {
		var data = this.clone(),
			order = 1;

		if (by[0] === "-") {
			by = by.substring(1);
			order = -1;
		}

		data.blocks.sort(function (a, b) {
			a = a.reduce(by);
			b = b.reduce(by);

			return (a < b ? -1 : a > b ? 1 : 0) * order;
		});

		return data;
	};

	// Variable to hold last used `template.type`.
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

	// Returns the value of a property.
	Block.prototype.reduce = function (to) {
		var find = to.split("."),
			result = this[find[0]];

		if (find[1] !== undefined) {
			for (var i = 1; i < find.length; i++) {
				result = result[find[i]];
			}
		}

		return result;
	};

	// Helpers
	// -------

	// Formats a string (`:param` or `{n}` and/or `{}`).
	String.prototype.format = function (data) {
		var i = 0;

		if (typeof data !== "object") {
			// `Array.apply` doesn't work with arrays that consist of a single number.
			data = [].slice.call(arguments);
		}

		return this.replace(stringMatcher, function (undefined, $1, $2) {
			return data[$1 || $2 || i++];
		});
	};

	// Cached regex to match part of string.
	var stringMatcher = /:(\w+)|\{([0-9])?\}/g;

	// It's kinda like `date` in PHP.
	Date.prototype.format = function (spec) {
		var ord = Date.ordinals,

			date = this.getDate(),
			day = this.getDay(),
			month = this.getMonth(),
			year = this.getFullYear(),
			hours = this.getHours(),
			twelve = hours % 12 || 12,
			minutes = this.getMinutes(),
			seconds = this.getSeconds(),

			options = {
				d: date < 10 ? "0" + date : date,
				D: Date.days[day].substr(0, 3),
				j: date,
				l: Date.days[day],
				N: day || 7,
				S: date > 3 && date <= 20 ? ord[0] : (ord[date % 10] || ord[0]),
				w: day,
				F: Date.months[month],
				m: month < 10 ? "0" + (month + 1) : (month + 1),
				M: Date.months[month].substr(0, 3),
				n: month + 1,
				t: new Date(year, month + 1, 0).getDate(),
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

		return spec.replace(dateMatcher, function ($0, $1) {
			return options[$0] !== undefined ? options[$0] : $1;
		});
	};

	// Text strings.
	Date.ordinals = ["th", "st", "nd", "rd"];

	Date.days = [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday"
	];

	Date.months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	];

	// Cached regex to match part of string.
	var dateMatcher = /\\?([a-z])/gi;

	// HTML5 `dataset` polyfill for IE10.
	if (Template.temp.dataset === undefined) {
		Object.defineProperty(Element.prototype, "dataset", {
			get: function () {
				var dataset = {},
					attributes = Array.apply(null, this.attributes);

				attributes.forEach(function (attribute) {
					var name = attribute.name.split("-");

					if (name[1] !== undefined && name[0] === "data") {
						dataset[name[1]] = attribute.value;
					}
				});

				return dataset;
			}
		});
	}
})(this);