// Hashbang 2.0.8
// Copyright (c) 2016 Kevin Pancake
// Hashbang may be freely distributed under the MIT license.


(function (window) {
	"use strict";

	// Setup
	// -----

	// Save some bytes.
	var document = window.document,
		location = window.location,

		html = document.documentElement,

		define = Object.defineProperty,
		clone = Object.create;

	// Test to check if Trident (IE layout engine).
	var isTrident = function (n) {
		var x = navigator.appVersion;

		return (/Trident/.test(x) && ((x.match(/Trident\/(\d)/)[1] | 0) <= n));
	};

	// Top-level namespace.
	var HB = window.HB = {

		// Current version.
		version: "2.0.8",

		// REST API endpoint.
		endpoint: "api/:handle",

		// This holds all the requested **collections**.
		collections: {},

		// Call this to fire up Hashbang.
		main: function (home, root) {

			// Handles HTTP requests.
			HB.request = new Request(HB.endpoint);

			// Hashbang will go back to this hash is something goes wrong.
			HB.home = home || document.links[0].hash;

			// Element where the magic happens.
			HB.root = root || window.root;

			// Object to hold some title properties.
			HB.title = {
				text: document.title,
				spec: document.getElementsByTagName("title")[0].dataset.spec
			};

			// Set up fallback in case `HB.router` doesn't know what to do.
			HB.router.fallback = HB.fallback;

			// Main route.
			HB.router.add("/:collection(/:block)?", HB.route);

			// Match routes for initial location.
			HB.router.match();
		},

		// Default route.
		route: function (handle, block) {
			var c = HB.collections[handle];

			if (c === undefined || c.blocks === undefined || HB.noCache) {
				c = HB.collections[handle] = new Collection();
				c.addEventListener("update", HB.update, false);

				HB.request.get({
					handle: handle,
					success: c.load.bind(c),
					error: HB.fallback
				});
			} else {

				// Abort ongoing request
				// (to prevent unwanted behaviour on slower connections).
				HB.request.xhr.abort();
			}

			c.block = block;

			// Remove `.active` form last links.
			lastLinks.forEach(function (link) {
				link.classList.remove("active");
			});

			// Clear `lastLinks` array.
			lastLinks = [];

			// Make the current links `.active`.
			for (var i = 0, l = document.links; i < l.length; i++) {
				if (l[i].hash.substr(3) === handle) {
					l[i].classList.add("active");
					lastLinks.push(l[i]);
				}
			}
		},

		// This gets called when a **collection** updates.
		update: function (event) {

			// Save some bytes...
			var detail = event.detail,
				title = HB.title,
				root = HB.root,
				classList = html.classList;

			// Set the title.
			document.title = title.spec.format(title.text, detail.title);

			// Append current **collection** to `HB.root`.
			root.replaceChildren(this);

			// Update class to match current **collection** `handle`.
			classList.remove(lastHandle);
			classList.add(lastHandle = detail.handle);

			// Update class to match current **collection** `type`.
			classList.remove(lastType);
			classList.add(lastType = detail.type);

			// Fire the `update` event on `HB.root` when a
			// **collection** updates.
			root.dispatchEvent(new CustomEvent("update", { detail: this }));
		},

		// Function to call if **collection** is not found.
		fallback: function () {
			location.hash = HB.home;
		}
	};

	// Array to hold last `.active` links.
	var lastLinks = [];

	// Variable to hold last used **collection** `handle` and `type`.
	var lastHandle, lastType;

	// klass
	// -----

	// A descriptor contains one of these.
	var descriptors = [
		"configurable",
		"enumerable",
		"value",
		"writable",
		"get",
		"set"
	];

	// Does `descriptors` intersects `keys`?
	var intersects = function (keys) {
		return Object.keys(keys).some(function (i) {
			return (descriptors.indexOf(i) !== -1);
		});
	};

	// `Object.defineProperty` shorthand.
	define(Object.prototype, "define", {
		value: function (name, value, writable) {
			var descriptor;

			if (typeof value === "object" && intersects(value)) {
				descriptor = value;
			} else {
				descriptor = {
					value: value,
					writable: writable || false
				};
			}

			return define(this, name, descriptor);
		}
	});

	// Create a new class. Add `$static` to a method name to make it *static*.
	// `$virtual` makes it writable. `$private` makes it non-enumerable.
	// You can even define getters/setters.
	var klass = window.klass = function (methods) {
		var base = methods.constructor,
			type = methods.prototype,
			self = (this && this.prototype) || false;

		// If extending...
		if (type !== undefined || self !== false) {
			base.prototype = type || clone(self, { parent: { value: self } });
		}

		for (var i in methods) {
			var method = methods[i];

			if (method === type) {
				continue;
			}

			var property = i.split("$")[0],
				object = /\$static/.test(i) ? base : base.prototype,
				descriptor = { enumerable: !/\$private|^constructor/.test(i) };

			if (method !== null && (typeof method.get === "function" ||
			                        typeof method.set === "function")) {
				descriptor.get = method.get;
				descriptor.set = method.set;
			} else {
				descriptor.value = method;
				descriptor.writable = (/\$virtual/.test(i) ||
									   typeof method !== "function");
			}

			object.define(property, descriptor);
		}

		return base;
	};

	// Extend an existing class. To access base *class* use `this.parent`.
	Object.prototype.define("extend", klass);

	// document.registerElement
	// ------------------------

	// This is just a polyfill.
	if (document.registerElement === undefined) {

		// Some flags to keep track of callbacks.
		var REGISTER = {
			NONE: 0,
			CUSTOM: 1,
			EXTENDS: 2
		};

		// Here are custom elemens stored for convenience.
		var customElements = {};

		// Function to make a custom element custom.
		var register = function (e, props) {
			if (e.registerFlags === undefined) {
				e.define("registerFlags", REGISTER.NONE, true);
			}

			var mask = (props.extends !== undefined) ?
				REGISTER.EXTENDS : REGISTER.CUSTOM;

			if (e.registerFlags & mask) {
				return false;
			}

			var p = props.prototype;

			if (isTrident(7)) {
				Object.getOwnPropertyNames(p).forEach(function (name) {
					e.define(name, Object.getOwnPropertyDescriptor(p, name));
				});
			} else {
				e.__proto__ = p;
			}

			e.registerFlags |= mask;

			return true;
		};

		// (Almost) the same as the real deal.
		document.define("registerElement", function (element, props) {
			customElements[element] = props;

			return klass({

				// Create. Register. Return.
				constructor: function HTMLCustomElement() {
					var custom = document.createElement(element);

					register(custom, props);

					return custom;
				},

				// Give functionality.
				prototype: props.prototype
			});
		});

		var attach = function () {
			for (var i in customElements) {
				var el, ex = customElements[i].extends;

				if (ex !== undefined) {
					el = document.querySelectorAll("{}[is={}]".format(ex, i));
				} else {
					el = document.getElementsByTagName(i);
				}

				for (var j = 0; j < el.length; j++) {
					var e = el[j];

					if (register(e, customElements[i]) &&
						typeof e.attachedCallback === "function") {
						e.attachedCallback.call(e);
					}
				}
			}
		}

		try {
			// Make custom elements custom.
			var observer = new MutationObserver(attach);

			// Observe attaches.
			observer.observe(document, {
				childList: true,
				subtree: true
			});
		} catch (e) {
			document.addEventListener("DOMContentLoaded", attach, false);
		}
	}

	// HB.Template
	// -----------

	// `HTMLTemplateElement` polyfill.
	if (window.HTMLTemplateElement === undefined) {
		window.define("HTMLTemplateElement", HTMLElement.extend({

			// (Illegal) constructor.
			constructor: function HTMLTemplateElement() {
				throw new TypeError("Illegal constructor");
			}
		}));
	}

	// Make the `HB.Template` *class* a custom element for ease and awesomeness.
	HB.Template = document.registerElement("hb-template", {
		prototype: clone(HTMLTemplateElement.prototype, {

			// Resig modified template function
			attachedCallback: { value: function () {
				var text = this.innerHTML;

				text = text.replace(/\s{2,}/g, "");
				text = text.replace(/\{\{(.*?)\}\}/g, "',$1,'");
				text = text.split("{%").join("');");
				text = text.split("%}").join("a.push('");
				text = "var a=[];a.push('" + text + "');return a.join('');";

				this.define("range", document.createRange());
				this.define("source", new Function(text));
			}},

			// This returns a HTML string.
			render: { value: function (d) {
				var result, source = this.source.call(d);

				this.range.selectNode(document.body);

				try {
					result = this.range.createContextualFragment(source);
				} catch (e) {
					var child, temp = document.createElement("div");

					temp.innerHTML = source;

					result = document.createDocumentFragment();

					while (child = temp.firstChild) {
						result.appendChild(child);
					}
				}

				return result;
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
				this.description = data.description;
				this.type = data.type;
				this.url = data.url;

				this.template = window[data.type] ||
								window.collection ||
								window.default;

				this.blocks = data.blocks.map(function (data) {
					return new Block(data);
				});

				if (this.template.dataset.sort !== undefined) {
					this.sort(this.template.dataset.sort);
					return;
				}

				this.update();
			}},

			// Suppress error spam.
			id: {
				get: function () { return this._id; },
				set: function (value) {
					this._id = value;
				}
			},

			// Fix tooltip.
			title: {
				get: function () { return this._title; },
				set: function (value) {
					this._title = value;
				}
			},

			// This getter/setter gets/sets the current shown **block**.
			block: {
				get: function () { return this._block; },
				set: function (value) {
					this._block = value;

					if (this.blocks !== undefined) {
						this.update();
					}
				}
			},

			// Sorts `blocks` by `by` and updates the **collection**.
			// Uses **block** `reduce`,
			// and if `by` starts with a `-`, guess what?
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

			// This returns a clone of the **collection** with found `blocks`.
			// Uses **block** `reduce`.
			search: { value: function (key, value) {
				var data = clone(this);

				data.blocks = data.blocks.filter(function (block) {
					return block.reduce(key) === value;
				});

				return data;
			}},

			// Updates the **collection**.
			update: { value: function () {

				// Figure out what to use as `data`.
				var data = this._block === undefined ?
					this : this.search("handle", this._block);

				// Object to give to the `update` event.
				var d = {
					id: this.id,
					handle: this.handle,
					title: this.title,
					type: this.type,
					template: this.template
				};

				// Checks if `block` is defined so it can show *subpage*.
				if (this._block !== undefined) {
					var block = data.blocks[0];

					// If so, but not found, go back to start.
					if (block === undefined) {
						return (location.hash = "#!/" + this.handle);
					}

					// Change event object to match **block**.
					d = {
						id: block.id,
						handle: block.handle,
						title: block.title,
						type: block.type,
						template: block.template
					};
				}

				// Halt if needed **template** isn't defined.
				if (d.template === undefined) {
					var error = "Template #{} is not defined".format(d.type);
					return console.error(error);
				}

				// Turn HTML generated by **template** `render` into children.
				this.replaceChildren(d.template.render(data));

				// Fire the event `update` when the **collection** updates.
				this.dispatchEvent(new CustomEvent("update", { detail: d }));
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

			this.time = new Date(data.time);

			this.template = window[data.type] ||
							window.block ||
							window.default;
		},

		// Returns the value of a property. Like `reduce("attributes.example")`.
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
		constructor: function Router(fallback) {
			this.fallback = fallback || null;

			window.addEventListener("hashchange", this.match.bind(this));
		},

		// Adds the `route` with corresponding `callback` to the router.
		add$private: function (route, callback) {
			var id = route,
				opt = /\((\/:[a-z]+)\)\?/g;

			if (opt.test(route)) {
				route = route.replace(opt, "(?:$1)?");
			}

			var re = new RegExp(route.replace(/:[a-z]+/g, "([a-z0-9-]+)"), "i");

			this[id] = callback;
			this[id].regExp = re;
		},

		// This gets called when `location.hash` changes,
		// and tries to do something with the defined routes.
		match$private: function () {
			var fallback = true;

			for (var i in this) {
				if (i === "fallback") {
					continue;
				}

				var matches = location.hash.match(this[i].regExp);

				if (matches !== null) {
					matches.shift();

					this[i].apply(this, matches);

					fallback = false;
				}
			}

			if (fallback && typeof this.fallback === "function") {
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

			this.define("xhr", new XMLHttpRequest());
			this.define("accept", "", true);
			this.define("response", "", true);

			this.xhr.addEventListener("load", this.load.bind(this));
			this.xhr.addEventListener("error", this.fallback.bind(this));
		},

		// Do a `prop.method` request to `this.endpoint` (formats with `prop`).
		// Can send `prop.data` as `prop.type` (defaults to `application/json`).
		// Accepts `prop.accept` (defaults to `application/json`).
		// Returns data as `prop.response` (defaults to `json`).
		// Calls `prop.success` if all good, else `prop.error`.
		send: function (prop) {
			var method = prop.method,
				data = prop.data || null;

			this.accept = prop.accept || "application/json";
			this.response = prop.response || "json";

			html.classList.add("loading");

			this.success = prop.success;
			this.error = prop.error;

			this.xhr.open(method, this.endpoint.format(prop));
			this.xhr.responseType = this.response;
			this.xhr.setRequestHeader("Accept", this.accept);

			if (method !== "GET" && data !== null) {
				var type = prop.type || "application/json";

				this.xhr.setRequestHeader("Content-Type", type);

				if (type === "application/json") {
					data = JSON.stringify(data);
				}
			}

			this.xhr.send(data);
		},

		// Shorthand for GET request.
		get: function (prop) {
			prop.method = "GET";
			this.send(prop);
		},

		// Load handler.
		load: function () {
			html.classList.remove("loading");

			try {
				var data = this.xhr.response;

				if (this.response === "json" && typeof data !== "object") {
					data = JSON.parse(data);
				}

				if (this.xhr.status === 200) {
					if (typeof this.success === "function") {
						this.success(data);
					}
				} else {
					this.fallback(data);
				}
			} catch (e) {
				this.fallback(e);
			}
		},

		// Oh noes! Something went wrong!
		fallback: function (data) {
			html.classList.remove("loading");

			if (data === undefined || data === null) {
				data = {
					status: this.xhr.status,
					message: this.xhr.statusText
				};
			} else if (data.status === undefined) {
				data.status = -1;
			}

			if (typeof this.error === "function") {
				this.error(data);
			}

			if (this.debug) {
				console.error(data);
			}
		}
	});

	// Dialog
	// ------

	// `HTMLDialogElement` polyfill.
	if (window.HTMLDialogElement === undefined) {
		window.define("HTMLDialogElement", HTMLElement.extend({

			// The return value.
			returnValue: "",

			// (Illegal) constructor.
			constructor: function HTMLDialogElement() {
				throw new TypeError("Illegal constructor");
			},

			// Open attribute.
			open: {
				get: function () { return this.hasAttribute("open"); },
				set: function (value) {
					if (value) {
						this.setAttribute("open", "");
					} else {
						this.removeAttribute("open");
					}
				}
			},

			// `open` shorthand.
			show: function () {
				this.open = true;
			},

			// Close the dialog.
			close: function (returnValue) {
				if (returnValue !== undefined) {
					this.returnValue = returnValue;
				}

				this.dispatchEvent(new CustomEvent("close"));

				this.open = false;
				this.returnValue = "";
			}
		}));

		// Register dialogs as element.
		document.registerElement("dialog", {
			prototype: clone(HTMLDialogElement.prototype)
		});
	}

	// Helpers
	// -------

	// Kills children, then appends `child`.
	Node.prototype.define("replaceChildren", function (child) {
		while (this.firstChild) {
			this.removeChild(this.firstChild);
		}

		this.appendChild(child);
	});

	// Formats a string (`:param` or `{n}` and/or `{}`).
	String.prototype.define("format", function (data) {
		var i = 0;

		if (typeof data !== "object") {
			// `Array.apply` doesn't work on *arrays* with a single number.
			data = [].slice.call(arguments);
		}

		return this.replace(/:([a-z]+)|\{([0-9])?\}/g, function ($0, $1, $2) {
			return data[$1 || $2 || i++];
		});
	});

	// It's kinda like `date` in PHP.
	Date.prototype.define("format", function (spec) {
		var ords = Date.ordinals,
			days = Date.days,
			months = Date.months,

			date = this.getDate(),
			day = this.getDay(),
			month = this.getMonth(),
			year = this.getFullYear(),
			hours = this.getHours(),
			twelve = (hours % 12) || 12,
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
	});

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

	// (Minimal) `dataset` polyfill.
	if (html.dataset === undefined) {
		HTMLElement.prototype.define("dataset", {
			get: function () {
				var dataset = {};

				for (var i = 0, a = this.attributes; i < a.length; i++) {
					var name = a[i].name.split("-");

					if (name[1] !== undefined && name[0] === "data") {
						dataset[name[1]] = a[i].value;
					}
				}

				return dataset;
			}
		});
	}

	// (Minimal) `classList` polyfill.
	if (html.classList === undefined) {
		var DOMTokenList = Array.extend({

			// Constructor.
			constructor: function DOMTokenList(element) {
				this.push.apply(this, element.className.split(" "));
				this.define("element", element);
			},

			update$private: function () {
				this.element.className = this.toString();
			},

			// Add class to list.
			add: function (add) {
				if (this.indexOf(add) !== -1) {
					return;
				}

				this.push(add);
				this.update();
			},

			// Remove class from list.
			remove: function (remove) {
				var index = this.indexOf(remove);

				if (index === -1) {
					return;
				}

				this.splice(index, 1);
				this.update();
			},

			toString: function () {
				return this.join(" ");
			}
		});

		HTMLElement.prototype.define("classList", {
			get: function () {
				return new DOMTokenList(this);
			}
		});
	}

	// `CustomEvent` polyfill.
	if (isTrident(7)) {
		window.define("CustomEvent", Event.extend({
			constructor: function CustomEvent(type, props) {
				var event = document.createEvent("CustomEvent");

				event.initCustomEvent(type, false, false, props.detail);

				return event;
			}
		}));
	}
})(this);