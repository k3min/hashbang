// 	Hashbang 2.0.1
// 	Copyright (c) 2014 Kevin Pancake
// 	Hashbang may be freely distributed under the MIT license.


(function (window) {
	"use strict";

	// Setup
	// -----

	// Save some bytes.
	var document = window.document,
		location = window.location,

		define = Object.defineProperty,
		clone = Object.create;

	// Test to check if Trident (IE layout engine).
	var isTrident = function (n) {
		var app = navigator.appVersion;
		return /Trident/.test(app) && app.match(/Trident\/([0-9])/)[1] <= n;
	};

	// Top-level namespace.
	var HB = window.HB = {

		// Current version.
		version: "2.0.1",

		// REST API endpoint.
		endpoint: "api/:handle",

		// This holds all the requested collections.
		collections: {},

		// Call this to fire up Hashbang.
		main: function (home, root) {

			// Handles HTTP requests.
			this.request = new Request(this.endpoint);

			// Hashbang will go back to this hash is something goes wrong.
			this.home = home || document.links[0].hash;

			// Element where the magic happens.
			this.root = root || window.root;

			// Object to hold some title properties.
			this.title = {
				text: document.title,
				spec: document.getElementsByTagName("title")[0].dataset.spec
			};

			// Set up fallback in case `HB.router` doesn't know what to do.
			this.router.fallback = this.fallback;

			// Main route.
			this.router.add("/:collection", function (c) {
				if (HB.collections[c] === undefined) {
					HB.collections[c] = new Collection();
					HB.collections[c].addEventListener("update", HB.update, false);

					HB.request.get({
						handle: c,
						success: function (data) {
							HB.collections[c].load(data);
						},
						error: function () {
							delete HB.collections[c];
							HB.fallback();
						}
					});
				} else {
					// TODO: Fix this ugly hack.
					HB.collections[c].block = undefined;
				}
			});

			// Route for *subpages*.
			this.router.add("/:collection/:block", function (c, b) {
				HB.collections[c].block = b;
			});

			// Match routes for initial location.
			this.router.match();
		},

		// This gets called when a collection updates.
		update: function (event) {

			// Save some bytes...
			var detail = event.detail;

			// Set the title.
			document.title = HB.title.spec.format(HB.title.text, detail.title);

			// Remove existing children.
			while (HB.root.firstChild) {
				HB.root.removeChild(HB.root.firstChild);
			}

			// Append current collection to `HB.root`.
			HB.root.appendChild(HB.collections[detail.handle]);

			// Update body class to match current `collection.handle`.
			document.body.classList.remove(lastHandle);
			document.body.classList.add(lastHandle = detail.handle);

			// Update body class to match current `collection.type`.
			document.body.classList.remove(lastType);
			document.body.classList.add(lastType = detail.type);
		},

		// Function to call if collection is not found.
		fallback: function () {
			location.hash = HB.home;
		}
	};

	// Variable to hold last used `collection.handle` and `collection.type`.
	var lastHandle, lastType;

	// klass
	// -----

	// Create a new class. Add `$static` to a method name to make it *static*.
	// `$hidden` makes it non-enumerable. You can even define getters and setters.
	var klass = window.klass = function (methods) {
		var base = methods.constructor;

		// If extending...
		if (this !== undefined) {
			var parent = this.prototype;

			base.prototype = clone(parent, {
				parent: {
					get: function () { return parent; }
				}
			});
		}

		for (var i in methods) {
			var method = methods[i],
				property = i.split("$")[0],
				object = /\$static/.test(i) ? base : base.prototype,
				show = !/\$hidden|constructor/.test(i);

			if (method.get !== undefined || method.set !== undefined) {
				define(object, property, {
					enumerable: show,
					get: method.get,
					set: method.set
				});
			} else {
				define(object, property, {
					enumerable: show,
					value: method
				});
			}
		}

		return base;
	};

	// Extend an existing class. To access base *class* use `this.parent`.
	define(Object.prototype, "extend", {
		value: klass
	});

	// document.registerElement
	// ------------------------

	// This is just a polyfill.
	if (document.registerElement === undefined) {

		// Here are custom elemens stored for convenience.
		var customElements = {};

		// Function to make a custom element custom.
		var register = function (element, p) {
			if (isTrident(6)) {
				Array.apply(null, Object.getOwnPropertyNames(p)).forEach(function (n) {
					define(element, n, Object.getOwnPropertyDescriptor(p, n));
				});
			} else {
				element.__proto__ = p;
			}
		};

		// This is (almost) the same as the real deal.
		document.registerElement = function (element, props) {
			customElements[element] = props;

			var HTMLCustomElement = function HTMLCustomElement() {
				var custom = document.createElement(element);

				register(custom, props.prototype);

				return custom;
			};

			HTMLCustomElement.prototype = props.prototype;

			define(HTMLCustomElement.prototype, "constructor", {
				value: HTMLCustomElement
			});

			return HTMLCustomElement;
		};

		// Make existing custom elements custom.
		document.addEventListener("DOMContentLoaded", function () {
			for (var i in customElements) {
				var q = customElements[i]["extends"] ?
					"{}[is={}]".format(customElements[i]["extends"], i) : i;

				// TODO: `Don't make functions within a loop`.
				Array.apply(null, document.querySelectorAll(q)).forEach(function (e) {
					register(e, customElements[i].prototype);

					if (e.attachedCallback !== undefined) {
						e.attachedCallback.call(e);
					}
				});
			}
		}, false);

		// TODO: `MutationObserver` here.
	}

	// HB.Template
	// -----------

	// `HTMLTemplateElement` polyfill.
	if (window.HTMLTemplateElement === undefined) {
		window.HTMLTemplateElement = HTMLElement.extend({
			constructor: function HTMLTemplateElement() {
				console.error("Illegal constructor");
			}
		});
	}

	// Make the `HB.Template` *class* a custom element for ease and awesomeness.
	HB.Template = document.registerElement("hb-template", {
		prototype: clone(HTMLTemplateElement.prototype, {

			// Resig modified template function (no `with` block) `+=`.
			attachedCallback: { value: function () {
				var source = this.innerHTML;

				source = source.replace(/\s{2,}/g, "");
				source = source.replace(/\{\{=(.*?)\}\}/g, "';html+=$1;html+='");
				source = source.split("{{").join("';");
				source = source.split("}}").join("html+='");
				source = "var html='" + source + "';return html;";

				this.source = new Function("collection", source);
			}},

			// This returns a HTML string.
			render: { value: function (data) {
				return this.source(data);
			}}
		}),

		// *Base* element.
		extends: "template"
	});

	// HB.Collection
	// -------------

	// Same treatment for `HB.Collection`.
	var Collection = HB.Collection = document.registerElement("hb-collection", {
		prototype: clone(HTMLElement.prototype, {

			// This method turns JSON into children.
			load: { value: function (data) {
				this.id = data.id;
				this.handle = data.handle;
				this.title = data.title;
				this.type = data.type;
				this.template = window[data.type];

				this.blocks = data.blocks.map(function (data) {
					return new Block(data);
				});

				if (this.template.dataset.sort !== undefined) {
					this.sort(this.template.dataset.sort);
				} else {
					this.update();
				}
			}},

			// This getter/setter gets/sets the current shown block.
			block: {
				get: function () { return this._block; },
				set: function (value) {
					this._block = value;

					if (this.blocks !== undefined) {
						this.update();
					}
				}
			},

			// Sorts `this.blocks` by `by` and updates the collection.
			// Uses `block.reduce`, and if `by` starts with a `-`, guess what?
			sort: { value: function (by) {
				var order = by[0] === "-" ?
					(by = by.substr(1), -1) : 1;

				this.blocks.sort(function (a, b) {
					a = a.reduce(by);
					b = b.reduce(by);

					return (a < b ? -1 : a > b ? 1 : 0) * order;
				});

				this.update();
			}},

			// This returns a clone of the collection with found `this.blocks`.
			// Uses `block.reduce`.
			search: { value: function (key, value) {
				var data = clone(this);

				data.blocks = data.blocks.filter(function (block) {
					return block.reduce(key) === value;
				});

				return data;
			}},

			// Updates the collection.
			update: { value: function () {

				// Figure out what to use as `data`.
				var data = this._block === undefined ?
					this : this.search("handle", this._block);

				// Object to give to the `update` event.
				var detail = {
					handle: this.handle,
					title: this.title,
					type: this.type,
					template: this.template
				};

				// Check if `this.block` is defined so it can show *subpage*.
				if (this._block !== undefined) {

					// If so, but not found, go back to start.
					if (data.blocks.length === 0) {
						return (location.hash = "#!/" + this.handle);
					}

					detail.title = data.blocks[0].title;
					detail.type = data.blocks[0].type;
					detail.template = data.blocks[0].template;
				}

				// Halt if needed template isn't defined.
				if (detail.template === undefined) {
					return console.error("Template #{} is not defined".format(detail.type));
				}

				// Remove existing children.
				while (this.firstChild) {
					this.removeChild(this.firstChild);
				}

				// Turn HTML generated by `template.render` into children.
				this.insertAdjacentHTML("beforeend", detail.template.render(data));

				// Fires the event `update` when the collection updates.
				this.dispatchEvent(new CustomEvent("update", { detail: detail }));
			}}
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

		// Returns the value of a property. Like `attributes.example`.
		reduce: function (to) {
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

		// *Constructor* sets up a listener for hash changes.
		constructor: function Router() {
			window.addEventListener("hashchange", this.match.bind(this), false);
		},

		// Adds the `route` — with corresponding `callback` — to the router.
		add$hidden: function (route, callback) {
			this[route] = callback;
			this[route].match = new RegExp(route.replace(/:[a-z]+/g, "([a-z0-9-]+)"));
		},

		// This gets called when `location.hash` changes,
		// and tries to do something with the defined routes.
		match$hidden: function () {
			var fallback = true;

			for (var i in this) {
				if (i === "fallback") {
					continue;
				}

				var matches = location.hash.match(this[i].match);

				if (matches !== null) {
					matches.shift();
					this[i].apply(this, matches);

					fallback = false;
				}
			}

			if (fallback && this.fallback !== undefined) {
				this.fallback();
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

		// GET JSON from `this.endpoint` with specified `props`.
		// (With `handle` being the most common)
		// Calls `props.success` if all good, else `props.error`.
		get: function (props) {
			document.body.classList.add("loading");

			this.success = props.success;
			this.error = props.error;

			this.xhr.open("GET", this.endpoint.format(props), true);
			this.xhr.setRequestHeader("Accept", "application/json");
			this.xhr.send(null);
		},

		// Response to JSON.
		load: function () {
			var data = JSON.parse(this.xhr.responseText);

			if (this.xhr.status === 200 && typeof this.success === "function") {
				this.success(data);
			} else if (typeof this.error === "function") {
				this.error(data);
			}

			document.body.classList.remove("loading");
		}
	});

	// Helpers
	// -------

	// Formats a string (`:param` or `{n}` and/or `{}`).
	String.prototype.format = function (data) {
		var i = 0;

		if (typeof data !== "object") {
			// `Array.apply` doesn't work on *arrays* with a single number.
			data = [].slice.call(arguments);
		}

		return this.replace(/:([a-z]+)|\{([0-9])?\}/g, function (undefined, $1, $2) {
			return data[$1 || $2 || i++];
		});
	};

	// It's kinda like `date` in PHP.
	Date.prototype.format = function (spec) {
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

		return spec.replace(/\\?([a-z])/gi, function ($0, $1) {
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

	// `dataset` polyfill.
	if (document.documentElement.dataset === undefined) {
		define(HTMLElement.prototype, "dataset", {
			get: function () {
				var dataset = {};

				Array.apply(null, this.attributes).forEach(function (a) {
					var name = a.name.split("-");

					if (name[1] !== undefined && name[0] === "data") {
						dataset[name[1]] = a.value;
					}
				});

				return dataset;
			}
		});
	}

	// `CustomEvent` polyfill.
	if (isTrident(7)) {
		window.CustomEvent = Event.extend({
			constructor: function CustomEvent(type, props) {
				var event = document.createEvent("CustomEvent");

				event.initCustomEvent(type, false, false, props.detail);

				return event;
			}
		});
	}
})(this);