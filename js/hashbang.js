//     Hashbang 2.0.0
//     Copyright (c) 2014 Kevin Pancake
//     Hashbang may be freely distributed under the MIT license.


(function(window) {

	// Setup
	// -----

	// Save some bytes.
	var document = window.document,
		location = window.location,

		defineObjectProperty = Object.defineProperty,
		createObject = Object.create;

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

			this.router.fallback = function() {
				location.hash = HB.home;
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

	// klass
	// -----

	// Create a new class. Add `$static` to a method name to make it *static*.
	// `$hidden` makes it non-enumerable. You can even define getters and setters.
	var klass = window.klass = function(methods) {
		var base = methods.constructor;

		if (this.prototype !== undefined) {
			base.prototype = createObject(this.prototype, {
				parent: { value: this.prototype }
			});
		}

		for (var i in methods) {
			var property = i.split("$")[0],
				object = /\$static/.test(i) ? base : base.prototype,
				show = !/\$hidden|constructor/.test(i);

			if (methods[i].get !== undefined || methods[i].set !== undefined) {
				defineObjectProperty(object, property, {
					enumerable: show,
					get: methods[i].get,
					set: methods[i].set
				});
			} else {
				defineObjectProperty(object, property, {
					enumerable: show,
					value: methods[i]
				});
			}
		}

		return base;
	};

	// Extend an existing class. To access base *class* use `this.parent`.
	defineObjectProperty(Object.prototype, "extend", {
		value: klass
	});

	// document.registerElement
	// ------------------------

	// This is just a polyfill.
	if (document.registerElement === undefined) {
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

			defineObjectProperty(HTMLCustomElement.prototype, "constructor", {
				value: HTMLCustomElement
			});

			return HTMLCustomElement;
		};

		// Here are custom elemens stored for convenience.
		document.registerElement.elements = {};

		// Make custom elements custom.
		document.addEventListener("DOMContentLoaded", function() {
			var e = document.registerElement.elements;

			for (var i in e) {
				var q = e[i]["extends"] ? "{}[is={}]".format(e[i]["extends"], i) : i;

				Array.apply(null, document.querySelectorAll(q)).forEach(function(self) {
					self.__proto__ = e[i].prototype;

					if (self.attachedCallback !== undefined) {
						self.attachedCallback.call(self);
					}
				});
			}
		}, false);
	}

	// HB.Template
	// -----------

	// `window.HTMLTemplateElement` polyfill.
	if (window.HTMLTemplateElement === undefined) {
		window.HTMLTemplateElement = HTMLElement.extend({
			constructor: function HTMLTemplateElement() {
				this.parent.constructor.apply(this, arguments);
			}
		});
	}

	// Make the `HB.Template` *class* a custom element for ease and awesomeness.
	HB.Template = document.registerElement("hb-template", {
		prototype: createObject(window.HTMLTemplateElement.prototype, {

			// *Constructor*.
			attachedCallback: {
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

			// This returns a HTML string.
			render: {
				value: function(data) {
					return this.source.call(data);
				}
			}
		}),
		extends: "template"
	});

	// HB.Collection
	// -------------

	// Same treatment for `HB.Collection`.
	var Collection = HB.Collection = document.registerElement("hb-collection", {
		prototype: createObject(HTMLElement.prototype, {

			// This method turns JSON into children.
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

		// Not much to tell...
		constructor: function Block(data) {
			for (var key in data) {
				this[key] = data[key];
			}

			this.time = new Date(this.time);
			this.template = window[this.type];
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

		// Set up a listener for hash changes.
		constructor: function Router() {
			window.addEventListener("hashchange", this.match.bind(this), false);
		},

		// Adds a `route` — with corresponding `callback` — to the router.
		add$hidden: function(route, callback) {
			this[route] = callback;
			this[route].match = new RegExp(route.replace(/:\w+/g, "(\\w+)"));
		},

		// This gets called when `location.hash` changes,
		// and tries to do something with the defined routes.
		match$hidden: function() {
			var fallback = true;

			for (var i in this) {
				var matches = location.hash.match(this[i].match);

				if (matches !== null) {
					matches.shift();
					this[i].apply(this, matches);

					fallback = false;
				}
			}

			if (fallback && this._fallback !== undefined) {
				this._fallback();
			}
		},

		// Method to call if everything fails.
		fallback$hidden: {
			set: function(value) {
				this._fallback = value;
			}
		}
	});

	// Add the `HB.Router` *class* to the top-level namespace.
	HB.router = new Router();

	// Request
	// -------

	var Request = HB.Request = klass({

		// Sets up `XMLHttpRequest`.
		constructor: function Request(endpoint) {
			this.endpoint = endpoint;

			this.xhr = new XMLHttpRequest();
			this.xhr.addEventListener("load", this.load.bind(this), false);
		},

		// GET JSON from `this.endpoint` with specified `parameters`,
		// and execute `callback` when done.
		get: function(parameters, callback) {
			this.callback = callback;

			this.xhr.open("GET", this.endpoint.format(parameters), true);
			this.xhr.setRequestHeader("Accept", "application/json");
			this.xhr.send(null);

			document.body.classList.add("loading");
		},

		// Response to JSON.
		load: function() {
			if (this.xhr.status === 200) {
				this.callback(JSON.parse(this.xhr.response));
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
			// `Array.apply` doesn't work on *arrays* with a single number.
			data = [].slice.call(arguments);
		}

		return this.replace(/:(\w+)|\{([0-9])?\}/g, function(undefined, $1, $2) {
			return data[$1 || $2 || i++];
		});
	};

	// It's kinda like `date` in PHP.
	Date.prototype.format = function(spec) {
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
			D: days[day].substr(0, 3),
			j: date,
			l: days[day],
			N: day || 7,
			S: date > 3 && date <= 20 ? ords[0] : (ords[date % 10] || ords[0]),
			w: day,
			F: months[month],
			m: month < 10 ? "0" + (month + 1) : (month + 1),
			M: months[month].substr(0, 3),
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
	var ords = Date.ordinals = ["th", "st", "nd", "rd"];

	var days = Date.days = [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday"
	];

	var months = Date.months = [
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

	// HTML5 `dataset` polyfill for IE10.
	if (document.documentElement.dataset === undefined) {
		Object.defineProperty(Element.prototype, "dataset", {
			get: function () {
				var dataset = {};

				Array.apply(null, this.attributes).forEach(function (attribute) {
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