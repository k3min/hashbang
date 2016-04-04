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
		version: "0.0.8",

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

			HA.upload.init();

			// Observe changes.
			HA.observer = new MutationObserver(HA.mutation);

			// Confirm unsaved changes.
			window.addEventListener("beforeunload", HA.confirm, false);
		},

		mutation: function () {
			HA.changes = true;
		},

		// Confirm unsaved changes.
		confirm: function () {
			if (HA.changes) {
				return "Changes you made may not be saved!";
			}
		},

		// Hashbang update handler.
		update: function () {
			window.toggle.checked = false;
		},

		// Event handlers related to `block`.
		block: {

			// Cached target.
			target: null,

			// Create event listeners.
			init: function (parent) {
				var collections = parent.getElementsByTagName("dt"),
					blocks = parent.getElementsByTagName("dd");

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
			valid: /image\/(jpeg|png|svg\+xml|gif)/,

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

			HA.changes = false;
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
				key = target.getAttribute("name"),
				value = target.value || target.innerHTML,
				validity = target.validity;

			if (key === "" || (validity !== undefined && !validity.valid)) {
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
						return HA.delete(type, id, value);
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
				return window.dialog.render(HA.message.delete, { type: type, id: id });
			}

			if (type === HA.DATA.IMAGE) {
				type += "/" + {
					jpg: "jpeg",
					png: "png",
					svg: "svg+xml",
					gif: "gif"
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
			window.dialog.render(HA.message[data.status] || HA.message.error);
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
			S: 83,
			ENTER: 13
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

			createLink: {
				title: "Create link",
				placeholder: "http://",
				buttons: [
					{ title: "Cancel" },
					{ title: "OK", action: "createLink" }
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

					message.title = message.title.format(data);
					message.data = data;
				}

				this.replaceChildren(window.message.render(message));

				this.show();
			}},

			// `close` event handler.
			callback: { value: function () {
				var action = this.returnValue;

				if (!action) {
					return;
				}

				var data = this.getElementsByTagName("input").serialize();

				switch (action) {
					case "delete": {
						HA.delete(data.type, data.id);
						break;
					}

					case "reload": {
						location.reload(true);
						break;
					}

					case "createLink": {
						var selection = window.getSelection(),
							value = data.value;

						selection.removeAllRanges();
						selection.addRange(window.toolbar.range);

						if (!value) {
							document.execCommand("unlink", false, null);
						} else {
							document.execCommand("createLink", false, value);
						}

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
							shiftKey = event.shiftKey,
							inputs = this.querySelectorAll("button, input:not([type=hidden])"),
							first = inputs[0],
							last = inputs[inputs.length - 1],
							isBody = (target === document.body);

						if ((target === last || isBody) && !shiftKey) {
							first.focus();
							cancel = true;
						} else if ((target === first || isBody) && shiftKey) {
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

	// HA.Toolbar
	// ----------

	// All things toolbar.
	document.registerElement("ha-toolbar", {
		prototype: Object.create(HTMLElement.prototype, {

			// Create event listeners.
			attachedCallback: { value: function () {
				this.addEventListener("mousedown", this.action, false);
				document.addEventListener("selectionchange", this.show.bind(this), false);
				this.define("action", this.querySelectorAll("[name]").serialize());
			}},

			// Do actions.
			action: { value: function (event) {
				event.preventDefault();

				var action = event.target.name;

				if (action === undefined) {
					return;
				}

				switch (action) {
					case "createLink": {
						var href, range = this.range;

						if (range !== undefined) {
							href = range.commonAncestorContainer.parentElement.href;
						}

						window.dialog.render(HA.message.createLink, { value: href });

						break;
					}

					case "bold":
					case "italic":
					case "underline": {
						document.execCommand(action, false, null);
						break;
					}
				}
			}},

			// Positioner.
			show: { value: function () {
				var selection = window.getSelection(),
					anchor = selection.anchorNode,
					content = window.content;

				if (selection.rangeCount === 0 || content === null) {
					return this.close();
				}

				while (anchor !== null && anchor !== content) {
					anchor = anchor.parentElement;
				}

				if (anchor === null) {
					return this.close();
				}

				this.range = selection.getRangeAt(0);

				var rect = this.range.getBoundingClientRect();

				if (rect.left == 0 || rect.top == 0) {
					return this.close();
				}

				this.style.left = "{}px".format(window.scrollX + rect.left + (rect.width * 0.5));
				this.style.top = "{}px".format(window.scrollY + rect.top);

				this.setAttribute("open", "");
			}},

			// Close.
			close: { value: function() {
				this.removeAttribute("open");
			}}
		})
	});

	// HA.Editor
	// ---------

	// All things editor.
	document.registerElement("ha-editor", {
		prototype: Object.create(HTMLElement.prototype, {

			// Create event listeners.
			attachedCallback: { value: function () {
				HA.observer.observe(this, {
					childList: true,
					characterData: true,
					subtree: true
				});

				this.addEventListener("keydown", this.keys, false);
				this.addEventListener("blur", this.save, false);
			}},

			// Fake ´onchange´.
			save: { value: function () {
				HB.root.dispatchEvent(new CustomEvent("change", {
					detail: this
				}));
			}},

			// Textarea input handler.
			keys: { value: function (event) {
				var cancel = false;

				switch (event.keyCode) {

					// ⌘-S / CTRL-S save.
					case HA.KEY.S: {
						if (event.metaKey || event.ctrlKey) {
							this.save();
							cancel = true;
						}

						break;
					}
				}

				if (cancel) {
					event.preventDefault();
				}
			}}
		})
	});

	// NodeList
	// --------

	// Serializes `NodeList` to object.
	NodeList.prototype.define("serialize", function () {
		var object = {};

		for (var i = 0; i < this.length; i++) {
			var node = this[i],

				name = node.name,
				value = node.value;

			if (name === "") {
				continue;
			}

			object[name] = (value !== undefined) ? value : node;
		}

		return object;
	});

	// Object
	// ------

	// Does `Object` has `needle`?.
	Object.prototype.define("has", function (needle) {
		for (var handle in this) {
			if (needle.handle === handle && needle.title === this[handle]) {
				return true;
			}
		}

		return false;
	});
})(this);