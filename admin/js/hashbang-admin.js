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
		version: "0.0.7",

		// REST API endpoint.
		endpoint: "api/",

		// Call this to fire up Hashbang Admin.
		main: function () {

			HA.dialog = window.dialog;

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
				content.addEventListener("keydown", HA.textarea, false);
			}

			window.toggle.checked = false;
		},

		// Textarea input handler.
		textarea: function (event) {
			var cancel = false;

			switch (event.keyCode) {

				// ⌘-S / CTRL-S save.
				case HA.KEY.S: {
					if (!(event.metaKey || event.ctrlKey)) {
						break;
					}

					var change = new CustomEvent("change", {
						detail: this
					});

					HB.root.dispatchEvent(change);

					cancel = true;

					break;
				}

				// Handle tab.
				case HA.KEY.TAB: {
					var a = this.selectionStart,
						b = this.selectionEnd,
						t = this.value;

					this.value = t.slice(0, a) + "\t" + t.slice(b);
					this.selectionStart = this.selectionEnd = a + 1;

					cancel = true;

					break;
				}
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
			enter: function (event) {
				if (HA.block.target !== null) {
					event.dataTransfer.dropEffect = "move";

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
				}
			},

			// Change parent (`collectionId`) of `block`.
			drop: function (event) {
				if (HA.block.target === null) {
					return;
				}

				HA.request.send({
					method: "POST",
					success: HA.sync,
					error: HA.error,
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

			// Valid MIME types.
			valid: /image\/(jpeg|png|svg\+xml)/,

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

				if (target !== window.upload) {
					event.dataTransfer.dropEffect = "none";
				} else {
					event.dataTransfer.dropEffect = "copy";
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

				event.preventDefault();
				event.stopPropagation();
			},

			// Upload image.
			drop: function (event) {
				HA.upload.parse(event.dataTransfer.files);
				HA.upload.end(event);
			},

			// Parse files.
			parse: function (files) {
				if (files.length == 0 || !HA.upload.valid.test(files[0].type)) {
					return;
				}

				var reader = new FileReader();

				reader.addEventListener("load", HA.put, false);
				reader.readAsDataURL(files[0]);
			}
		},

		// This creates something new in the database.
		create: function (type, parent) {
			var data = { type: type };

			switch (type) {
				case HA.DATA.COLLECTION:
				case HA.DATA.TAG:
				case HA.DATA.ATTRIBUTE: {
					data.key = "handle";
					data.value = "new-{}".format(type);
					break;
				}

				case HA.DATA.BLOCK: {
					data.key = "collectionId";
					data.value = parent;
					break;
				}
			}

			HA.request.send({
				method: "POST",
				success: HA.sync,
				error: HA.error,
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

			overview.replaceChildren(window.nav.render(data.collections));
			tags.replaceChildren(window.datalist.render(data.tags));
			attributes.replaceChildren(window.datalist.render(data.attributes));

			HA.block.init(overview);

			if (HB.root === undefined) {
				HB.noCache = true;
				HB.main();

				HB.root.addEventListener("update", HA.update, false);
				HB.root.addEventListener("change", HA.save, false);
				HB.root.addEventListener("submit", HA.prevent, false);
			}

			if (data.target !== null) {
				if (data.target === true) {
					window.dispatchEvent(new Event("hashchange"));
					return;
				}

				location.hash = data.target;
			}
		},

		// Prevent default.
		prevent: function (event) {
			event.preventDefault();
			event.stopPropagation();
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
				case HA.DATA.TAG:
				case HA.DATA.ATTRIBUTE: {
					if (key === "handle" && value === "") {
						return HA.delete(type, id, -1);
					}

					break;
				}

				case HA.DATA.BLOCK_TAG:
				case HA.DATA.BLOCK_ATTRIBUTE: {
					if (!target.checked) {
						return HA.delete(type, id, value)
					}

					break;
				}

				case HA.DATA.IMAGE:
					HA.upload.parse(target.files);
					break;
			}

			HA.request.send({
				method: "POST",
				success: HA.sync,
				error: HA.error,
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
			if (value === -1) {
				return HA.dialog.render(HA.message.delete, { type: type, id: id });
			}

			if (type === HA.DATA.IMAGE) {
				type += "/" + {
					jpg: "jpeg",
					png: "png",
					svg: "svg+xml"
				}[id.split(".").pop()];
			}

			HA.request.send({
				method: "DELETE",
				success: HA.sync,
				error: HA.error,
				data: {
					type: type,
					id: id,
					value: value
				}
			});
		},

		// File upload.
		put: function (event) {
			var result = this.result;

			HA.request.send({
				method: "PUT",
				success: HA.sync,
				error: HA.error,
				data: {
					type: result.match(HA.upload.valid)[0],
					value: result.split(",")[1]
				}
			});
		},

		// Error handling...
		error: function (data) {
			html.classList.add("error");
			HA.dialog.render(HA.message[data.status] || HA.message.error);
		},

		// Logout.
		logout: function () {
			HA.request.error = null;

			HA.request.xhr.open("HEAD", ":protocol//logout@:host:port:pathname".format(location) + HA.endpoint);
			HA.request.xhr.send();

			location.reload(true);
		},

		// Data types.
		DATA: {
			COLLECTION: "collection",
			BLOCK: "block",
			TAG: "tag",
			ATTRIBUTE: "attribute",
			BLOCK_TAG: "blockTag",
			BLOCK_ATTRIBUTE: "blockAttribute",
			IMAGE: "image"
		},

		// Key codes.
		KEY: {
			TAB: 9,
			ESC: 27,
			S: 83
		},

		// Messages.
		message: {

			delete: {
				title: "Are you sure you want to delete this :type?",
				description: "This action cannot be undone!",
				buttons: [
					{ title: "Cancel" },
					{ title: "OK", action: "delete" }
				]
			},

			error: {
				title: "Something went wrong!",
				description: "Please try again.",
				buttons: [
					{ title: "Reload", action: "reload" },
					{ title: "OK" }
				]
			},

			400: {
				title: "Something went seriously wrong!"
			},

			401: {
				title: "You are not authorized!"
			},

			500: {
				title: "Something went wrong on the server!"
			}
		}
	};

	// HA.Dialog
	// ---------

	// All things dialog.
	document.registerElement("ha-dialog", {
		prototype: Object.create(HTMLDialogElement.prototype, {

			// Create event listeners.
			attachedCallback: { value: function () {
				this.addEventListener("close", this.callback, false);
				window.addEventListener("keydown", this.keys.bind(this), false);
			}},

			// `show` wrapper.
			render: { value: function (message, data) {
				message = Object.create(message);

				var buttons = message.buttons;

				if (buttons !== undefined) {
					if (data === undefined) {
						data = {};
					}

					for (var i in buttons) {
						var action = buttons[i].action;

						if (action !== undefined) {
							data.action = action;
							break;
						}
					}

					message.title = message.title.format(data);
					message.data = JSON.stringify(data).replace(/"/g, "\\'");
				}

				this.replaceChildren(window.message.render(message));

				this.show();
			}},

			// `close` event handler.
			callback: { value: function () {
				var data = this.returnValue.replace(/\'/g, "\"");

				if (data === "") {
					return;
				}

				data = JSON.parse(data);

				if (data.action === undefined) {
					return;
				}

				switch (data.action) {
					case "delete": {
						HA.delete(data.type, data.id);
						break;
					}

					case "reload": {
						location.reload(true);
						break;
					}
				}
			}},

			// Input handler.
			keys: { value: function (event) {
				var cancel = false;

				if (!this.open) {
					return;
				}

				switch (event.keyCode) {

					// Esc to close dialog.
					case HA.KEY.ESC: {
						this.close();
						cancel = true;

						break;
					}

					// Keep focus in dialog.
					case HA.KEY.TAB: {
						var target = event.target,
							shift = event.shiftKey,
							buttons = this.querySelectorAll("button"),
							first = buttons[0],
							last = buttons[buttons.length - 1],
							body = (target === document.body);

						if ((target === last || body) && !shift) {
							first.focus();
							cancel = true;
						} else if ((target === first || body) && shift) {
							last.focus();
							cancel = true;
						}

						break;
					}
				}

				if (cancel) {
					event.preventDefault();
				}
			}}
		}),

		// *Base* element.
		extends: "dialog"
	});

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
})(this);