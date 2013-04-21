CREATE TABLE blocks (
  id tinyint(1) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL,
  title varchar(64) NOT NULL,
  description varchar(128) NOT NULL,
  content text NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'default',
  attributes text NOT NULL,
  collectionId tinyint(1) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE collections (
  id tinyint(1) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL,
  title varchar(64) NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'default',
  showTitle enum('true', 'false') NOT NULL default 'true',
  PRIMARY KEY (id)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;