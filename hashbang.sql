CREATE TABLE attributes (
  id tinyint(1) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL,
  title varchar(128) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE tags (
  id tinyint(1) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL,
  title varchar(64) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE collections (
  id tinyint(1) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL,
  title varchar(64) NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'default',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE blocks (
  id tinyint(1) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL,
  title varchar(64) NOT NULL,
  description varchar(128) NOT NULL,
  content text NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'default',
  time datetime NOT NULL,
  hidden enum('true', 'false') NOT NULL default 'false',
  collectionId tinyint(1) unsigned DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE blockAttributes (
  id tinyint(1) unsigned NOT NULL AUTO_INCREMENT,
  blockId tinyint(1) unsigned NOT NULL,
  attributeId tinyint(1) unsigned NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (blockId) REFERENCES blocks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (attributeId) REFERENCES attributes(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE blockTags (
  id tinyint(1) unsigned NOT NULL AUTO_INCREMENT,
  blockId tinyint(1) unsigned NOT NULL,
  tagId tinyint(1) unsigned NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (blockId) REFERENCES blocks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;