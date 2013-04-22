(function (global) {
	"use strict";

	global.HB = {
		home: "",
		api: "api/:handle",
		request: null,
		router: null,
		target: null,
		collections: {},
		title: {},
		version: 1.0,
		main: function () {
			this.home = document.getElementsByTagName("a")[0].hash;
			this.target = document.querySelector("[data-role=target]");

			this.title = {
				text: document.title,
				spec: document.getElementsByTagName("title")[0].dataset.spec
			};

			this.request = new HB.Request();
			this.router = new HB.Router();
		}
	};

	global.HB.Template = function (type) {
		this.type = type;

		if (HB.Template.cache[this.type] === undefined) {
			var selector = "script[data-type={}]".format(this.type),
				source = document.querySelector(selector).text;

			HB.Template.cache[this.type] = source.replace(/\s{2,}/g, "");
		}

		this.source = HB.Template.cache[this.type];
	};

	global.HB.Template.prototype.render = function (data) {
		HB.Template.placeholder.innerHTML = this.source.replace(
			HB.Template.regex,
			HB.Template.replacer.bind(data)
		);

		return HB.Template.placeholder.childNodes[0];
	};

	global.HB.Template.regex = /\{([\w\.]+)\}/g;
	global.HB.Template.cache = {};
	global.HB.Template.placeholder = document.createElement("div");

	global.HB.Template.replacer = function (undefined, $0) {
		return $0.split(".").reduce(function (object, property) {
			return object[property];
		}, this);
	};

	global.HB.Router = function () {
		this.route = [];
		this.match();

		global.addEventListener("hashchange", this.match.bind(this), false);
	};

	global.HB.Router.prototype.match = function () {
		this.route = location.hash.split("#!/")[1];

		if (this.route === undefined) {
			return location.hash = HB.home;
		}

		this.route = this.route.split("/");

		if (HB.collections[this.route[0]] === undefined) {
			HB.request.get({ handle: this.route[0] });
		} else {
			HB.collections[this.route[0]].show(this.route[1]);
		}
	};

	global.HB.Request = function () {
		this.xhr = new XMLHttpRequest();
		this.xhr.addEventListener("load", HB.Request.callback, false);
	};

	global.HB.Request.prototype.get = function (parameters) {
		document.body.classList.add("loading");

		this.xhr.open("GET", HB.api.format(parameters), true);
		this.xhr.send(null);
	};

	global.HB.Request.callback = function () {
		if (this.status === 200) {
			var data = JSON.parse(this.response);

			HB.collections[data.handle] = new HB.Collection(data);
			HB.collections[data.handle].show(HB.router.route[1]);
		} else {
			location.hash = HB.home;
		}

		document.body.classList.remove("loading");
	};

	global.HB.Collection = function (data) {
		this.blocks = {};

		this.id = data.id;
		this.handle = data.handle;
		this.title = data.title;
		this.type = data.type;
		this.showTitle = data.showTitle;

		this.template = new HB.Template(this.type);

		for (var block in data.blocks) {
			this.blocks[block] = new HB.Block(data.blocks[block]);
		}
	};

	global.HB.Collection.prototype.show = function (blockHandle) {
		var title = this.title,
			type = this.type;

		while (HB.target.firstChild) {
			HB.target.removeChild(HB.target.firstChild);
		}

		if (blockHandle === undefined || blockHandle.length === 0) {
			if (this.showTitle) {
				HB.Collection.placeholder.textContent = this.title;
				HB.target.appendChild(HB.Collection.placeholder);
			}

			for (var block in this.blocks) {
				this.blocks[block].show();
			}
		} else {
			if (this.blocks[blockHandle] !== undefined) {
				title = this.blocks[blockHandle].title;
				type = this.blocks[blockHandle].type;

				this.blocks[blockHandle].show();
			} else {
				location.hash = "#!/{}".format(this.handle);
			}
		}

		document.title = HB.title.spec.format(HB.title.text, title);
		document.body.dataset.type = this.type;
	};

	global.HB.Collection.placeholder = document.createElement("h1");

	global.HB.Block = function (data) {
		for (var item in data) {
			this[item] = data[item];
		}

		this.template = new HB.Template(this.type);
	};

	global.HB.Block.prototype.show = function () {
		HB.target.appendChild(this.template.render(this));
	};

	String.prototype.format = function (data) {
		var i = 0; data = typeof data === "object" ? data : arguments;

		return this.replace(/:(\w+)|\{([0-9])?\}/g, function (undefined, $0, $1) {
			return data[$0 || $1 || i++];
		});
	};

	global.addEventListener("load", HB.main.bind(HB), false);
})(this);