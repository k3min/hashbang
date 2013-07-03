// Hashbang 1.2.2

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
		version: "1.2.2",

		// REST API endpoint.
		endpoint: "api/:handle",

		// This holds all the requested collections.
		collections: {},

		// Turn off `cache` to disable the use of cached collections.
		cache: true,

		// Call this to fire up Hashbang.
		main: function (home, target) {
			this.home = home || document.querySelector("a").hash;
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
			try {
				var selector = "script[data-type={}]".format(this.type),
					source = document.querySelector(selector).text;
			} catch (e) {
				throw new Error("Template '{}' does not exist!".format(this.type));
			}

			Template.templates[this.type] = source.replace(whitespaceStripper, "");
		}

		this.source = Template.templates[this.type];
	};

	// 
	Template.prototype.render = function (data) {
		Template.placeholder.innerHTML = this.source.replace(
			Template.regex,
			Template.replacer.bind(data)
		);

		return Array.apply(null, Template.placeholder.childNodes);
	};

	// This regex is used to match keys.
	Template.regex = /\{([\w\.]+)\}/g;

	// Object to hold stripped templates.
	Template.templates = {};

	// Placeholder element.
	Template.placeholder = document.createElement("div");

	// Function that replaces keys with their values.
	Template.replacer = function (undefined, $1) {
		return $1.split(".").reduce(function (object, property) {
			return object[property];
		}, this);
	};

	// Cached regex to strip whitespace from a template.
	var whitespaceStripper = /\s{2,}/g;

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

		if (hash === undefined) {
			return location.hash = HB.home;
		}

		this.route = hash.split("/");

		if (HB.collections[this.route[0]] !== undefined && HB.cache) {
			HB.collections[this.route[0]].show(this.route[1]);
		} else {
			HB.request.get({
				handle: this.route[0]
			});
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
		this.blocks = {};

		this.id = data.id;
		this.handle = data.handle;
		this.title = data.title;
		this.showTitle = data.showTitle;

		this.template = new Template(data.type);

		for (var block in data.blocks) {
			this.blocks[block] = new Block(data.blocks[block]);
		}
	};

	// 
	Collection.prototype.show = function (blockHandle) {
		if (blockHandle !== undefined && this.blocks[blockHandle] === undefined) {
			return location.hash = "#!/{}".format(this.handle); // TODO: history API.
		}

		var title = this.title,
			type = this.template.type;

		while (HB.target.firstChild) {
			HB.target.removeChild(HB.target.firstChild);
		}

		if (blockHandle !== undefined) {
			var block = this.blocks[blockHandle];

			title = block.title;
			type = block.template.type;

			block.show();
		} else {
			if (this.showTitle) {
				Collection.title.textContent = this.title;
				HB.target.appendChild(Collection.title);
			}

			for (var block in this.blocks) {
				if (this.blocks.hasOwnProperty(block)) {
					this.blocks[block].show(this.template);
				}
			}
		}

		document.title = HB.title.spec.format(HB.title.text, title);

		document.body.classList.remove(lastType);
		document.body.classList.add(type);

		lastType = type;
	};

	// Element to append to target if `showTitle` is set to `true`.
	Collection.title = document.createElement("h1");

	// Variable to hold last used `type`.
	var lastType;

	// HB.Block
	// --------

	// 
	var Block = HB.Block = function (data) {
		for (var item in data) {
			this[item] = data[item];
		}

		this.template = new Template(data.type);
	};

	// 
	Block.prototype.show = function (template) {
		(template || this.template).render(this).forEach(function(element) {
			HB.target.appendChild(element);
		});
	};

	// Helpers
	// -------

	// Formats a string (`:param` or `{n}` and/or `{}`).
	String.prototype.format = function (data) {
		var i = 0;

		data = typeof data === "string" ?
			Array.apply(null, arguments) : data;

		return this.replace(formatMatcher, function (undefined, $1, $2) {
			return data[$1 || $2 || i++];
		});
	};

	// Cached regex to match part of string.
	var formatMatcher = /:(\w+)|\{([0-9])?\}/g;
})(this);