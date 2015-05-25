CREATE TABLE attributes (
  id tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL,
  title varchar(128) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE tags (
  id tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL,
  title varchar(64) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE collections (
  id tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL DEFAULT 'new',
  title varchar(64) NOT NULL DEFAULT 'New Collection',
  description varchar(128) NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'default',
  PRIMARY KEY (id),
  UNIQUE (handle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE blocks (
  id tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL DEFAULT 'new',
  title varchar(64) NOT NULL DEFAULT 'New Block',
  description varchar(128) NOT NULL,
  content text NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'default',
  time datetime NOT NULL,
  collectionId tinyint(3) unsigned DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE (handle),
  FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE blockAttributes (
  id tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  blockId tinyint(3) unsigned NOT NULL,
  attributeId tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (blockId) REFERENCES blocks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (attributeId) REFERENCES attributes(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE blockTags (
  id tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  blockId tinyint(3) unsigned NOT NULL,
  tagId tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (blockId) REFERENCES blocks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO collections VALUES
  (1, 'blog', 'Blog', 'My awesome blog', 'list'),
  (2, 'projects', 'Projects', '', 'list'),
  (3, 'contact', 'Contact', '', 'default');

INSERT INTO blocks VALUES (1, 'hello-world', 'Hello World!', 'First blog post', '<p>Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.</p>', 'default', '2012-12-12 12:12:12', 1);