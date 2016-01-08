# Hashbang

Hashbang is *CMS* made easy. No need for complex PHP code and no need
for thousands of files. It's just one PHP file, one JavaScript file,
some HTML and a database to store your content.

*The rest is up to you.*

## Installation

1. Create a database
2. Create database tables using the included **hashbang.sql** file
2. Edit [line #2, #3 and #4](https://github.com/k3min/hashbang/blob/master/api.php#L2) of **api.php**
3. (Optional) Edit [line #3](https://github.com/k3min/hashbang/blob/master/.htaccess#L3) of **.htaccess**
4. Upload **index.html**, **js/hashbang.min.js**, **api.php** and **.htaccess** to your webserver
5. ?
6. PROFIT

## Quick explanation

Each *page* is a **collection**, **collections** consist of **blocks**.
Each **block** has its own `handle`, so does each **collection**
(e.g. `http://example.com/blog/hello-world`
will show the **block** with `handle` *hello-world*
inside the corresponding **collection** with `handle` *blog*).

If the **collection** `handle` is not found, or defined,
Hashbang will look at the first `<a href="#!/..."></a>`
it can find, and use that `hash` as `handle`
(in the supplied **index.html**, this would be *#!/blog*).

You can override this behaviour with the first argument of `HB.main()`
(e.g. `HB.main("#!/test")`).

If the **block** `handle` is not found,
Hashbang will go to the `handle` of the parent **collection**.

-

Hashbang will turn every **collection** into a custom element,
rendered from a **template**,
and inserts them into an element with `id` *root*.

You can override this behaviour with the second argument of `HB.main()`
(e.g. `HB.main(null, document.querySelector("section"))`).

Hashbang will find a **template** based on the **collection**/**block** `type`
(**template** element `id` === **collection**/**block** `type`).

A **template** looks something like this:

	<template id="list" data-sort="-time" is="hb-template">
		<h1>{{ collection.title }}</h1>
		<ul>
			{% collection.blocks.forEach(function (block) { %}
			<li>
				<a href="{{ block.url }}">{{ block.title }}</a>
				<time datetime="{{ block.time }}">
					{{ block.time.format("M. j, Y") }}
				</time>
			</li>
			{% }); %}
		</ul>
	</template>

Every **template** element needs an `id` (**collection**/**block** `type`),
and `is="hb-template"`. Optional is `data-sort`,
which specifies in which order the **blocks** are sorted.

- `{% ... %}` for evaluation
- `{{ ... }}` for interpolation

-

**Collection** properties are:
- `id`: the ID of the **collection**, e.g. `12`
- `title`: the title, e.g. `Blog`
- `description`: a description, e.g. `My awesome blog`
- `blocks`: *array* of **blocks**

**Block** properties are:
- `id`: the ID of the **block**, e.g. `8`
- `title`: the title, e.g. `Hello World!`
- `description`: a description, e.g. `First blog post`
- `content`: **block** content, either HTML, or just text
- `time`: `Date` instance with **block** time.
- `tags`: *object* of **block** tags
- `attributes`: *object* of **block** attributes
- `url`: e.g. `#!/blog/hello-world`

-

When Hashbang is requesting data,
the **body** element will get a class named `.loading`.
If a **collection** or **block** is shown,
the **body** will get a class with the current `.handle` and `.type`.
Hashbang will also search for a `<a href="#!/..."></a>`
which represents the current **collection**, and give it an `.active` class.

-

It's also possible to run Hashbang without the PHP and database
if you just store the generated JSON files on your server, and
change `HB.endpoint` to something like *data/:handle.json*.

## Support

- Chrome 8+
- Safari 5.1+
- Firefox 8+
- Opera 12+
- Internet Explorer 10+

## Todo

- Documentation
- Use of `history` API
- Paging
- ...