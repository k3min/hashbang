// Hashbang 2.0.0

// Copyright (c) 2014 Kevin Pancake
// Hashbang may be freely distributed under the MIT license.


(function(window) {

	// Setup
	// -----

	var document = window.document;

	// Top-level namespace.
	var HB = window.HB = {

		// Current version.
		version: "2.0.0",

		// REST API endpoint.
		endpoint: "api/:handle",

		// This holds all the requested collections.
		collections: {},

		// Call this to fire up Hashbang.
		main: function() {
			this.request = new Request(this.endpoint);

			this.home = document.links[0].hash;
			this.root = window.root;

			this.title = {
				text: document.title,
				spec: document.getElementsByTagName("title")[0].dataset.spec
			};

			this.router.add("/:collection", function(collection) {
				if (HB.collections[collection] === undefined) {
					HB.request.get({ handle: collection }, function(data) {
						HB.collections[collection] = new Collection();
						HB.collections[collection].load(data);

						HB.root.appendChild(HB.collections[collection]);
					});
				} else {
					HB.root.appendChild(HB.collections[collection]);
				}
			});

			this.router.match();
		}
	};

	// Class
	// -----

	// Create a new class.
	var klass = window.klass = function(methods) {
		var base = methods.constructor;

		if (this.prototype !== undefined) {
			base.prototype = Object.create(this.prototype, {
				parent: { value: this.prototype }
			});
		}

		for (var i in methods) {
			var p = i.split("$")[0],
				o = /static/.test(i) ? base : base.prototype;

			Object.defineProperty(o, p, {
				enumerable: !/hidden|constructor/.test(i),
				value: methods[i]
			});
		}

		return base;
	};

	// Extend an existing class.
	Object.defineProperty(Object.prototype, "extend", {
		value: klass
	});

	// document.registerElement
	// ------------------------

	if (document.registerElement === undefined) {

		// 
		document.registerElement = function(element, properties) {
			document.registerElement.elements[element] = properties;

			var HTMLCustomElement = function HTMLCustomElement() {
				var custom = document.createElement(element);

				custom.__proto__ = properties.prototype;

				if (custom.createdCallback !== undefined) {
					custom.createdCallback.call(element);
				}

				return custom;
			};

			HTMLCustomElement.prototype = properties.prototype;

			Object.defineProperty(HTMLCustomElement.prototype, "constructor", {
				value: HTMLCustomElement
			});

			return HTMLCustomElement;
		};

		// 
		document.registerElement.elements = {};

		// 
		document.addEventListener("DOMContentLoaded", function() {
			var q = [], e = document.registerElement.elements;

			for (var i in e) {
				q.push(e[i].extends ? "{}[is={}]".format(e[i].extends, i) : i);
			}

			Array.apply(null, document.querySelectorAll(q.join(","))).forEach(function(e) {
				e.__proto__ = e[i].prototype;

				if (e.createdCallback !== undefined) {
					e.createdCallback.call(e);
				}
			});
		}, false);
	}

	// HB.Template
	// -----------

	// `HTMLTemplateElement` polyfill.
	if (window.HTMLTemplateElement === undefined) {
		window.HTMLTemplateElement = HTMLElement.extend({
			constructor: function HTMLTemplateElement() {
				this.parent.constructor.apply(this, arguments);
			}
		});
	}

	// 
	var Template = HB.Template = document.registerElement("hb-template", {
		prototype: Object.create(HTMLTemplateElement.prototype, {
			createdCallback: {
				value: function() {
					var source = this.innerHTML;

					source = source.replace(/\s{2,}/g, "");
					source = source.replace(/\{\{(.*?)\}\}/g, "',$1,'");
					source = source.split("{%").join("');");
					source = source.split("%}").join("a.push('");
					source = "var a=[];a.push('{}');return a.join('');".format(source);

					this.source = new Function(source);
				}
			},
			render: {
				value: function(data) {
					return this.source.call(data);
				}
			}
		}),
		extends: "template"
	});

	// 
	Template.list = {};

	// HB.Collection
	// -------------

	// 
	var Collection = HB.Collection = document.registerElement("hb-collection", {
		prototype: Object.create(HTMLElement.prototype, {
			load: {
				value: function(data) {
					this.id = data.id;
					this.handle = data.handle;
					this.title = data.title;
					this.type = data.type;
					this.template = window[data.type];

					this.blocks = data.blocks.map(function(data) {
						return new Block(data);
					});

					if (this.template !== undefined) {
						this.insertAdjacentHTML("beforeend", this.template.render(this));
					} else {
						console.error("Template '{}' is not defined".format(data.type));
					}
				}
			}
		})
	});

	// HB.Block
	// --------

	var Block = HB.Block = klass({

		// 
		constructor: function Block(data) {
			for (var key in data) {
				this[key] = data[key];
			}

			this.time = new Date(this.time);
			this.template = Template.list[this.type];
		},

		// Returns the value of a property.
		reduce: function(to) {
			var find = to.split("."),
				result = this[find[0]];

			if (find[1] !== undefined) {
				for (var i = 1; i < find.length; i++) {
					result = result[find[i]];
				}
			}

			return result;
		}
	});

	// Router
	// ------

	var Router = HB.Router = klass({

		// 
		constructor: function Router() {
			window.addEventListener("hashchange", this.match.bind(this), false);
		},

		// 
		add$hidden: function(route, callback) {
			this[route] = callback;
			this[route].match = new RegExp(route.replace(/:\w+/g, "(\\w+)"));
		},

		// 
		match$hidden: function() {
			for (var i in this) {
				var matches = location.hash.match(this[i].match);

				if (matches !== null) {
					matches.shift();
					this[i].apply(this, matches);
				}
			}
		}
	});

	// 
	HB.router = new Router();

	// Request
	// -------

	var Request = HB.Request = klass({

		// 
		constructor: function Request(endpoint) {
			this.endpoint = endpoint;

			this.xhr = new XMLHttpRequest();
			this.xhr.addEventListener("load", Request.load.bind(this), false);
		},

		// 
		get: function(parameters, callback) {
			this.callback = callback;

			this.xhr.open("GET", this.endpoint.format(parameters), true);
			this.xhr.setRequestHeader("Accept", "application/json");
			this.xhr.send(null);

			document.body.classList.add("loading");
		},

		// 
		load$static: function() {
			if (this.xhr.status === 200) {
				this.callback.call(this, JSON.parse(this.xhr.response));
			}

			document.body.classList.remove("loading");
		}
	});

	// Helpers
	// -------

	// Formats a string (`:param` or `{n}` and/or `{}`).
	String.prototype.format = function(data) {
		var i = 0;

		if (typeof data !== "object") {
			// `Array.apply` doesn't work with arrays that consist of a single number.
			data = [].slice.call(arguments);
		}

		return this.replace(/:(\w+)|\{([0-9])?\}/g, function(undefined, $1, $2) {
			return data[$1 || $2 || i++];
		});
	};

	// It's kinda like `date` in PHP.
	Date.prototype.format = function(spec) {
		var ord = Date.ordinals;

		var date = this.getDate(),
			day = this.getDay(),
			month = this.getMonth(),
			year = this.getFullYear(),
			hours = this.getHours(),
			twelve = hours % 12 || 12,
			minutes = this.getMinutes(),
			seconds = this.getSeconds();

		var options = {
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

		return spec.replace(/\\?([a-z])/gi, function($0, $1) {
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
})(this);