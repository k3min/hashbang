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
		version: "0.0.3",

		// REST API endpoint.
		endpoint: "api/",

		// Valid upload MIME types.
		valid: /image\/(jpeg|png|svg\+xml)/,

		// Call this to fire up Hashbang Admin.
		main: function () {

			// Handles HTTP requests.
			HA.request = new HB.Request(HA.endpoint);

			// Get metadata.
			HA.request.get({
				success: HA.sync,
				error: HA.error
			});

			HA.upload.init();
		},

		// Hashbang update handler.
		update: function () {
			var content = document.querySelector("textarea");

			if (content !== null) {
				content.addEventListener("keydown", HA.keys, false);
			}
		},

		// Input handler.
		keys: function (event) {
			var cancel = false;

			switch (event.keyCode) {
				case 83:
					if (event.metaKey || event.ctrlKey) {
						var change = new CustomEvent("change", {
							detail: this
						});

						HB.root.dispatchEvent(change);

						cancel = true;
					}

					break;

				case 9:
					var a = this.selectionStart,
						b = this.selectionEnd,
						t = this.value;

					this.value = t.slice(0, a) + "\t" + t.slice(b);
					this.selectionStart = this.selectionEnd = a + 1;

					cancel = true;

					break;
			}

			if (cancel) {
				event.preventDefault();
			}
		},

		// Event handlers related to `block`.
		block: {

			// Cached target.
			target: null,

			// Create event listeners.
			init: function (parent) {
				var collections = parent.querySelectorAll("dt"),
					blocks = parent.querySelectorAll("dd");

				for (var i = 0; i < collections.length; i++) {
					var collection = collections[i];

					collection.addEventListener("dragenter", HA.block.enter, false);
					collection.addEventListener("dragover", HA.block.drag, false);
					collection.addEventListener("dragleave", HA.block.leave, false);
					collection.addEventListener("drop", HA.block.drop, false);
				}

				for (var i = 0; i < blocks.length; i++) {
					var block = blocks[i];

					block.addEventListener("dragstart", HA.block.start, false);
					block.addEventListener("dragend", HA.block.end, false);
				}
			},

			// Called when user starts dragging a `block`.
			start: function (event) {
				event.dataTransfer.effectAllowed = "move";

				HA.block.target = this;

				html.classList.add("move");
			},

			// Opposite of previous.
			end: function () {
				HA.block.target = null;

				html.classList.remove("move");
			},

			// Called when a `block` touches a `collection`.
			enter: function () {
				if (HA.block.target !== null) {
					this.classList.add("target");
				}
			},

			// Opposite of previous.
			leave: function () {
				if (HA.block.target !== null) {
					this.classList.remove("target");
				}
			},

			// Drag event.
			drag: function (event) {
				if (HA.block.target !== null) {
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
				}
			},

			// Change parent (`collectionId`) of `block`.
			drop: function (event) {
				if (HA.block.target === null) {
					return;
				}

				HA.request.send({
					method: "POST",
					data: {
						type: "block",
						id: HA.block.target.dataset.id,
						key: "collectionId",
						value: this.dataset.id
					}
				});

				HA.block.leave.call(this);

				event.preventDefault();
			}
		},

		// Event handlers related to uploading.
		upload: {

			// Create event listeners.
			init: function () {
				window.addEventListener("dragenter", HA.upload.enter, false);
				window.addEventListener("dragend", HA.upload.end, false);

				window.upload.addEventListener("dragenter", HA.upload.drag, false);
				window.upload.addEventListener("dragover", HA.upload.drag, false);
				window.upload.addEventListener("dragleave", HA.upload.leave, false);
				window.upload.addEventListener("drop", HA.upload.drop, false);
			},

			// Called when something enters the `window`.
			enter: function (event) {
				var target = event.target;

				if (target === window.upload) {
					target.classList.add("target");
				}

				html.classList.add("upload");
			},

			// Opposite of previous.
			leave: function () {
				window.upload.classList.remove("target");
			},

			// Called when drag ended.
			end: function (event) {
				HA.upload.leave();

				html.classList.remove("upload");

				event.preventDefault();
			},

			// Drag event.
			drag: function (event) {
				HA.upload.enter(event);

				event.dataTransfer.dropEffect = "copy";

				event.preventDefault();
				event.stopPropagation();
			},

			// Upload image.
			drop: function (event) {
				var files = event.dataTransfer.files;

				if (files.length > 0 && HA.valid.test(files[0].type)) {
					var reader = new FileReader();

					reader.addEventListener("load", HA.put, false);
					reader.readAsDataURL(files[0]);
				}

				HA.upload.end(event);
			}
		},

		// This creates something new in the database.
		create: function (type, parent) {
			var data = { type: type };

			switch (type) {
				case HA.TYPE.COLLECTION:
				case HA.TYPE.TAG:
				case HA.TYPE.ATTRIBUTE:
					data.key = "handle";
					data.value = "new-{}".format(type);
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
			var overview = window.overview,
				root = window.root,
				tags = window.tags,
				attributes = window.attributes;

			HA.metadata = {
				attributes: data.attributes,
				collections: data.collections,
				tags: data.tags,
				images: data.images
			};

			while (overview.firstChild) { overview.removeChild(overview.firstChild); }
			while (tags.firstChild) { tags.removeChild(tags.firstChild); }
			while (attributes.firstChild) { attributes.removeChild(attributes.firstChild); }

			overview.appendChild(window.nav.render(data.collections));
			tags.appendChild(window.datalist.render(data.tags));
			attributes.appendChild(window.datalist.render(data.attributes));

			HA.block.init(overview);

			if (HB.root === undefined) {
				HB.noCache = true;
				HB.main();

				HB.root.addEventListener("update", HA.update, false);
				HB.root.addEventListener("change", HA.save, false);
			}

			if (data.target !== null) {
				if (data.target === true) {
					window.dispatchEvent(new Event("hashchange"));
					return;
				}

				location.hash = data.target;
			}
		},

		// Save changed data.
		save: function (event) {
			var target = event.detail || event.target,
				data = target.dataset,
				type = data.type,
				id = +data.id,
				key = target.name,
				value = target.value;

			if (key === "" || !target.validity.valid) {
				return;
			}

			switch (type) {
				case HA.TYPE.TAG:
				case HA.TYPE.ATTRIBUTE:
					if (key === "handle" && value === "") {
						return HA.delete(type, id);
					}

					break;

				case HA.TYPE.BLOCK_TAG:
				case HA.TYPE.BLOCK_ATTRIBUTE:
					if (!target.checked) {
						return HA.delete(type, id, value)
					}

					break;
			}

			HA.request.send({
				method: "POST",
				data: {
					type: type,
					id: id,
					key: key,
					value: value
				}
			});
		},

		// Delete.
		delete: function (type, id, value) {
			if (value === undefined && !confirm(HA.strings.delete.format(type))) {
				return;
			}

			if (type === HA.TYPE.IMAGE) {
				type += "/" + {
					jpg: "jpeg",
					png: "png",
					svg: "svg+xml"
				}[id.split(".").pop()];
			}

			HA.request.send({
				method: "DELETE",
				data: {
					type: type,
					id: id,
					value: value
				}
			});
		},

		// File upload.
		put: function (event) {
			var result = event.target.result;

			HA.request.send({
				method: "PUT",
				data: {
					type: result.match(HA.valid)[0],
					value: result.split(",")[1]
				}
			});
		},

		// Error handling...
		error: function (data) {
			html.classList.add("error");
			alert(HA.strings[data.status] || HA.strings.error);
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
			BLOCK: "block",
			TAG: "tag",
			ATTRIBUTE: "attribute",
			BLOCK_TAG: "blockTag",
			BLOCK_ATTRIBUTE: "blockAttribute",
			IMAGE: "image"
		},

		// Strings.
		strings: {
			delete:	"Are you sure you want to delete this {}? This action cannot be undone!",
			error:	"Something went wrong!",
			400:	"Something went seriously wrong!",
			401:	"You are not authorized!",
			500:	"Something went wrong on the server!"
		}
	};

	// Object
	// ------

	// Does `Object` has `needle`?.
	Object.defineProperty(Object.prototype, "has", {
		value: function (needle) {
			for (var handle in this) {
				if (needle.handle === handle && needle.title === this[handle]) {
					return true;
				}
			}

			return false;
		}
	});

	// HB.Request
	// ----------

	// Make `HB.Request` send stuff.
	Object.defineProperty(HB.Request.prototype, "send", {
		value: function (params) {
			html.classList.add("loading");

			this.success = HA.sync;
			this.error = HA.error;

			this.xhr.open(params.method, this.endpoint, true);
			this.xhr.setRequestHeader("Content-Type", "application/json");
			this.xhr.send(JSON.stringify(params.data));
		}
	});
})(this);