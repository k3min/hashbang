(function (window) {
	"use strict";

	// Setup
	// -----

	// Save some bytes.
	var document = window.document,
		location = window.location,

		html = document.documentElement;

	// Top-level namespace.
	var HA = window.HA = {

		// Current version.
		version: "0.0.2",

		// REST API endpoint.
		endpoint: "api/",

		// Call this to fire up Hashbang Admin.
		main: function () {

			// Handles HTTP requests.
			HA.request = new HB.Request(HA.endpoint);

			// Get metadata.
			HA.request.get({
				success: HA.sync,
				error: HA.error
			});
		},

		// This creates something new in the database.
		create: function (type, parent) {
			var data = { type: type };

			switch (type) {
				case HA.TYPE.COLLECTION:
					data.key = "handle";
					data.value = "new";
					break;

				case HA.TYPE.BLOCK:
					data.key = "collectionId";
					data.value = parent;
					break;
			}

			HA.request.send({
				method: "POST",
				data: data
			});
		},

		// Gets called when metadata is loaded.
		sync: function (data) {
			var overview = window.overview;

			HA.metadata = {
				attributes: data.attributes,
				collections: data.collections,
				tags: data.tags
			};

			while (overview.firstChild) { overview.removeChild(overview.firstChild); }
			while (tags.firstChild) { tags.removeChild(tags.firstChild); }
			while (attributes.firstChild) { attributes.removeChild(attributes.firstChild); }

			overview.appendChild(window.nav.render(data.collections));
			tags.appendChild(window.datalist.render(data.tags));
			attributes.appendChild(window.datalist.render(data.attributes));

			if (HB.root === undefined) {
				HB.noCache = true;
				HB.main();

				HB.root.addEventListener("update", HA.root, false);
				HB.root.addEventListener("change", HA.save, false);
			} else if (data.target !== undefined) {
				location.hash = data.target;
			}
		},

		// Update target.
		root: function (event) {
			var c = event.detail;
			var b = (c.block !== undefined);

			HA.target = {
				type: b ? HA.TYPE.BLOCK : HA.TYPE.COLLECTION,
				id: +(b ? c.search("handle", c.block).blocks[0] : c).id
			};
		},

		// Save changed data.
		save: function (event) {
			if (event.target.validity.valid) {
				HA.request.send({
					method: "POST",
					data: {
						type: HA.target.type,
						id: HA.target.id,
						key: event.target.name,
						value: event.target.value
					}
				});
			}
		},

		// Delete something.
		delete: function () {
			if (confirm(HA.strings.delete.format(HA.target.type))) {
				HA.request.send({
					method: "DELETE",
					data: {
						type: HA.target.type,
						id: HA.target.id
					}
				});
			}
		},

		// Error handling...
		error: function (data) {
			html.classList.add("error");
			alert(HA.strings[data.status] || HA.strings.error);
		},

		// Find.
		find: function (data, needle) {
			for (var handle in data) {
				return (needle.handle === handle && needle.title === data[handle]);
			}

			return false;
		},

		// Logout.
		logout: function () {
			HA.request.error = null;
			HA.request.xhr.open("HEAD", ":protocol//logout@:host:port:pathname".format(location) + HA.endpoint);
			HA.request.xhr.send();
		},

		// Action types.
		TYPE: {
			COLLECTION: "collection",
			BLOCK: "block"
		},

		// Strings.
		strings: {
			delete:	"Are you sure you want to delete this {}? This action cannot be undone.",
			error:	"Something went wrong!", 
			400:	"Something went seriously wrong!",
			401:	"You are not authorized!",
			500:	"Something went wrong on the server!"
		}
	};

	// HB.Request
	// -----------

	// Make `HB.Request` send stuff.
	HB.Request.prototype.send = function (params) {
		html.classList.add("loading");

		this.success = HA.sync;
		this.error = HA.error;

		this.xhr.open(params.method, this.endpoint, true);
		this.xhr.setRequestHeader("Content-Type", "application/json");
		this.xhr.send(JSON.stringify(params.data));
	};
})(this);